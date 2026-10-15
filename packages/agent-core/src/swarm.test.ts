import { describe, it, expect } from "bun:test";
import { evaluate5FactorRubric } from "./rubric";
import { runResearchSwarm } from "./swarm";
import { ProspectDossierSchema } from "@growth-os/shared-types";

describe("Research Swarm and 5-Factor Rubric", () => {
  it("qualifies leads scoring 70% or higher", () => {
    const highFit = evaluate5FactorRubric({
      painStrength: 80,
      icpFit: 85,
      timing: 75,
      reachability: 90,
      evidence: 80
    });
    expect(highFit.passed).toBe(true);
    expect(highFit.overallScore).toBeGreaterThanOrEqual(70);
    expect(highFit.rejectionReason).toBeUndefined();
  });

  it("rejects leads with low pain signal", () => {
    const lowPain = evaluate5FactorRubric({
      painStrength: 30,
      icpFit: 50,
      timing: 40,
      reachability: 50,
      evidence: 40
    });
    expect(lowPain.passed).toBe(false);
    expect(lowPain.overallScore).toBeLessThan(70);
    expect(lowPain.rejectionReason).toContain("pain");
  });

  it("generates a valid ProspectDossier conforming to schema", async () => {
    const dossier = await runResearchSwarm({
      domain: "example.com",
      companyName: "Example Corp",
      contactName: "Jordan Smith"
    });

    // Validate with Zod ProspectDossierSchema
    const parseResult = ProspectDossierSchema.safeParse(dossier);
    expect(parseResult.success).toBe(true);

    expect(dossier.company.domain).toBe("example.com");
    expect(dossier.decisionMaker.fullName).toBe("Jordan Smith");
    expect(dossier.recommendedOutreach.lintReport.ste100Compliant).toBe(true);
    expect(dossier.recommendedOutreach.lintReport.passed).toBe(true);
  });
});
