import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { randomUUID } from "node:crypto";

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface InboundEmailMessage {
  id: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  fromAddress: string;
  fromName?: string;
  toAddress: string;
  subject: string;
  date: Date;
  rawText: string;
  cleanReplyBody: string;
  intent: "interested" | "objection" | "referral" | "dnc" | "question";
}

/**
 * Strips quoted thread history (e.g. "On Mon, Nov 8, Deep Mehta wrote:", "> ...")
 * to extract ONLY the prospect's newly composed message.
 */
export function stripQuotedReply(text: string): string {
  if (!text) return "";

  const lines = text.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Stop at email quote markers
    if (/^on\s+.+wrote:?$/i.test(trimmed)) break;
    if (/^-{3,}\s*original message\s*-{3,}/i.test(trimmed)) break;
    if (/^from:\s*.*@.*/i.test(trimmed)) break;
    if (trimmed.startsWith(">")) continue; // Strip inline quoted text

    cleanLines.push(line);
  }

  return cleanLines.join("\n").trim();
}

/**
 * Analyzes the sentiment and intent of an inbound prospect email reply.
 */
export function classifyReplyIntent(text: string): InboundEmailMessage["intent"] {
  const lower = text.toLowerCase();

  // 1. Unsubscribe / DNC
  if (
    /\b(unsubscribe|remove\s*(me|us)?|take\s*(me|us)?\s*off|stop\s*emailing|not\s*interested|no\s*thanks|don't\s*contact|do\s*not\s*contact)\b/i.test(
      lower
    )
  ) {
    return "dnc";
  }

  // 2. Referral / Hand-off
  if (
    /\b(reach\s*out\s*to|contact\s*our|speak\s*with|forward(ing|ed|s)?(\s+\w+)?\s*to|cc('d|ing)?|talk\s*to\s*(our|my)?)\b/i.test(
      lower
    )
  ) {
    return "referral";
  }

  // 3. Positive / Buying Interest
  if (
    /\b(yes|sounds\s*good|send\s*(it|over|the)|interested|sure|share\s*the|love\s*to\s*see|worth\s*looking|let's\s*discuss|would\s*be\s*great|open\s*to|tell\s*me\s*more|happy\s*to\s*review)\b/i.test(
      lower
    )
  ) {
    return "interested";
  }

  // 4. Questions / Discovery
  if (
    /\b(how\s*much|pricing|cost|how\s*does\s*(this|it)\s*work|rates?|case\s*stud(y|ies)|where\s*are\s*you\s*based|what\s*kind\s*of)\b/i.test(
      lower
    ) ||
    lower.includes("?")
  ) {
    return "question";
  }

  // 5. Objection / Bad Timing
  if (
    /\b(in-house|internal\s*team|no\s*budget|not\s*right\s*now|too\s*busy|we\s*don't\s*use\s*aws|already\s*have|not\s*a\s*fit)\b/i.test(
      lower
    )
  ) {
    return "objection";
  }

  return "question";
}

/**
 * Connects to Zoho Mail IMAP server and retrieves recent inbound replies.
 */
export async function fetchInboundReplies(
  customConfig?: Partial<ImapConfig>,
  options: { maxMessages?: number; searchSinceDate?: Date } = {}
): Promise<{ success: boolean; messages: InboundEmailMessage[]; error?: string }> {
  const config: ImapConfig = {
    host: customConfig?.host || process.env.IMAP_HOST || "imap.zoho.in",
    port: customConfig?.port || parseInt(process.env.IMAP_PORT || "993", 10),
    secure: customConfig?.secure ?? true,
    user: customConfig?.user || process.env.SMTP_USER || "deep@3dices.com",
    pass: customConfig?.pass || process.env.SMTP_PASS || ""
  };

  if (!config.pass) {
    return {
      success: false,
      messages: [],
      error: "Missing IMAP credentials (SMTP_PASS / Zoho App Password required)."
    };
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    logger: false
  });

  const parsedMessages: InboundEmailMessage[] = [];

  try {
    await client.connect();

    // Open INBOX in read-only mode so flags aren't accidentally modified
    await client.mailboxOpen("INBOX", { readOnly: true });

    const maxCount = options.maxMessages || 30;
    const sinceDate = options.searchSinceDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Past 7 days

    // Search query for recent messages
    const searchQuery = { since: sinceDate };

    // Fetch messages in reverse chronological order
    const messages = client.fetch(searchQuery, {
      uid: true,
      envelope: true,
      source: true
    });

    for await (const msg of messages) {
      if (!msg.source) continue;

      try {
        const parsed = await simpleParser(msg.source);
        const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() || "";
        const fromName = parsed.from?.value?.[0]?.name || "";
        const toAddress = parsed.to
          ? Array.isArray(parsed.to)
            ? parsed.to[0]?.value?.[0]?.address || ""
            : parsed.to.value?.[0]?.address || ""
          : "";

        // Skip self-sent emails
        if (fromAddress === config.user.toLowerCase()) continue;

        const rawText = parsed.text || "";
        const cleanReplyBody = stripQuotedReply(rawText);
        const intent = classifyReplyIntent(cleanReplyBody || rawText);

        const inReplyTo = parsed.inReplyTo || undefined;
        const references = Array.isArray(parsed.references)
          ? parsed.references
          : parsed.references
          ? [parsed.references]
          : undefined;

        parsedMessages.push({
          id: randomUUID(),
          messageId: parsed.messageId || `inbound-${msg.uid}`,
          inReplyTo,
          references,
          fromAddress,
          fromName,
          toAddress,
          subject: parsed.subject || "Re: Outreach",
          date: parsed.date || new Date(),
          rawText,
          cleanReplyBody,
          intent
        });

        if (parsedMessages.length >= maxCount) break;
      } catch {
        // Continue parsing next message
      }
    }

    await client.logout();

    return {
      success: true,
      messages: parsedMessages
    };
  } catch (err) {
    try {
      await client.logout();
    } catch {}
    return {
      success: false,
      messages: [],
      error: (err as Error).message
    };
  }
}
