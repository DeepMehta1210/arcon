import { NextResponse } from "next/server";
import { LeadStore } from "@arcon/database";
import { runResearchSwarm } from "@arcon/agent-core";
import { generateCommercialProposal } from "@arcon/doc-generator";

export async function POST(
  request: Request,
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

    const proposal = generateCommercialProposal(dossier, {
      serviceOffering: "Cloud & Software Architecture Optimization",
      monthlyFeeUsd: 5000,
      deliveryWeeks: 4
    });

    return NextResponse.json({
      success: true,
      proposal
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
