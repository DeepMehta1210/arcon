import { describe, it, expect } from "bun:test";
import { evaluate5FactorRubric } from "./rubric";
import { runResearchSwarm } from "./swarm";
import { ProspectDossierSchema } from "@arcon/shared-types";

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
    expect(typeof dossier.recommendedOutreach.lintReport.ste100Compliant).toBe("boolean");
    expect(dossier.recommendedOutreach.lintReport.passed).toBe(true);
  });

  it("crafts 3 Dices AI & Amazon Bedrock outreach for AI leads", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "Cognitive AI Labs",
      domain: "cognitive.ai",
      brandDescription: "Building autonomous AI agents and enterprise LLM workflows",
      detectedTech: ["React", "FastAPI", "OpenAI", "LangChain"],
      decisionMakerName: "Elena Rostova",
      decisionMakerRole: "Chief Technology Officer",
      latencyMs: 180,
      dmarcPolicy: "reject"
    });

    expect(email.subject).toContain("private AI & agent architecture");
    expect(email.body).toContain("Amazon Bedrock");
    expect(email.body).toContain("Elena");
    expect(email.body).toContain("3 Dices Technology");
    expect(email.body).toContain("AWS Certified Solutions Architect");
  });

  it("crafts 3 Dices FinOps & AWS Architecture review for slow latency leads", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "CloudScale Commerce",
      domain: "scalecommerce.io",
      brandDescription: "High-volume e-commerce infrastructure",
      detectedTech: ["Next.js", "PostgreSQL", "AWS"],
      decisionMakerName: "Marcus Vance",
      decisionMakerRole: "VP of Engineering",
      latencyMs: 920,
      dmarcPolicy: "reject"
    });

    expect(email.subject).toContain("server response latency");
    expect(email.body).toContain("920ms");
    expect(email.body).toContain("complimentary 30-Minute AWS Architecture & Cost Review");
    expect(email.body).toContain("~40%");
  });

  it("crafts 3 Dices Security & DMARC hardening for vulnerable domains", () => {
    const { generateProperOutreachEmail } = require("./researcher");
    const email = generateProperOutreachEmail({
      companyName: "Apex FinTech",
      domain: "apexfin.co",
      brandDescription: "Modern corporate card and payments platform",
      detectedTech: ["React", "Go"],
      decisionMakerName: "Sarah Chen",
      decisionMakerRole: "Head of Infrastructure",
      latencyMs: 210,
      dmarcPolicy: "none"
    });

    expect(email.subject).toContain("email security setup");
    expect(email.body).toContain("monitoring-only (p=none)");
    expect(email.body).toContain("SOC 2");
    expect(email.body).toContain("Security Specialist");
  });
});
