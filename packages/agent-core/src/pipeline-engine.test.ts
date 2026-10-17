import { describe, it, expect } from "bun:test";
import { enrichAndPersonalizeLead } from "./pipeline-engine";

describe("Pipeline Engine & Continuous Lead Enrichment", () => {
  it("enriches, validates and drafts high-converting outreach for a lead", async () => {
    const result = await enrichAndPersonalizeLead({
      id: "test-lead-1",
      companyName: "Acme Cloud",
      contactName: "Alex Rivera",
      headline: "Migrating backend services to Kubernetes and AWS",
      websiteUrl: "https://acmecloud.io",
      emailCandidates: ["alex@acmecloud.io"]
    });

    expect(result.leadId).toBe("test-lead-1");
    expect(result.companyName).toBe("Acme Cloud");
    expect(result.draftSubject).toBeDefined();
    expect(result.draftSubject.length).toBeGreaterThan(5);
    expect(result.draftBody).toBeDefined();
    expect(result.draftBody.length).toBeGreaterThan(20);
    expect(result.score).toBeGreaterThan(0);
    expect(result.dossier).toBeDefined();
  });

  it("handles leads without explicit websites by synthesizing domain", async () => {
    const result = await enrichAndPersonalizeLead({
      id: "test-lead-2",
      companyName: "Example",
      emailCandidates: ["contact@example.com"]
    });

    expect(result.companyName).toBe("Example");
    expect(result.draftSubject).toBeDefined();
    expect(result.draftBody).toBeDefined();
  });
});
