import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generateSingleHighConvertingDraft } from "../../agent-core/src/pipeline-engine";
import { upsertLeadToPostgres } from "./postgres-sync";
import type { StoredLead } from "./lead-store";

const DATA_FILE = join(__dirname, "../data/imported-leads.json");

export async function rewriteAllLeadDrafts() {
  if (!existsSync(DATA_FILE)) {
    console.error("Data file does not exist:", DATA_FILE);
    return;
  }

  const raw = readFileSync(DATA_FILE, "utf-8");
  const leads: StoredLead[] = JSON.parse(raw);
  console.log(`Found ${leads.length} leads in ${DATA_FILE}. Rewriting all drafts to the single high-converting standard...`);

  let rewrittenCount = 0;

  for (const lead of leads) {
    const single = generateSingleHighConvertingDraft(
      { companyName: lead.companyName, contactName: lead.contactName },
      "Deep Mehta",
      "deep@3dices.com"
    );

    const existingDraftTarget = (lead.signalData as any)?.draftEmail?.targetEmail;
    const targetEmail =
      existingDraftTarget ||
      lead.emailCandidates?.find((e) => !e.startsWith("sales@") && !e.startsWith("info@")) ||
      lead.emailCandidates?.[0] ||
      "";

    lead.notes = single.body;
    lead.signalData = {
      ...(lead.signalData || {}),
      draftEmail: {
        subject: single.subject,
        body: single.body,
        angle: "White-Label Cloud Infrastructure",
        targetEmail,
        generatedAt: new Date().toISOString()
      }
    };

    if ((lead.signalData as any)?.recommendedOutreach) {
      (lead.signalData as any).recommendedOutreach.tailoredSubject = single.subject;
      (lead.signalData as any).recommendedOutreach.tailoredBody = single.body;
    }

    rewrittenCount++;
  }

  // Write updated list back to disk
  writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), "utf-8");
  console.log(`Successfully rewrote ${rewrittenCount} leads on disk.`);

  // Sync rewritten leads to PostgreSQL
  console.log("Syncing rewritten leads to PostgreSQL...");
  let pgCount = 0;
  for (const lead of leads) {
    try {
      await upsertLeadToPostgres(lead);
      pgCount++;
    } catch (err) {
      // ignore offline PG in local environments
    }
  }
  console.log(`PostgreSQL sync complete (${pgCount} leads processed).`);
}

if (require.main === module || process.argv[1]?.includes("rewrite-all-lead-drafts")) {
  rewriteAllLeadDrafts()
    .then(() => {
      console.log("Lead draft rewriting complete!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error rewriting drafts:", err);
      process.exit(1);
    });
}
