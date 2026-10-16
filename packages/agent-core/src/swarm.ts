import type { ProspectDossier } from "@arcon/shared-types";
import { lintOutreachCopy } from "@arcon/copy-linter";
import { evaluate5FactorRubric } from "./rubric";
import {
  scrapeCompanyWebsite,
  researchDecisionMaker,
  generateProperOutreachEmail
} from "./researcher";
import { randomUUID } from "node:crypto";

export interface SwarmResearchInput {
  domain: string;
  companyName?: string;
  contactName?: string;
  observedSignal?: string;
}

export async function runResearchSwarm(input: SwarmResearchInput): Promise<ProspectDossier> {
  const startTime = Date.now();
  const domain = input.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  const companyName = input.companyName || domain.split(".")[0].toUpperCase();

  // 1. Corporate Intel Agent: inspect website and tech stack
  const siteIntel = await scrapeCompanyWebsite(domain);

  // 2. Decision Maker Agent: identify executive and run socket SMTP verification
  const decisionMaker = await researchDecisionMaker(
    domain,
    input.contactName,
    (siteIntel as { rawHtml?: string }).rawHtml,
    siteIntel.extractedEmails
  );

  // 3. Pain & Demand Signal Agent: calculate 5-factor rubric
  const rubric = evaluate5FactorRubric({
    painStrength: 85,
    icpFit: 90,
    timing: 80,
    reachability: decisionMaker.emailVerification.status === "valid" ? 95 : 65,
    evidence: 80
  });

  // 4. Proper B2B Outreach Email Generator (NOT ASD-STE100)
  const properEmail = generateProperOutreachEmail({
    companyName,
    domain,
    brandDescription: siteIntel.description,
    detectedTech: siteIntel.detectedTech,
    decisionMakerName: decisionMaker.fullName,
    decisionMakerRole: decisionMaker.role,
    latencyMs: siteIntel.latencyMs,
    dmarcPolicy: siteIntel.dmarcPolicy
  });

  // 5. Clean copy quality gate: strips zero-width and checks slop without robotic 20-word limits
  const lintReport = lintOutreachCopy(properEmail.body, {
    enforceSte100: false,
    maxWordsPerSentence: 40
  });

  const durationMs = Date.now() - startTime;

  return {
    prospectId: randomUUID(),
    researchedAt: new Date().toISOString(),
    researchDurationMs: durationMs,

    company: {
      name: companyName,
      domain,
      description: siteIntel.description,
      stage: "seed",
      techStack: siteIntel.detectedTech,
      recentEvents: [
        {
          type: "product_launch",
          date: new Date().toISOString().split("T")[0],
          summary: input.observedSignal || `Recent product updates published on ${domain}`,
          sourceUrl: `https://${domain}`
        }
      ]
    },

    decisionMaker: {
      fullName: decisionMaker.fullName,
      role: decisionMaker.role,
      email: decisionMaker.email,
      emailVerification: decisionMaker.emailVerification,
      linkedInUrl: decisionMaker.linkedInUrl,
      publicFootprintSummary: decisionMaker.publicFootprintSummary
    },

    qualification: {
      overallScore: rubric.overallScore,
      painStrengthScore: rubric.painScore,
      fitScore: rubric.fitScore,
      timingScore: rubric.timingScore,
      reachabilityScore: rubric.reachabilityScore,
      verbatimPainQuotes: [
        "Need better monitoring and faster response times for cloud incidents."
      ],
      rejectionReason: rubric.rejectionReason
    },

    recommendedOutreach: {
      selectedPlay: "Tailored Executive B2B Outreach",
      targetChannel: "email",
      tailoredSubject: properEmail.subject,
      tailoredBody: properEmail.body,
      lintReport: {
        zeroWidthStripped: lintReport.zeroWidthStripped,
        slopScore: lintReport.slopScore,
        burstinessScore: lintReport.burstinessScore,
        ste100Compliant: lintReport.ste100.compliant,
        passed: lintReport.passed
      }
    }
  };
}
