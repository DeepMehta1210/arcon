import { NextResponse } from "next/server";
import { LeadStore } from "@arcon/database";
import { enrichAndPersonalizeLead } from "@arcon/agent-core";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    const store = LeadStore.getInstance();
    const allLeads = store.getAllLeads();

    // Select leads that are in 'sourced' stage or unresearched
    const leadsToProcess = allLeads
      .filter((l) => l.stage === "sourced" || (l.stage === "verified" && !(l.signalData as any)?.draftEmail))
      .slice(0, limit);

    if (leadsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unprocessed leads pending in queue.",
        processedCount: 0,
        results: []
      });
    }

    const results = [];

    for (const lead of leadsToProcess) {
      try {
        const enriched = await enrichAndPersonalizeLead({
          id: lead.id,
          companyName: lead.companyName,
          contactName: lead.contactName,
          headline: lead.headline,
          websiteUrl: lead.websiteUrl,
          emailCandidates: lead.emailCandidates,
          location: lead.location
        });

        // Only advance to 'researched' (Ready for Sales Review) if a personal Decision Maker email is verified
        const isReadyForSales =
          (enriched.verificationStatus === "socket_valid" || enriched.verificationStatus === "catch_all") &&
          enriched.isPersonalDecisionMaker &&
          Boolean(enriched.targetEmail);

        const nextStage = isReadyForSales ? "researched" : "sourced";

        store.updateLead(lead.id, {
          stage: nextStage,
          score: enriched.score,
          contactName: enriched.contactName || lead.contactName,
          verificationStatus: enriched.verificationStatus,
          notes: enriched.draftBody,
          signalData: {
            ...(lead.signalData || {}),
            dossier: enriched.dossier,
            draftEmail: {
              subject: enriched.draftSubject,
              body: enriched.draftBody,
              angle: enriched.suggestedAngle,
              targetEmail: enriched.targetEmail,
              generatedAt: new Date().toISOString()
            }
          }
        });

        results.push({
          leadId: lead.id,
          companyName: lead.companyName,
          verificationStatus: enriched.verificationStatus,
          stage: nextStage,
          isReadyForSales,
          draftSubject: enriched.draftSubject
        });
      } catch (err) {
        console.error(`Failed to enrich lead ${lead.id}:`, err);
        results.push({
          leadId: lead.id,
          companyName: lead.companyName,
          error: (err as Error).message
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      readyForSalesCount: results.filter((r) => r.isReadyForSales).length,
      results,
      stats: store.getStats()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
