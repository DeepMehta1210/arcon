import { NextResponse } from "next/server";
import {
  scrapeLocalPlaces,
  fetchShowHNSignals,
  searchYCCompanies,
  scrapeLinkedInJobs,
  scrapeRedditSignals,
  scrapeClutchAgencies,
  scrapeRemoteOkJobs,
  scrapeWeWorkRemotelyJobs
} from "@arcon/scrapers";
import { LeadStore } from "@arcon/database";
import { collectLeadRawData } from "@arcon/agent-core";
import type { RawLead } from "@arcon/shared-types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, keyword, city, limit = 15, batch = "W24", autoEnrich = true } = body;

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: channel" },
        { status: 400 }
      );
    }

    let minedLeads: RawLead[] = [];

    if (channel === "places") {
      minedLeads = await scrapeLocalPlaces({
        keyword: keyword || "Web Design Agency",
        city: city || "London",
        limit
      });
    } else if (channel === "linkedin_jobs") {
      const result = await scrapeLinkedInJobs({
        keywords: keyword || 'DevOps "agency"',
        location: city || "United Kingdom",
        limit
      });
      minedLeads = result.leads;
    } else if (channel === "reddit") {
      const result = await scrapeRedditSignals({
        subreddit: keyword || "aws",
        query: city || "bill OR cost OR agency OR help",
        limit
      });
      minedLeads = result.leads;
    } else if (channel === "clutch") {
      minedLeads = await scrapeClutchAgencies({
        categoryOrKeyword: keyword || "",
        limit
      });
    } else if (channel === "remoteok") {
      const result = await scrapeRemoteOkJobs({
        tag: keyword || "devops",
        limit
      });
      minedLeads = result.leads;
    } else if (channel === "weworkremotely") {
      const result = await scrapeWeWorkRemotelyJobs({
        categorySlug: keyword || "remote-devops-sysadmin-jobs",
        limit
      });
      minedLeads = result.leads;
    } else if (channel === "show_hn") {
      const result = await fetchShowHNSignals({
        query: keyword || "Show HN",
        limit
      });
      minedLeads = result.leads;
    } else if (channel === "yc") {
      minedLeads = await searchYCCompanies({
        batch,
        query: keyword,
        limit
      });
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported channel: ${channel}` },
        { status: 400 }
      );
    }

    const store = LeadStore.getInstance();
    const { added, total } = store.addLeads(minedLeads);

    let researchedCount = 0;

    // Step 2 Raw Data Collection (Parallel Worker Pool):
    // Gather deep company intel, cloud infrastructure audit, decision maker profile, and LinkedIn URLs
    // and persist directly into PostgreSQL (without drafting emails).
    if (autoEnrich && minedLeads.length > 0) {
      const leadsToCollect = minedLeads.slice(0, 8);
      await Promise.all(
        leadsToCollect.map(async (raw) => {
          try {
            const collected = await collectLeadRawData(raw);

            const hasPersonalContact =
              collected.decisionMaker.isPersonalProfile &&
              Boolean(collected.decisionMaker.primaryEmail || collected.decisionMaker.personalLinkedinUrl);

            const nextStage = hasPersonalContact ? "researched" : "sourced";
            if (hasPersonalContact) researchedCount++;

            store.updateLead(raw.id, {
              ...collected.enrichedLead,
              stage: nextStage,
              contactName: collected.decisionMaker.fullName,
              verificationStatus:
                collected.decisionMaker.emailVerificationStatus === "valid"
                  ? "socket_valid"
                  : collected.decisionMaker.emailVerificationStatus,
              phone: collected.decisionMaker.phone || collected.company.phone || raw.phone,
              socialUrls: {
                ...(raw.socialUrls || {}),
                ...(collected.company.companyLinkedinUrl ? { linkedin: collected.company.companyLinkedinUrl } : {}),
                ...(collected.decisionMaker.personalLinkedinUrl ? { personalLinkedin: collected.decisionMaker.personalLinkedinUrl } : {})
              },
              emailCandidates: collected.decisionMaker.emailCandidates,
              signalData: {
                ...(raw.signalData || {}),
                cloudAudit: collected.cloudInfrastructure,
                decisionMaker: collected.decisionMaker,
                trigger: collected.trigger
              }
            });
          } catch {
            // If collection fails for an individual lead, it stays safely in store
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      channel,
      minedCount: minedLeads.length,
      added,
      researchedCount,
      total,
      stats: store.getStats()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
