import { LeadStore } from "@arcon/database";
import {
  enrichAndPersonalizeLead,
  cleanCompanyName,
  isGenericEmail,
  isValidEmail,
  isLikelyPersonName
} from "@arcon/agent-core";
import {
  searchYCCompanies,
  fetchShowHNSignals,
  scrapeLocalPlaces
} from "@arcon/scrapers";
import type { RawLead } from "@arcon/shared-types";

console.log("[WorkerDaemon] Autonomous 24/7 Worldwide Growth & Sourcing OS started.");

interface SourcingTarget {
  name: string;
  type: "places" | "yc" | "show_hn";
  city?: string;
  keyword?: string;
  batch?: string;
  country: string;
}

const WORLDWIDE_TARGETS: SourcingTarget[] = [
  // North America Boutique Web & Digital Agencies
  { name: "New York Digital Agencies", type: "places", city: "New York", keyword: "Digital Agency", country: "United States" },
  { name: "Austin Creative Studios", type: "places", city: "Austin", keyword: "Web Development Agency", country: "United States" },
  { name: "San Francisco Web Studios", type: "places", city: "San Francisco", keyword: "Web Design Studio", country: "United States" },
  { name: "Toronto Digital Hub", type: "places", city: "Toronto", keyword: "Digital Agency", country: "Canada" },

  // United Kingdom & Europe Creative Hubs
  { name: "London Creative Sector", type: "places", city: "London", keyword: "Web Design Agency", country: "United Kingdom" },
  { name: "Berlin Digital Agencies", type: "places", city: "Berlin", keyword: "Web Development Agency", country: "Germany" },
  { name: "Amsterdam Creative Corridor", type: "places", city: "Amsterdam", keyword: "Digital Agency", country: "Netherlands" },
  { name: "Dublin Digital Hub", type: "places", city: "Dublin", keyword: "Web Design Agency", country: "Ireland" },

  // Asia-Pacific & Middle East
  { name: "Sydney Creative Hub", type: "places", city: "Sydney", keyword: "Web Design Agency", country: "Australia" },
  { name: "Singapore Digital Studios", type: "places", city: "Singapore", keyword: "Web Design Agency", country: "Singapore" },
  { name: "Dubai Creative District", type: "places", city: "Dubai", keyword: "Digital Marketing Agency", country: "United Arab Emirates" },
  { name: "Mumbai Creative Agencies", type: "places", city: "Mumbai", keyword: "Web Design Agency", country: "India" },
  { name: "Bangalore Web Studios", type: "places", city: "Bangalore", keyword: "Web Development Agency", country: "India" },

  // Global High-Growth Tech Accelerators & Launch Signals
  { name: "Y Combinator W24 DevTools", type: "yc", batch: "W24", keyword: "Developer", country: "Global" },
  { name: "Y Combinator S24 B2B Platforms", type: "yc", batch: "S24", keyword: "Platform", country: "Global" }
];

let currentTargetIndex = 0;

/**
 * Autonomously scrapes and injects fresh high-fit B2B leads from global tech hubs.
 */
async function runWorldwideSourcingCycle() {
  try {
    const store = LeadStore.getInstance();
    store.reloadFromDisk();

    const target = WORLDWIDE_TARGETS[currentTargetIndex % WORLDWIDE_TARGETS.length];
    currentTargetIndex = (currentTargetIndex + 1) % WORLDWIDE_TARGETS.length;

    console.log(`[WorkerDaemon:AutoSource] Mining worldwide leads from ${target.name} (${target.country})...`);

    let freshLeads: RawLead[] = [];

    if (target.type === "places" && target.city) {
      freshLeads = await scrapeLocalPlaces({
        city: target.city,
        keyword: target.keyword || "Software Development",
        limit: 15
      });
    } else if (target.type === "yc") {
      freshLeads = await searchYCCompanies({
        batch: target.batch || "W24",
        query: target.keyword,
        limit: 15
      });
    } else if (target.type === "show_hn") {
      const result = await fetchShowHNSignals({
        query: target.keyword || "Show HN",
        limit: 15
      });
      freshLeads = result.leads;
    }

    // Clean company names and sanitize before adding
    const cleanedLeads: RawLead[] = freshLeads.map((l) => ({
      ...l,
      companyName: cleanCompanyName(l.companyName),
      location: l.location || {
        city: target.city,
        country: target.country
      }
    }));

    if (cleanedLeads.length > 0) {
      const { added, total } = store.addLeads(cleanedLeads);
      console.log(`[WorkerDaemon:AutoSource] Added ${added} new unique leads from ${target.name}. Total leads in DB: ${total}`);
    } else {
      console.log(`[WorkerDaemon:AutoSource] No new leads from ${target.name}.`);
    }
  } catch (err) {
    console.error("[WorkerDaemon:AutoSource] Sourcing error:", (err as Error).message);
  }
}

/**
 * Continuous auto-enrichment and SMTP validation engine.
 */
async function runEnrichmentCycle() {
  try {
    const store = LeadStore.getInstance();
    store.reloadFromDisk();
    const allLeads = store.getAllLeads();

    // Select pending sourced leads that have websites or candidate emails
    const batch = allLeads
      .filter((l) => l.stage === "sourced" && !(l.signalData as any)?.draftEmail)
      .slice(0, 5);

    if (batch.length === 0) {
      console.log("[WorkerDaemon:Enrich] No pending sourced leads to enrich. Queue idle.");
      return;
    }

    console.log(`[WorkerDaemon:Enrich] Processing batch of ${batch.length} leads...`);

    for (const lead of batch) {
      try {
        console.log(`[WorkerDaemon:Enrich] Enriching: ${lead.companyName} (${lead.websiteUrl || "no website"})...`);
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

        console.log(`[WorkerDaemon:Enrich] Completed: ${enriched.companyName} -> Stage: ${nextStage} (Target: ${enriched.targetEmail || "none"})`);
      } catch (err) {
        console.error(`[WorkerDaemon:Enrich] Error on lead ${lead.id}:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.error("[WorkerDaemon:Enrich] Cycle error:", err);
  }
}

// 1. Initial enrichment cycle on startup (after 3s)
setTimeout(runEnrichmentCycle, 3000);

// Continuous enrichment loop every 60 seconds
setInterval(runEnrichmentCycle, 60000);

// 2. Initial worldwide sourcing cycle on startup (after 10s)
setTimeout(runWorldwideSourcingCycle, 10000);

// Continuous worldwide sourcing rotation every 2 hours (7200000 ms)
setInterval(runWorldwideSourcingCycle, 2 * 60 * 60 * 1000);
