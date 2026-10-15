import { describe, it, expect } from "bun:test";
import { formatChatId, dispatchWhatsAppTouch } from "./waha";

describe("Outbound WhatsApp Engine", () => {
  it("formats international phone numbers to standard WhatsApp chat ID", () => {
    expect(formatChatId("+1 (555) 234-5678")).toBe("15552345678@c.us");
    expect(formatChatId("44 7911 123456")).toBe("447911123456@c.us");
  });

  it("blocks WhatsApp messages that violate ASD-STE100 sentence rules", async () => {
    const receipt = await dispatchWhatsAppTouch({
      phone: "+15550199",
      text: "We are reaching out to leverage our seamless partnership to revolutionize your business today with an extremely long sentence that exceeds the maximum limit.",
      dryRun: true
    });

    expect(receipt.status).toBe("rejected_linter");
    expect(receipt.error).toBeDefined();
    expect(receipt.ste100Compliant).toBe(false);
  });

  it("dispatches clean ASD-STE100 WhatsApp message with anti-ban jitter", async () => {
    const receipt = await dispatchWhatsAppTouch({
      phone: "+15550199",
      text: "We saw your recent clinic opening. We built a free local audit. Do you want the link?",
      dryRun: true,
      simulateJitter: true
    });

    expect(receipt.status).toBe("dry_run_success");
    expect(receipt.chatId).toBe("15550199@c.us");
    expect(receipt.ste100Compliant).toBe(true);
    expect(receipt.jitterMs).toBeGreaterThan(0);
  });
});
