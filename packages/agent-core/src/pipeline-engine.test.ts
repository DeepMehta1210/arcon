import { describe, it, expect } from "bun:test";
import { enrichAndPersonalizeLead, isGenericEmail } from "./pipeline-engine";

describe("Pipeline Engine & Continuous Lead Enrichment", () => {
  it("strictly filters out generic shared inboxes from decision maker emails", () => {
    expect(isGenericEmail("sales@target.com")).toBe(true);
    expect(isGenericEmail("info@target.com")).toBe(true);
    expect(isGenericEmail("support@target.com")).toBe(true);
    expect(isGenericEmail("billing@target.com")).toBe(true);
    expect(isGenericEmail("careers@target.com")).toBe(true);

    expect(isGenericEmail("alex@target.com")).toBe(false);
    expect(isGenericEmail("sarah.connor@target.com")).toBe(false);
    expect(isGenericEmail("deep@3dices.com")).toBe(false);
  });

  it("enriches, validates and drafts high-converting outreach for a lead with personal contact", async () => {
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
    expect(result.targetEmail).toBe("alex@acmecloud.io");
    expect(result.isPersonalDecisionMaker).toBe(true);
    expect(result.draftSubject).toBeDefined();
    expect(result.draftSubject.length).toBeGreaterThan(5);
    expect(result.draftBody).toContain("Alex");
    expect(result.score).toBeGreaterThan(0);
    expect(result.dossier).toBeDefined();
  });

  it("identifies leads having only generic sales@ email as not personal decision maker", async () => {
    const result = await enrichAndPersonalizeLead({
      id: "test-lead-generic",
      companyName: "Generic Corp",
      emailCandidates: ["sales@genericcorp.com", "info@genericcorp.com"]
    });

    expect(result.companyName).toBe("Generic Corp");
    // Should NOT send to sales@genericcorp.com
    expect(result.targetEmail).not.toBe("sales@genericcorp.com");
  });
});
