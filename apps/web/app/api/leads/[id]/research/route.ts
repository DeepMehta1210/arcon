import { NextResponse } from "next/server";
import { LeadStore } from "@growth-os/database";
import { runResearchSwarm } from "@growth-os/agent-core";

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

    const domain = lead.websiteUrl
      ? new URL(lead.websiteUrl).hostname.replace(/^www\./, "")
      : `${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

    const dossier = await runResearchSwarm({
      domain,
      companyName: lead.companyName,
      contactName: lead.contactName,
      observedSignal: lead.headline
    });

    const updated = store.updateLead(id, {
      score: Math.round(dossier.rubricScore.totalScore * 100),
      stage: dossier.rubricScore.pass ? "researched" : lead.stage,
      notes: dossier.suggestedAngle
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
