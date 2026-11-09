import { db } from "./client";
import { companies, contacts, signals } from "./schema";
import { eq } from "drizzle-orm";
import type { RawLead } from "@arcon/shared-types";
import type { StoredLead } from "./lead-store";

export function extractCleanDomain(url?: string): string {
  if (!url) return "";
  try {
    const withProtocol = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

export async function upsertLeadToPostgres(lead: RawLead | StoredLead): Promise<{ companyId?: string; contactId?: string }> {
  try {
    const rawDomain = extractCleanDomain(lead.websiteUrl);
    const domain = rawDomain || `${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.local`;

    const dossier = (lead.signalData as any)?.dossier;
    const dossierCompany = dossier?.company;
    const dossierDM = dossier?.decisionMaker || (lead.signalData as any)?.decisionMaker;

    const techStack = dossierCompany?.techStack || (lead as any).detectedTech || [];
    const description = dossierCompany?.description || lead.headline || "";
    const socialUrls = {
      ...(lead.socialUrls || {}),
      ...(dossierDM?.linkedInUrl ? { decisionMakerLinkedin: dossierDM.linkedInUrl } : {})
    };

    // 1. Check or Insert Company
    const existingCompany = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.domain, domain))
      .limit(1);

    let companyId = existingCompany[0]?.id;

    if (!companyId) {
      const [insertedCompany] = await db
        .insert(companies)
        .values({
          name: lead.companyName,
          domain,
          description,
          stage: dossierCompany?.stage || "bootstrapped",
          techStack,
          socialUrls,
        })
        .onConflictDoNothing()
        .returning({ id: companies.id });

      companyId = insertedCompany?.id;
    } else {
      // Update company tech stack and description if enriched
      await db
        .update(companies)
        .set({
          description: description || undefined,
          techStack: techStack.length > 0 ? techStack : undefined,
          socialUrls,
          updatedAt: new Date()
        })
        .where(eq(companies.id, companyId));
    }

    // 2. Upsert Contact / Decision Maker
    const primaryEmail =
      lead.emailCandidates?.[0] ||
      dossierDM?.email ||
      (lead.signalData as any)?.properEmail?.targetEmail ||
      `${lead.id.slice(0, 12)}@unverified.${domain}`;

    const fullName =
      lead.contactName ||
      dossierDM?.fullName ||
      (lead.signalData as any)?.decisionMaker?.fullName ||
      `${lead.companyName} Leadership`;

    const role =
      dossierDM?.role ||
      (lead.signalData as any)?.decisionMaker?.role ||
      (lead.headline?.includes("DevOps") ? "Engineering Lead" : "Founder & Technical Director");

    const linkedinUrl =
      dossierDM?.linkedInUrl ||
      (lead as any).decisionMakerLinkedin ||
      (lead.socialUrls?.linkedin?.includes("/in/") ? lead.socialUrls.linkedin : null);

    const storedLead = lead as StoredLead;
    const verificationStatus = storedLead.verificationStatus || dossierDM?.emailVerification?.status || "unverified";
    const leadScore = typeof storedLead.score === "number" ? storedLead.score : 50;

    let contactId: string | undefined;

    if (primaryEmail && fullName) {
      const emailLower = primaryEmail.toLowerCase().trim();

      const existingContact = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, emailLower))
        .limit(1);

      if (!existingContact[0]?.id) {
        const [insertedContact] = await db
          .insert(contacts)
          .values({
            companyId: companyId || null,
            fullName: fullName.trim(),
            email: emailLower,
            phone: lead.phone || null,
            title: role,
            linkedinUrl,
            verificationStatus,
            leadScore,
            pipelineStage: storedLead.stage || "lead_identified",
            customAttributes: {
              source: lead.source,
              discoveredAt: lead.discoveredAt,
              location: lead.location,
              emailCandidates: lead.emailCandidates || [],
              socialUrls: lead.socialUrls || {},
              cloudAudit: (lead.signalData as any)?.cloudAudit || dossier?.cloudAudit || null,
              rawHeadline: lead.headline || null,
            },
          })
          .onConflictDoNothing()
          .returning({ id: contacts.id });

        contactId = insertedContact?.id;
      } else {
        contactId = existingContact[0].id;
        await db
          .update(contacts)
          .set({
            fullName: fullName.trim(),
            title: role,
            phone: lead.phone || undefined,
            linkedinUrl: linkedinUrl || undefined,
            verificationStatus,
            leadScore,
            updatedAt: new Date()
          })
          .where(eq(contacts.id, contactId));
      }
    }

    // 3. Upsert Signal Event
    if (lead.source && (lead.headline || lead.companyName)) {
      await db
        .insert(signals)
        .values({
          source: lead.source,
          signalType: lead.source.includes("job") ? "hiring" : "cloud_pain",
          companyDomain: domain,
          companyName: lead.companyName,
          headline: lead.headline || `Lead sourced from ${lead.source}`,
          url: lead.websiteUrl || `https://${domain}`,
          metadata: {
            location: lead.location,
            emailsCount: lead.emailCandidates?.length || 0,
            hasDecisionMaker: Boolean(fullName),
            linkedinUrl
          },
        })
        .onConflictDoNothing();
    }

    return { companyId, contactId };
  } catch (err) {
    console.warn(`[postgres-sync] Failed to sync lead ${lead.companyName}:`, (err as Error).message);
    return {};
  }
}

export async function syncAllLeadsToPostgres(leads: (RawLead | StoredLead)[]) {
  console.log(`[postgres-sync] Starting batch sync of ${leads.length} leads to PostgreSQL...`);
  let synced = 0;
  for (const lead of leads) {
    await upsertLeadToPostgres(lead);
    synced++;
    if (synced % 100 === 0 || synced === leads.length) {
      console.log(`[postgres-sync] Synced ${synced}/${leads.length} leads.`);
    }
  }
  console.log(`[postgres-sync] Completed sync of ${synced} leads to PostgreSQL.`);
}
