import { describe, it, expect } from "bun:test";
import { dispatchColdEmail } from "./mailer";

describe("Outbound Email Worker", () => {
  it("blocks outreach messages containing slop words or long sentences", async () => {
    const receipt = await dispatchColdEmail({
      toEmail: "prospect@example.com",
      subject: "Synergy partnership proposal",
      body: "We want to leverage our seamless revolutionary synergy to delve into your tech stack.",
      dryRun: true
    });

    expect(receipt.status).toBe("rejected_linter");
    expect(receipt.error).toBeDefined();
    expect(receipt.error).toContain("linter");
  });

  it("dispatches clean ASD-STE100 outreach and returns delivery receipt", async () => {
    const receipt = await dispatchColdEmail({
      toEmail: "founder@example.com",
      subject: "Question about cloud latency",
      body: "We noticed your recent product launch. We built a free diagnostic report. Do you want the link?",
      dryRun: true
    });

    expect(receipt.status).toBe("dry_run_success");
    expect(receipt.receiptId).toBeDefined();
    expect(receipt.messageId).toContain("@");
    expect(receipt.ste100Compliant).toBe(true);
  });
});
