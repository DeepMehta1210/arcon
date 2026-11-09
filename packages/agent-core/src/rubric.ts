export interface RubricInput {
  painStrength: number; // 0 to 100
  icpFit: number;       // 0 to 100
  timing: number;       // 0 to 100
  reachability: number; // 0 to 100
  evidence: number;     // 0 to 100
}

export interface RubricEvaluation {
  overallScore: number;
  painScore: number;
  fitScore: number;
  timingScore: number;
  reachabilityScore: number;
  evidenceScore: number;
  passed: boolean;
  rejectionReason?: string;
}

import { NEGATIVE_INDUSTRY_REGEX } from "./qualification-gate";
export { NEGATIVE_INDUSTRY_REGEX };

export interface DynamicScoringParams {
  companyName: string;
  description: string;
  detectedTech: string[];
  featuredProjects?: string[];
  agencyPhilosophy?: string;
  latencyMs: number;
  dmarcPolicy: string;
  hasPersonalDecisionMaker: boolean;
  socketVerified: boolean;
  rawHtml?: string;
}

/**
 * Calculates a strict, dynamic 0-100 ICP qualification score based on verifiable signals.
 * Minimum threshold to qualify for cold outreach is 75/100.
 */
export function calculateDynamicIcpScore(params: {
  textCorpus: string;
  detectedTech: string[];
  featuredProjects?: string[];
  agencyPhilosophy?: string;
  latencyMs: number;
  dmarcPolicy: string;
  hasPersonalDecisionMaker: boolean;
  socketVerified: boolean;
}): { score: number; passed: boolean; rejectionReason?: string; breakdown: Record<string, number> } {
  const {
    textCorpus,
    detectedTech,
    featuredProjects = [],
    agencyPhilosophy,
    latencyMs,
    dmarcPolicy,
    hasPersonalDecisionMaker,
    socketVerified
  } = params;

  // 1. Negative Industry Immediate Disqualification
  if (NEGATIVE_INDUSTRY_REGEX.test(textCorpus)) {
    return {
      score: 20,
      passed: false,
      rejectionReason: "Negative industry match: Business is print, signage, hardware repair, or non-digital trade.",
      breakdown: { icp: 0, caseStudies: 0, diagnostic: 0, reachability: 20 }
    };
  }

  // 2. Strict Human Decision Maker Requirement
  if (!hasPersonalDecisionMaker) {
    return {
      score: 35,
      passed: false,
      rejectionReason: "No verified personal founder or executive identified (generic inbox only).",
      breakdown: { icp: 20, caseStudies: 5, diagnostic: 10, reachability: 0 }
    };
  }

  // 3. ICP Capabilities & Tech Stack (0 to 35 points)
  let icpScore = 10;
  const isAgency = /\b(agency|studios?|web\s*design|digital\s*agency|creative\s*agency|development\s*agency|dev\s*shop|interactive)\b/i.test(
    textCorpus
  );
  if (isAgency) icpScore += 10;

  const modernTechCount = detectedTech.filter((t) =>
    ["React", "Next.js", "TypeScript", "Node.js", "WordPress", "Shopify", "AWS", "Python", "Docker"].includes(t)
  ).length;
  icpScore += Math.min(modernTechCount * 5, 15);

  // 4. Case Studies & Stated Philosophy Proof (0 to 25 points)
  let proofScore = 0;
  if (featuredProjects.length > 0) proofScore += 15;
  if (agencyPhilosophy) proofScore += 10;

  // 5. Verifiable Infrastructure Diagnostic Signals (0 to 20 points)
  let diagnosticScore = 0;
  if (latencyMs > 600) diagnosticScore += 10; // Measurable site speed optimization angle
  if (dmarcPolicy === "none" || dmarcPolicy === "missing") diagnosticScore += 10; // Security advisory angle

  // 6. Reachability & Direct Socket Verification (0 to 20 points)
  let reachabilityScore = 0;
  if (socketVerified) reachabilityScore += 20;
  else if (hasPersonalDecisionMaker) reachabilityScore += 10;

  const totalScore = Math.min(icpScore + proofScore + diagnosticScore + reachabilityScore, 100);
  const passed = totalScore >= 75 && hasPersonalDecisionMaker;

  let rejectionReason: string | undefined;
  if (!passed) {
    if (totalScore < 75) {
      rejectionReason = `Total score (${totalScore}/100) below strict quality threshold of 75.`;
    }
  }

  return {
    score: totalScore,
    passed,
    rejectionReason,
    breakdown: {
      icp: icpScore,
      caseStudies: proofScore,
      diagnostic: diagnosticScore,
      reachability: reachabilityScore
    }
  };
}

export function evaluate5FactorRubric(input: RubricInput): RubricEvaluation {
  // Weights: Pain 25%, Fit 25%, Timing 20%, Reachability 15%, Evidence 15%
  const painWeighted = input.painStrength * 0.25;
  const fitWeighted = input.icpFit * 0.25;
  const timingWeighted = input.timing * 0.2;
  const reachWeighted = input.reachability * 0.15;
  const evidenceWeighted = input.evidence * 0.15;

  const total = Math.round(
    painWeighted + fitWeighted + timingWeighted + reachWeighted + evidenceWeighted
  );

  const passed = total >= 70;
  let rejectionReason: string | undefined;

  if (!passed) {
    if (input.painStrength < 50) {
      rejectionReason = "Insufficient customer pain signal observed.";
    } else if (input.icpFit < 50) {
      rejectionReason = "Low target company ICP alignment.";
    } else if (input.reachability < 40) {
      rejectionReason = "No reliable verified contact route found.";
    } else {
      rejectionReason = `Total qualification score (${total}) is below the required 70% threshold.`;
    }
  }

  return {
    overallScore: total,
    painScore: input.painStrength,
    fitScore: input.icpFit,
    timingScore: input.timing,
    reachabilityScore: input.reachability,
    evidenceScore: input.evidence,
    passed,
    rejectionReason
  };
}
