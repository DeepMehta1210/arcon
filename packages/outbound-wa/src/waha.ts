import { lintOutreachCopy } from "@growth-os/copy-linter";
import { randomUUID } from "node:crypto";

export interface WahaConfig {
  baseUrl: string;
  session: string;
  apiKey?: string;
}

export interface WADispatchInput {
  phone: string;
  text: string;
  wahaConfig?: WahaConfig;
  enforceSte100?: boolean;
  dryRun?: boolean;
  simulateJitter?: boolean;
}

export interface WADeliveryReceipt {
  receiptId: string;
  timestamp: string;
  recipientPhone: string;
  chatId: string;
  status: "sent" | "dry_run_success" | "rejected_linter" | "failed";
  messageId: string;
  ste100Compliant: boolean;
  jitterMs: number;
  error?: string;
}

export function formatChatId(phone: string): string {
  // Strip non-digits and append @c.us for WhatsApp user chat ID
  const cleaned = phone.replace(/[^\d]/g, "");
  return `${cleaned}@c.us`;
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchWhatsAppTouch(input: WADispatchInput): Promise<WADeliveryReceipt> {
  const receiptId = randomUUID();
  const now = new Date().toISOString();
  const chatId = formatChatId(input.phone);

  // 1. Pre-send Quality Gate: Enforce ASD-STE100 and clean copy
  const lintResult = lintOutreachCopy(input.text, {
    enforceSte100: input.enforceSte100 ?? true,
    maxWordsPerSentence: 20
  });

  if (!lintResult.passed) {
    return {
      receiptId,
      timestamp: now,
      recipientPhone: input.phone,
      chatId,
      status: "rejected_linter",
      messageId: `rejected-${receiptId}`,
      ste100Compliant: lintResult.ste100.compliant,
      jitterMs: 0,
      error: `WhatsApp copy rejected: ${lintResult.failureReasons.join(" ")}`
    };
  }

  // 2. Anti-ban humanized jitter (typing simulation delay)
  const jitterMs = input.simulateJitter ? Math.floor(Math.random() * 200) + 50 : 0;
  if (jitterMs > 0) {
    await delay(jitterMs);
  }

  // 3. Dry-run or fallback mode when WAHA is not connected
  if (input.dryRun || !input.wahaConfig) {
    return {
      receiptId,
      timestamp: now,
      recipientPhone: input.phone,
      chatId,
      status: "dry_run_success",
      messageId: `waha_mock_${receiptId}`,
      ste100Compliant: true,
      jitterMs
    };
  }

  // 4. Send request to WAHA HTTP API
  try {
    const url = `${input.wahaConfig.baseUrl}/api/sendText`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.wahaConfig.apiKey ? { "X-Api-Key": input.wahaConfig.apiKey } : {})
      },
      body: JSON.stringify({
        session: input.wahaConfig.session,
        chatId,
        text: input.text
      })
    });

    if (!res.ok) {
      throw new Error(`WAHA HTTP error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json() as { id?: string };

    return {
      receiptId,
      timestamp: now,
      recipientPhone: input.phone,
      chatId,
      status: "sent",
      messageId: data.id || `waha_${receiptId}`,
      ste100Compliant: true,
      jitterMs
    };
  } catch (err) {
    return {
      receiptId,
      timestamp: now,
      recipientPhone: input.phone,
      chatId,
      status: "failed",
      messageId: `failed_${receiptId}`,
      ste100Compliant: true,
      jitterMs,
      error: (err as Error).message
    };
  }
}
