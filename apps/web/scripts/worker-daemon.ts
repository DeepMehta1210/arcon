import { LeadStore } from "@arcon/database";
import { enrichAndPersonalizeLead, cleanCompanyName, isGenericEmail, isValidEmail } from "@arcon/agent-core";

console.log("[WorkerDaemon] Autonomous lead enrichment engine started.");

async function runCycle() {
  try {
    const store = LeadStore.getInstance();
    store.reloadFromDisk();
    const allLeads = store.getAllLeads();

    // Select pending sourced leads that have websites or candidate emails
    const batch = allLeads
      .filter((l) => l.stage === "sourced" && !(l.signalData as any)?.draftEmail)
      .slice(0, 5);

    if (batch.length === 0) {
      console.log("[WorkerDaemon] No pending sourced leads. Sleeping...");
      return;
    }

    console.log(`[WorkerDaemon] Processing batch of ${batch.length} leads...`);

    for (const lead of batch) {
      try {
        console.log(`[WorkerDaemon] Enriching: ${lead.companyName} (${lead.websiteUrl || "no website"})...`);
        const enriched = await enrichAndPersonalizeLead({
          id: lead.id,
          companyName: lead.companyName,
          contactName: lead.contactName,
          headline: lead.headline,
          websiteUrl: lead.websiteUrl,
          emailCandidates: lead.emailCandidates,
          location: lead.location
        });

        const isReadyForSales =
          (enriched.verificationStatus === "socket_valid" || enriched.verificationStatus === "catch_all") &&
          enriched.isPersonalDecisionMaker &&
          Boolean(enriched.targetEmail);

        const nextStage = isReadyForSales ? "researched" : "sourced";

        store.updateLead(lead.id, {
          companyName: enriched.companyName || cleanCompanyName(lead.companyName),
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

        console.log(`[WorkerDaemon] Completed: ${enriched.companyName} -> Stage: ${nextStage} (Target: ${enriched.targetEmail || "none"})`);
      } catch (err) {
        console.error(`[WorkerDaemon] Error on lead ${lead.id}:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.error("[WorkerDaemon] Cycle error:", err);
  }
}

// Initial cycle on startup
setTimeout(runCycle, 3000);

// Run continuous loop every 60 seconds
setInterval(runCycle, 60000);
