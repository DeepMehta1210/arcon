import { z } from "zod";

export const ProspectDossierSchema = z.object({
  prospectId: z.string().uuid(),
  researchedAt: z.string().datetime(),
  researchDurationMs: z.number().int().nonnegative(),

  company: z.object({
    name: z.string().min(1),
    domain: z.string(),
    description: z.string(),
    stage: z.enum(["bootstrapped", "seed", "series_a", "series_b", "enterprise"]),
    techStack: z.array(z.string()),
    recentEvents: z.array(
      z.object({
        type: z.enum(["funding", "hiring", "product_launch", "conference"]),
        date: z.string(),
        summary: z.string(),
        sourceUrl: z.string().url()
      })
    )
  }),

  decisionMaker: z.object({
    fullName: z.string().min(1),
    role: z.string(),
    email: z.string().email(),
    emailVerification: z.object({
      status: z.enum(["valid", "catch_all", "unverified"]),
      method: z.enum(["direct_smtp_socket", "api_fallback"]),
      mxHost: z.string()
    }),
    linkedInUrl: z.string().url().optional(),
    githubUsername: z.string().optional(),
    publicFootprintSummary: z.string()
  }),

  qualification: z.object({
    overallScore: z.number().min(0).max(100),
    painStrengthScore: z.number().min(0).max(100),
    fitScore: z.number().min(0).max(100),
    timingScore: z.number().min(0).max(100),
    reachabilityScore: z.number().min(0).max(100),
    verbatimPainQuotes: z.array(z.string()),
    rejectionReason: z.string().optional()
  }),

  recommendedOutreach: z.object({
    selectedPlay: z.string(),
    targetChannel: z.enum(["email", "whatsapp", "linkedin", "direct_mail"]),
    tailoredSubject: z.string(),
    tailoredBody: z.string(),
    lintReport: z.object({
      zeroWidthStripped: z.number().int().nonnegative(),
      slopScore: z.number().min(0).max(1),
      burstinessScore: z.number().min(0),
      ste100Compliant: z.boolean(),
      passed: z.boolean()
    })
  })
});

export type ProspectDossier = z.infer<typeof ProspectDossierSchema>;
