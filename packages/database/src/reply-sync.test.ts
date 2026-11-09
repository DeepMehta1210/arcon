import { describe, expect, test } from "bun:test";
import { syncInboundRepliesToPostgres } from "./reply-sync";
import type { InboundEmailMessage } from "@arcon/outbound-email";

describe("PostgreSQL Inbound Reply Synchronization", () => {
  test("processes inbound reply list and matches against contacts", async () => {
    const mockMessages: InboundEmailMessage[] = [
      {
        id: "msg-1",
        messageId: "<inbound-1@example.com>",
        fromAddress: "test-unmatched@unknowncompany.com",
        toAddress: "deep@3dices.com",
        subject: "Re: client servers",
        date: new Date(),
        rawText: "Not interested thanks.",
        cleanReplyBody: "Not interested thanks.",
        intent: "dnc"
      }
    ];

    const result = await syncInboundRepliesToPostgres(mockMessages);
    expect(result.totalProcessed).toBe(1);
    expect(result.intents.dnc).toBe(1);
  });
});
