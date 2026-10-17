import { LeadStore } from "@arcon/database";
import { enrichAndPersonalizeLead, cleanCompanyName } from "@arcon/agent-core";

export interface WorkerStatus {
  isActive: boolean;
  intervalSeconds: number;
  lastRunAt: string | null;
  totalCycles: number;
  totalLeadsEnriched: number;
  totalLeadsVerifiedForSales: number;
  currentActivity: string;
}

class AutonomousLeadWorker {
  private static instance: AutonomousLeadWorker;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private intervalSeconds = 90; // Runs every 90 seconds
  private status: WorkerStatus = {
    isActive: false,
    intervalSeconds: 90,
    lastRunAt: null,
    totalCycles: 0,
    totalLeadsEnriched: 0,
    totalLeadsVerifiedForSales: 0,
    currentActivity: "Idle"
  };

  private constructor() {}

  public static getInstance(): AutonomousLeadWorker {
    if (!AutonomousLeadWorker.instance) {
      AutonomousLeadWorker.instance = new AutonomousLeadWorker();
    }
    return AutonomousLeadWorker.instance;
  }

  public getStatus(): WorkerStatus {
    return { ...this.status };
  }

  public start() {
    if (this.status.isActive) return;
    this.status.isActive = true;
    this.status.currentActivity = "Scheduled (Auto-running every 90s)";
    console.log(`[AutonomousWorker] Started autonomous continuous lead research worker (${this.intervalSeconds}s interval)`);

    // Initial delayed run 5s after startup
    setTimeout(() => {
      this.runCycle().catch((e) => console.error("[AutonomousWorker] Cycle error:", e));
    }, 5000);

    // Recurring continuous timer
    this.timer = setInterval(() => {
      this.runCycle().catch((e) => console.error("[AutonomousWorker] Cycle error:", e));
    }, this.intervalSeconds * 1000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.status.isActive = false;
    this.status.currentActivity = "Stopped";
    console.log("[AutonomousWorker] Worker stopped");
  }

  public async runCycle(): Promise<{ processed: number; readyForSales: number }> {
    if (this.isProcessing) {
      return { processed: 0, readyForSales: 0 };
    }

    this.isProcessing = true;
    this.status.currentActivity = "Processing batch of leads...";
    let processed = 0;
    let readyForSales = 0;

    try {
      const store = LeadStore.getInstance();
      const allLeads = store.getAllLeads();

      // Find pending sourced leads that need research
      const batch = allLeads
        .filter((l) => l.stage === "sourced" && !(l.signalData as any)?.draftEmail)
        .slice(0, 5); // Polite batch of 5 to avoid SMTP rate limits

      if (batch.length === 0) {
        this.status.currentActivity = "Idle (All sourced leads currently processed)";
        this.status.lastRunAt = new Date().toISOString();
        return { processed: 0, readyForSales: 0 };
      }

      console.log(`[AutonomousWorker] Continuous cycle processing ${batch.length} leads...`);

      for (const lead of batch) {
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

          // Must be personal decision maker (no generic inboxes)
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

          processed++;
          if (isReadyForSales) readyForSales++;
        } catch (err) {
          console.warn(`[AutonomousWorker] Error processing lead ${lead.id}:`, err);
        }
      }

      this.status.totalCycles++;
      this.status.totalLeadsEnriched += processed;
      this.status.totalLeadsVerifiedForSales += readyForSales;
      this.status.lastRunAt = new Date().toISOString();
      this.status.currentActivity = `Idle (Last cycle: ${processed} enriched, ${readyForSales} qualified for sales)`;
    } catch (err) {
      this.status.currentActivity = `Error: ${(err as Error).message}`;
    } finally {
      this.isProcessing = false;
    }

    return { processed, readyForSales };
  }
}

export function getAutonomousWorker() {
  return AutonomousLeadWorker.getInstance();
}

export function startAutonomousWorker() {
  const worker = AutonomousLeadWorker.getInstance();
  worker.start();
  return worker;
}
