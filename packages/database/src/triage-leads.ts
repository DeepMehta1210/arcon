import { db } from "./client";
import { companies, contacts, signals } from "./schema";
import { eq, desc, count } from "drizzle-orm";
import { qualifyLead, type LeadQualificationInput } from "../../agent-core/src/qualification-gate";
import { LeadStore } from "./lead-store";

export async function getTriageSummary() {
  const stageCounts = await db
    .select({
      stage: contacts.pipelineStage,
      count: count()
    })
    .from(contacts)
    .groupBy(contacts.pipelineStage);

  const topQualified = await db
    .select({
      id: contacts.id,
      fullName: contacts.fullName,
      email: contacts.email,
      title: contacts.title,
      linkedinUrl: contacts.linkedinUrl,
      leadScore: contacts.leadScore,
      pipelineStage: contacts.pipelineStage,
      companyName: companies.name,
      companyDomain: companies.domain,
      techStack: companies.techStack,
      customAttributes: contacts.customAttributes
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.pipelineStage, "ready_for_outreach"))
    .orderBy(desc(contacts.leadScore))
    .limit(25);

  const reviewQueue = await db
    .select({
      id: contacts.id,
      fullName: contacts.fullName,
      email: contacts.email,
      title: contacts.title,
      leadScore: contacts.leadScore,
      pipelineStage: contacts.pipelineStage,
      companyName: companies.name,
      companyDomain: companies.domain,
      customAttributes: contacts.customAttributes
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.pipelineStage, "needs_manual_review"))
    .orderBy(desc(contacts.leadScore))
    .limit(25);

  return { stageCounts, topQualified, reviewQueue };
}

