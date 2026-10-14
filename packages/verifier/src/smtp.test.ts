import { describe, it, expect } from "bun:test";
import { resolveMxRecords, verifyEmail } from "./smtp";

describe("SMTP Verifier", () => {
  it("rejects invalid email formats without network calls", async () => {
    const result = await verifyEmail("not-an-email");
    expect(result.exists).toBe(false);
    expect(result.details).toBe("Invalid email address format");
  });

  it("identifies domains with no MX records", async () => {
    const result = await verifyEmail("test@nonexistent-domain-xyz-12345.com");
    expect(result.exists).toBe(false);
    expect(result.mxHost).toBeNull();
  });

  it("resolves valid MX records for standard domains", async () => {
    const mxList = await resolveMxRecords("google.com");
    expect(mxList.length).toBeGreaterThan(0);
    expect(mxList[0]).toContain("google.com");
  });
});
