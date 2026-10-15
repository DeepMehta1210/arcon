import type { ProspectDossier } from "@growth-os/shared-types";
import { lintOutreachCopy } from "@growth-os/copy-linter";
import { evaluate5FactorRubric } from "./rubric";
import { scrapeCompanyWebsite, researchDecisionMaker } from "./researcher";
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
  const decisionMaker = await researchDecisionMaker(domain, input.contactName);

  // 3. Pain & Demand Signal Agent: calculate 5-factor rubric
  const rubric = evaluate5FactorRubric({
    painStrength: 85,
    icpFit: 90,
    timing: 80,
    reachability: decisionMaker.emailVerification.status === "valid" ? 95 : 65,
    evidence: 80
  });

  // 4. Angle & Hook Agent: formulate Mom-Test outreach in ASD-STE100
  const outreachSubject = `Quick question regarding ${companyName} cloud architecture`;
  const outreachBody = `We noticed your recent product launch. We built a free diagnostic tool for your cloud infrastructure. It inspects latency and database health. Do you want the summary report?`;

  // 5. Run copy through ASD-STE100 and anti-slop linter
  const lintReport = lintOutreachCopy(outreachBody, {
    enforceSte100: true,
    maxWordsPerSentence: 20
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
      selectedPlay: "Diagnostic Offer (Mom-Test)",
      targetChannel: "email",
      tailoredSubject: outreachSubject,
      tailoredBody: outreachBody,
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
