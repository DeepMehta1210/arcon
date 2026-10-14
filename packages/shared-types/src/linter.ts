import { z } from "zod";

export const STE100SentenceViolationSchema = z.object({
  sentence: z.string(),
  wordCount: z.number().int(),
  maxAllowed: z.number().int(),
  reason: z.string()
});

export const STE100CheckResultSchema = z.object({
  compliant: z.boolean(),
  sentenceCount: z.number().int(),
  maxWordCountObserved: z.number().int(),
  averageWordCount: z.number(),
  violations: z.array(STE100SentenceViolationSchema)
});

export type STE100CheckResult = z.infer<typeof STE100CheckResultSchema>;

export const LintResultSchema = z.object({
  cleanText: z.string(),
  zeroWidthStripped: z.number().int().nonnegative(),
  slopWordsFound: z.array(z.string()),
  slopScore: z.number().min(0).max(1),
  burstinessScore: z.number().min(0),
  ste100: STE100CheckResultSchema,
  passed: z.boolean(),
  failureReasons: z.array(z.string())
});

export type LintResult = z.infer<typeof LintResultSchema>;
