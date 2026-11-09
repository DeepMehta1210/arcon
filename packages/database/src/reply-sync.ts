import { db } from "./client";
import { contacts, companies, conversations, messages, outreachTouches } from "./schema";
import { eq, or, desc } from "drizzle-orm";
import { LeadStore } from "./lead-store";
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

export interface ReplySyncResult {
  totalProcessed: number;
  matchedContacts: number;
  repliesSynced: number;
  intents: Record<string, number>;
  matchedDetails: Array<{
    contactName: string;
    contactEmail: string;
    companyName: string;
    intent: string;
    snippet: string;
    receivedAt: string;
  }>;
}

/**
 * Synchronizes incoming email replies from prospects into PostgreSQL.
 * Automatically creates/updates conversation threads, records inbound messages,
 * and advances the contact's pipeline stage from 'contacted' to 'replied'.
 */
export async function syncInboundRepliesToPostgres(
  inboundMessages: InboundEmailMessage[]
): Promise<ReplySyncResult> {
  let matchedContacts = 0;
  let repliesSynced = 0;
  const intents: Record<string, number> = {
    interested: 0,
    referral: 0,
    question: 0,
    objection: 0,
    dnc: 0
  };
  const matchedDetails: ReplySyncResult["matchedDetails"] = [];

  const store = LeadStore.getInstance();

  for (const msg of inboundMessages) {
    const cleanFrom = msg.fromAddress.toLowerCase().trim();
    if (!cleanFrom) continue;

    intents[msg.intent] = (intents[msg.intent] || 0) + 1;

    // 1. Try finding matching contact in PostgreSQL (graceful if DB offline in CI)
    let contact: any = null;
    try {
      const matchedContactRows = await db
        .select({
          contactId: contacts.id,
          fullName: contacts.fullName,
          email: contacts.email,
          pipelineStage: contacts.pipelineStage,
          customAttributes: contacts.customAttributes,
          companyId: contacts.companyId,
          companyName: companies.name
        })
        .from(contacts)
        .leftJoin(companies, eq(contacts.companyId, companies.id))
        .where(eq(contacts.email, cleanFrom))
        .limit(1);

      contact = matchedContactRows[0];

      // If not found directly by from email, try matching by In-Reply-To in outreach_touches
      if (!contact && msg.inReplyTo) {
        const touchRows = await db
          .select({
            contactId: outreachTouches.contactId
          })
          .from(outreachTouches)
          .where(eq(outreachTouches.metadata, { messageId: msg.inReplyTo } as any))
          .limit(1);

        if (touchRows[0]?.contactId) {
          const found = await db
            .select({
              contactId: contacts.id,
              fullName: contacts.fullName,
              email: contacts.email,
              pipelineStage: contacts.pipelineStage,
              customAttributes: contacts.customAttributes,
              companyId: contacts.companyId,
              companyName: companies.name
            })
            .from(contacts)
            .leftJoin(companies, eq(contacts.companyId, companies.id))
            .where(eq(contacts.id, touchRows[0].contactId))
            .limit(1);

          contact = found[0];
        }
      }
    } catch {
      // PostgreSQL is offline (e.g. running in CI environment)
    }

    // 2. Fallback / supplementary matching against LeadStore
    const allStoreLeads = store.getAllLeads();
    const storeLead = allStoreLeads.find(
      (l) =>
        l.emailCandidates?.some((e) => e.toLowerCase() === cleanFrom) ||
        (contact && l.contactName?.toLowerCase() === contact.fullName?.toLowerCase())
    );

    // If still not matched, this message is not from a tracked outreach prospect
    if (!contact && !storeLead) continue;

    matchedContacts++;
    const content = msg.cleanReplyBody || msg.rawText;
    const contactName = contact?.fullName || storeLead?.contactName || "Contact";
    const contactEmail = contact?.email || cleanFrom;
    const companyName = contact?.companyName || storeLead?.companyName || "Company";

    // 3. Persist to PostgreSQL if connected
    try {
      if (contact) {
        const existingConversations = await db
          .select()
          .from(conversations)
          .where(eq(conversations.contactId, contact.contactId))
          .limit(1);

        let conversationId = existingConversations[0]?.id;

        if (!conversationId) {
          const [newConv] = await db
            .insert(conversations)
            .values({
              contactId: contact.contactId,
              channel: "email",
              externalThreadId: msg.messageId,
              status: "active",
              lastMessageAt: msg.date
            })
            .returning({ id: conversations.id });

          conversationId = newConv?.id;
        } else {
          await db
            .update(conversations)
            .set({
              lastMessageAt: msg.date,
              status: "active"
            })
            .where(eq(conversations.id, conversationId));
        }

        if (conversationId) {
          await db
            .insert(messages)
            .values({
              conversationId,
              senderType: "lead",
              content,
              intentClassification: msg.intent,
              createdAt: msg.date
            })
            .onConflictDoNothing();

          const updatedAttributes = {
            ...(typeof contact.customAttributes === "object" && contact.customAttributes !== null
              ? contact.customAttributes
              : {}),
            lastReply: {
              fromAddress: msg.fromAddress,
              subject: msg.subject,
              snippet: content.slice(0, 200),
              intent: msg.intent,
              receivedAt: msg.date.toISOString(),
              messageId: msg.messageId
            }
          };

          await db
            .update(contacts)
            .set({
              pipelineStage: "replied",
              customAttributes: updatedAttributes,
              updatedAt: new Date()
            })
            .where(eq(contacts.id, contact.contactId));
        }
      }
    } catch {
      // PostgreSQL write skipped if offline
    }

    // 4. Update LeadStore for dashboard visibility (works both online & offline)
    if (storeLead) {
      store.updateLead(storeLead.id, {
        stage: "replied",
        notes: `[REPLY - ${msg.intent.toUpperCase()}]: ${content.slice(0, 160)}`,
        signalData: {
          ...(storeLead.signalData || {}),
          lastReply: {
            fromAddress: msg.fromAddress,
            subject: msg.subject,
            snippet: content.slice(0, 200),
            intent: msg.intent,
            receivedAt: msg.date.toISOString(),
            messageId: msg.messageId
          }
        }
      });
      repliesSynced++;
    } else if (contact) {
      repliesSynced++;
    }

    matchedDetails.push({
      contactName,
      contactEmail,
      companyName,
      intent: msg.intent,
      snippet: content.slice(0, 120),
      receivedAt: msg.date.toISOString()
    });
  }

  return {
    totalProcessed: inboundMessages.length,
    matchedContacts,
    repliesSynced,
    intents,
    matchedDetails
  };
}

/**
 * Returns all active conversation threads and their latest inbound messages.
 */
export async function getInboundConversationsSummary(): Promise<Array<{
  conversationId: string;
  contactName: string;
  contactEmail: string;
  companyName: string;
  lastMessageAt: Date;
  status: string;
  intent: string;
  latestSnippet: string;
}>> {
  const threads = await db
    .select({
      conversationId: conversations.id,
      contactName: contacts.fullName,
      contactEmail: contacts.email,
      companyName: companies.name,
      lastMessageAt: conversations.lastMessageAt,
      status: conversations.status,
      customAttributes: contacts.customAttributes
    })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(50);

  return threads.map((t) => {
    const lastReply = (t.customAttributes as any)?.lastReply;
    return {
      conversationId: t.conversationId,
      contactName: t.contactName,
      contactEmail: t.contactEmail,
      companyName: t.companyName || "Company",
      lastMessageAt: t.lastMessageAt,
      status: t.status,
      intent: lastReply?.intent || "interested",
      latestSnippet: lastReply?.snippet || "New message received"
    };
  });
}
