import { describe, it, expect } from "bun:test";
import { generateCommercialProposal } from "./proposal";
import type { ProspectDossier } from "@arcon/shared-types";

describe("Commercial Proposal Generator", () => {
  const mockDossier: ProspectDossier = {
    prospectId: "550e8400-e29b-41d4-a716-446655440000",
    researchedAt: new Date().toISOString(),
    researchDurationMs: 450,
    company: {
      name: "Acme Cloud",
      domain: "acme.com",
      description: "Cloud infrastructure platform",
      stage: "series_a",
      techStack: ["AWS", "Docker", "Go"],
      recentEvents: []
    },
    decisionMaker: {
      fullName: "Sarah Connor",
      role: "VP of Engineering",
      email: "sarah@acme.com",
      emailVerification: {
        status: "valid",
        method: "direct_smtp_socket",
        mxHost: "mail.acme.com"
      },
      publicFootprintSummary: "Leader"
    },
    qualification: {
      overallScore: 88,
      painStrengthScore: 85,
      fitScore: 90,
      timingScore: 80,
      reachabilityScore: 95,
      verbatimPainQuotes: ["Scaling database performance under high read load."]
    },
    recommendedOutreach: {
      selectedPlay: "Diagnostic",
      targetChannel: "email",
      tailoredSubject: "Test",
      tailoredBody: "Test",
      lintReport: {
        zeroWidthStripped: 0,
        slopScore: 0,
        burstinessScore: 1.0,
        ste100Compliant: true,
        passed: true
      }
    }
  };

  it("generates a structured commercial proposal in ASD-STE100", () => {
    const proposal = generateCommercialProposal(mockDossier, {
      serviceOffering: "DevOps & Cloud Latency Optimization",
      monthlyFeeUsd: 5000,
      deliveryWeeks: 4
    });

    expect(proposal.targetCompany).toBe("Acme Cloud");
    expect(proposal.targetDecisionMaker).toBe("Sarah Connor");
    expect(proposal.technicalDeliverables.length).toBeGreaterThanOrEqual(4);
    expect(proposal.markdownDocument).toContain("Commercial Proposal & Statement of Work");
    expect(proposal.ste100Compliant).toBe(true);
  });
});
