import { verifyEmail } from "@arcon/verifier";
import { runResearchSwarm } from "./swarm";
import type { ProspectDossier } from "@arcon/shared-types";

export interface PipelineLeadInput {
  id: string;
  companyName: string;
  contactName?: string;
  headline?: string;
  websiteUrl?: string;
  emailCandidates: string[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface EnrichedPipelineResult {
  leadId: string;
  companyName: string;
  isValidated: boolean;
  verificationStatus: "socket_valid" | "socket_invalid" | "catch_all";
  targetEmail?: string;
  contactName?: string;
  score: number;
  draftSubject: string;
  draftBody: string;
  suggestedAngle: string;
  detectedTech?: string[];
  dossier: ProspectDossier;
}

/**
 * Executes zero-cost email verification, deep tech/cloud research,
 * and high-converting personalized email crafting for a lead.
 */
export async function enrichAndPersonalizeLead(
  lead: PipelineLeadInput
): Promise<EnrichedPipelineResult> {
  const primaryEmail = lead.emailCandidates[0];

  let isVerified = false;
  let verificationStatus: "socket_valid" | "socket_invalid" | "catch_all" = "socket_invalid";

  if (primaryEmail) {
    try {
      const vResult = await verifyEmail(primaryEmail);
      if (vResult.exists) {
        isVerified = true;
        verificationStatus = "socket_valid";
      } else if (vResult.isCatchAll) {
        verificationStatus = "catch_all";
        isVerified = true;
      } else {
        verificationStatus = "socket_invalid";
      }
    } catch {
      // Fallback: If verification is uncertain, tag as catch_all rather than dropping
      verificationStatus = "catch_all";
    }
  }

  // Derive domain from website or company name
  let domain = "target.com";
  if (lead.websiteUrl) {
    try {
      const withProtocol = lead.websiteUrl.startsWith("http")
        ? lead.websiteUrl
        : `https://${lead.websiteUrl}`;
      domain = new URL(withProtocol).hostname.replace(/^www\./, "");
    } catch {
      domain = `${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    }
  } else {
    domain = `${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  }

  // Run the multi-agent research swarm
  const dossier = await runResearchSwarm({
    domain,
    companyName: lead.companyName,
    contactName: lead.contactName,
    observedSignal: lead.headline
  });

  const finalContact = dossier.decisionMaker.fullName || lead.contactName;
  const finalEmail =
    (isVerified && primaryEmail) ||
    dossier.decisionMaker.email ||
    primaryEmail ||
    `contact@${domain}`;

  const subject =
    dossier.recommendedOutreach?.tailoredSubject ||
    `Question regarding ${lead.companyName}'s cloud infrastructure`;

  const body =
    dossier.recommendedOutreach?.tailoredBody ||
    `Hi ${finalContact || "there"},\n\nI noticed ${lead.companyName} is actively scaling and wanted to share a few actionable optimization ideas for your cloud infrastructure.\n\nBest regards,\nDeep Mehta`;

  return {
    leadId: lead.id,
    companyName: lead.companyName,
    isValidated: isVerified,
    verificationStatus,
    targetEmail: finalEmail,
    contactName: finalContact,
    score: dossier.qualification.overallScore,
    draftSubject: subject,
    draftBody: body,
    suggestedAngle: dossier.recommendedOutreach?.selectedPlay || "AWS Architecture Review",
    detectedTech: dossier.company.techStack,
    dossier
  };
}
