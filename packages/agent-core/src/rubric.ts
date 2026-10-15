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
