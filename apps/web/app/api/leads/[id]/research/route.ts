import { NextResponse } from "next/server";
import { LeadStore } from "@arcon/database";
import { runResearchSwarm } from "@arcon/agent-core";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = LeadStore.getInstance();
    const lead = store.getLeadById(id);

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

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

    const dossier = await runResearchSwarm({
      domain,
      companyName: lead.companyName,
      contactName: lead.contactName,
      observedSignal: lead.headline
    });

    const updated = store.updateLead(id, {
      score: dossier.qualification.overallScore,
      stage: dossier.qualification.overallScore >= 70 ? "researched" : lead.stage,
      contactName: dossier.decisionMaker.fullName || lead.contactName,
      emailCandidates: [
        dossier.decisionMaker.email,
        ...lead.emailCandidates.filter((e) => e.toLowerCase() !== dossier.decisionMaker.email.toLowerCase())
      ],
      verificationStatus: dossier.decisionMaker.emailVerification.status === "valid" ? "socket_valid" : (lead.verificationStatus || "unverified"),
      notes: dossier.recommendedOutreach.tailoredBody,
      signalData: {
        ...(lead.signalData || {}),
        dossier,
        decisionMaker: dossier.decisionMaker,
        properEmail: dossier.recommendedOutreach
      }
    });

    return NextResponse.json({
      success: true,
      dossier,
      lead: updated
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