export async function runStep3QualificationTriage(): Promise<{
  totalEvaluated: number;
  readyForOutreach: number;
  needsManualReview: number;
  disqualified: number;
  byAngle: Record<string, number>;
}> {
  console.log("==========================================================");
  console.log("3 DICES: STEP 3 AUTOMATED QUALIFICATION & VERIFICATION GATE");
  console.log("==========================================================");
  console.log("Fetching contacts and companies from PostgreSQL...");

  // 1. Fetch all contacts joined with company
  const dbContacts = await db
    .select({
      contactId: contacts.id,
      fullName: contacts.fullName,
      email: contacts.email,
      title: contacts.title,
      linkedinUrl: contacts.linkedinUrl,
      phone: contacts.phone,
      verificationStatus: contacts.verificationStatus,
      existingScore: contacts.leadScore,
      existingStage: contacts.pipelineStage,
      customAttributes: contacts.customAttributes,
      companyId: companies.id,
      companyName: companies.name,
      companyDomain: companies.domain,
      companyDescription: companies.description,
      techStack: companies.techStack,
      companySocialUrls: companies.socialUrls
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id));

  console.log(`Loaded ${dbContacts.length} contacts from PostgreSQL.`);

  // 2. Fetch all signals for quick lookup by domain
  const dbSignals = await db.select().from(signals);
  const signalMap = new Map<string, typeof dbSignals[0]>();
  for (const sig of dbSignals) {
    if (sig.companyDomain) {
      signalMap.set(sig.companyDomain.toLowerCase(), sig);
    }
  }

  const store = LeadStore.getInstance();
  const allStoreLeads = store.getAllLeads();
  const storeLeadMap = new Map<string, typeof allStoreLeads[0]>();
  for (const sl of allStoreLeads) {
    if (sl.websiteUrl) {
      const clean = sl.websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
      storeLeadMap.set(clean, sl);
    }
    if (sl.companyName) {
      storeLeadMap.set(sl.companyName.toLowerCase().trim(), sl);
    }
  }

  let readyForOutreachCount = 0;
  let needsManualReviewCount = 0;
  let disqualifiedCount = 0;
  const angleCounts: Record<string, number> = {
    aws_devops_hiring: 0,
    aws_finops_cost: 0,
    aws_migration: 0,
    aws_agency_whitelabel: 0,
    ai_bedrock_vpc: 0,
    devsecops_hardening: 0,
    general_cloud: 0
  };

  console.log("Executing 4-Factor Rubric across all contacts...");

  for (let i = 0; i < dbContacts.length; i++) {
    const row = dbContacts[i];
    const domain = (row.companyDomain || "").toLowerCase();
    const sig = signalMap.get(domain);
    const storeLead = storeLeadMap.get(domain) || storeLeadMap.get((row.companyName || "").toLowerCase());

    const emailCandidates: string[] = Array.isArray((row.customAttributes as any)?.emailCandidates)
      ? (row.customAttributes as any).emailCandidates
      : storeLead?.emailCandidates || [];

    const cloudAudit = (row.customAttributes as any)?.cloudAudit ||
      (storeLead?.signalData as any)?.cloudAudit ||
      (storeLead?.signalData as any)?.dossier?.cloudAudit ||
      undefined;

    const input: LeadQualificationInput = {
      company: {
        name: row.companyName || storeLead?.companyName || "Unknown Company",
        domain: domain || storeLead?.websiteUrl || "",
        websiteUrl: storeLead?.websiteUrl,
        description: row.companyDescription || storeLead?.headline || "",
        techStack: (row.techStack as string[]) || (storeLead as any)?.detectedTech || []
      },
      contact: {
        fullName: row.fullName || storeLead?.contactName,
        email: row.email || emailCandidates[0],
        title: row.title || undefined,
        linkedinUrl: row.linkedinUrl || undefined,
        phone: row.phone || storeLead?.phone,
        verificationStatus: row.verificationStatus || storeLead?.verificationStatus,
        emailCandidates
      },
      trigger: {
        source: sig?.source || (row.customAttributes as any)?.source || storeLead?.source,
        headline: sig?.headline || (row.customAttributes as any)?.rawHeadline || storeLead?.headline,
        signalType: sig?.signalType || "cloud_pain"
      },
      cloudAudit
    };

    const qualification = qualifyLead(input);

    // Track analytics
    if (qualification.stage === "ready_for_outreach") {
      readyForOutreachCount++;
    } else if (qualification.stage === "needs_manual_review") {
      needsManualReviewCount++;
    } else {
      disqualifiedCount++;
    }

    const angle = qualification.intentDetails.intentAngle || "general_cloud";
    angleCounts[angle] = (angleCounts[angle] || 0) + 1;

    // Update in PostgreSQL
    // Preserve "contacted" or "replied" if the lead is already actively in outreach
    const isAlreadyInMotion = row.existingStage === "contacted" || row.existingStage === "replied";
    const newStage = isAlreadyInMotion ? row.existingStage : qualification.stage;

    const updatedCustomAttributes = {
      ...(typeof row.customAttributes === "object" && row.customAttributes !== null ? row.customAttributes : {}),
      qualification: {
        score: qualification.score,
        stage: qualification.stage,
        passed: qualification.passed,
        rejectionReason: qualification.rejectionReason || null,
        breakdown: qualification.breakdown,
        reachabilityDetails: qualification.reachabilityDetails,
        intentDetails: qualification.intentDetails,
        icpDetails: qualification.icpDetails,
        recommendedPitchAngle: qualification.recommendedPitchAngle,
        qualifiedAt: qualification.qualifiedAt
      }
    };

    await db
      .update(contacts)
      .set({
        leadScore: qualification.score,
        pipelineStage: newStage,
        customAttributes: updatedCustomAttributes,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, row.contactId));

    // Also update LeadStore for seamless dashboard visibility
    if (storeLead) {
      const uiStage = isAlreadyInMotion
        ? storeLead.stage
        : qualification.stage === "ready_for_outreach"
        ? "researched"
        : qualification.stage === "needs_manual_review"
        ? "sourced"
        : "disqualified";

      store.updateLead(storeLead.id, {
        score: qualification.score,
        stage: uiStage,
        notes: qualification.intentDetails.triggerSummary,
        signalData: {
          ...(storeLead.signalData || {}),
          qualification
        }
      });
    }

    if ((i + 1) % 100 === 0 || i === dbContacts.length - 1) {
      console.log(`Evaluated ${i + 1}/${dbContacts.length} contacts...`);
    }
  }

  console.log("\n==========================================================");
  console.log("STEP 3 QUALIFICATION TRIAGE COMPLETE");
  console.log("==========================================================");
  console.log(`Total Evaluated:       ${dbContacts.length}`);
  console.log(`Ready for Outreach:   ${readyForOutreachCount} (Score >= 80)`);
  console.log(`Needs Manual Review:  ${needsManualReviewCount} (Score 60-79)`);
  console.log(`Disqualified:         ${disqualifiedCount} (Score < 60)`);
  console.log("----------------------------------------------------------");
  console.log("Breakdown by Primary Buying Trigger Angle:");
  for (const [a, count] of Object.entries(angleCounts)) {
    console.log(` - ${a.padEnd(24)}: ${count}`);
  }
  console.log("==========================================================\n");

  return {
    totalEvaluated: dbContacts.length,
    readyForOutreach: readyForOutreachCount,
    needsManualReview: needsManualReviewCount,
    disqualified: disqualifiedCount,
    byAngle: angleCounts
  };
}

if (import.meta.main) {
  runStep3QualificationTriage()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Step 3 Triage failed:", err);
      process.exit(1);
    });
}
