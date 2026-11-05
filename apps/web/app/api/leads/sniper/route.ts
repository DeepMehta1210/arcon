import { NextResponse } from "next/server";
import { LeadStore } from "@arcon/database";
import { enrichAndPersonalizeLead, cleanCompanyName } from "@arcon/agent-core";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { url, contactName, companyName, archetype } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide an agency website URL." },
        { status: 400 }
      );
    }

    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    let domain = "agency.com";
    try {
      domain = new URL(cleanUrl).hostname.replace(/^www\./, "");
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid website URL format." },
        { status: 400 }
      );
    }

    const derivedCompanyName = companyName?.trim()
      ? cleanCompanyName(companyName)
      : domain.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const leadId = randomUUID();
    const store = LeadStore.getInstance();

    // Run deep technical enrichment, portfolio extraction, and AI personalization
    const enriched = await enrichAndPersonalizeLead({
      id: leadId,
      companyName: derivedCompanyName,
      contactName: contactName?.trim() || undefined,
      websiteUrl: cleanUrl,
      emailCandidates: []
    });

    const isReadyForSales =
      (enriched.verificationStatus === "socket_valid" || enriched.verificationStatus === "catch_all") &&
      enriched.isPersonalDecisionMaker &&
      Boolean(enriched.targetEmail);

    const socialUrls: Record<string, string> = {};
    if (enriched.dossier?.decisionMaker?.linkedInUrl) {
      socialUrls.linkedin = enriched.dossier.decisionMaker.linkedInUrl;
    }

    const initialLead = {
      id: leadId,
      source: "signal_finder" as const,
      companyName: enriched.companyName || derivedCompanyName,
      contactName: enriched.contactName || contactName?.trim(),
      headline: enriched.dossier?.company?.description || "Digital & Web Agency",
      emailCandidates: enriched.targetEmail ? [enriched.targetEmail] : [],
      websiteUrl: cleanUrl,
      location: {
        country: "United Kingdom"
      },
      socialUrls,
      stage: isReadyForSales ? ("researched" as const) : ("sourced" as const),
      score: Math.max(enriched.score, 80),
      verificationStatus: enriched.verificationStatus,
      notes: enriched.draftBody,
      discoveredAt: new Date().toISOString(),
      signalData: {
        archetype: archetype || enriched.suggestedAngle,
        dossier: enriched.dossier,
        draftEmail: {
          subject: enriched.draftSubject,
          body: enriched.draftBody,
          angle: enriched.suggestedAngle,
          targetEmail: enriched.targetEmail,
          generatedAt: new Date().toISOString()
        }
      }
    };

    store.addLeads([initialLead]);
    const stored = store.getLeadById(leadId) || initialLead;

    return NextResponse.json({
      success: true,
      lead: stored,
      message: `Enriched ${stored.companyName}. Lead is ready for outreach.`
    });
  } catch (error) {
    console.error("[SniperApi] Error processing agency URL:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
