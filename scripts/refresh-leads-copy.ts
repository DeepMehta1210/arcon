import { LeadStore } from "../packages/database";
import { generateProperOutreachEmail, generateFollowUpEmail } from "../packages/agent-core";
import { lintOutreachCopy } from "../packages/copy-linter";

async function main() {
  console.log("Rewiring all researched leads and contacted follow-ups with Lemlist standards...");
  const store = LeadStore.getInstance();
  const leads = store.getAllLeads();

  let researchedUpdated = 0;
  let followUpsGenerated = 0;

  for (const lead of leads) {
    const signalData = (lead.signalData as any) || {};
    const dossier = signalData.dossier;

    // 1. REWIRE ALL RESEARCHED LEADS WITH 1-3 WORD SUBJECTS & PROSPECT-FIRST COPY
    if (lead.stage === "researched") {
      const company = dossier?.company?.name || lead.companyName;
      const domain = dossier?.company?.domain || lead.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "company.com";
      const description = dossier?.company?.description || lead.headline || "";
      const techStack = dossier?.company?.techStack || [];
      const decisionMakerName = dossier?.decisionMaker?.fullName || lead.contactName || "there";
      const decisionMakerRole = dossier?.decisionMaker?.role || "Engineering Lead";
      const latencyMs = 450;
      const dmarcPolicy = "reject";

      const generated = generateProperOutreachEmail({
        companyName: company,
        domain,
        brandDescription: description,
        detectedTech: techStack,
        decisionMakerName,
        decisionMakerRole,
        latencyMs,
        dmarcPolicy
      });

      const lint = lintOutreachCopy(generated.body, {
        subject: generated.subject,
        enforceLemlistStandards: true,
        enforceSte100: false
      });

      const targetEmail =
        signalData.draftEmail?.targetEmail ||
        dossier?.decisionMaker?.email ||
        lead.emailCandidates?.find((e: string) => !e.startsWith("sales@") && !e.startsWith("info@"));

      store.updateLead(lead.id, {
        notes: generated.body,
        signalData: {
          ...signalData,
          draftEmail: {
            subject: generated.subject,
            body: generated.body,
            angle: "High-Conversion Lemlist Cloud Archetype",
            targetEmail,
            generatedAt: new Date().toISOString()
          },
          dossier: dossier
            ? {
                ...dossier,
                recommendedOutreach: {
                  selectedPlay: "Lemlist Playbook Outreach",
                  targetChannel: "email",
                  tailoredSubject: generated.subject,
                  tailoredBody: generated.body,
                  lintReport: {
                    zeroWidthStripped: lint.zeroWidthStripped,
                    slopScore: lint.slopScore,
                    burstinessScore: lint.burstinessScore,
                    ste100Compliant: lint.ste100.compliant,
                    passed: lint.passed
                  }
                }
              }
            : undefined
        }
      });
      researchedUpdated++;
    }

    // 2. GENERATE BREAKDOWN #10 VALUE-FIRST FOLLOW-UPS FOR CONTACTED LEADS
    if (lead.stage === "contacted") {
      const company = lead.companyName;
      const domain = lead.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "company.com";
      const decisionMakerName = lead.contactName || "there";
      const initialSubject = signalData.lastOutbound?.subject || signalData.draftEmail?.subject || "cloud bill";
      const targetEmail = signalData.draftEmail?.targetEmail || dossier?.decisionMaker?.email;

      const followUp = generateFollowUpEmail({
        initialSubject,
        companyName: company,
        decisionMakerName,
        domain
      });

      store.updateLead(lead.id, {
        signalData: {
          ...signalData,
          followUpEmail: {
            subject: followUp.subject,
            body: followUp.body,
            targetEmail,
            generatedAt: new Date().toISOString()
          }
        }
      });
      followUpsGenerated++;
    }
  }

  console.log(`\nSuccessfully rewired ${researchedUpdated} researched leads with 1-3 word subjects and prospect-first archetypes.`);
  console.log(`Successfully generated ${followUpsGenerated} high-value Breakdown #10 follow-up drafts for contacted leads.`);

  // Inspect first 5 updated leads
  const updatedLeads = store.getAllLeads().filter((l) => l.stage === "researched").slice(0, 5);
  console.log("\nSample of rewired researched leads:");
  for (const ul of updatedLeads) {
    const d = (ul.signalData as any)?.draftEmail;
    console.log(`- [${ul.companyName}] Subject: '${d?.subject}' -> Target: ${d?.targetEmail}`);
  }

  const updatedContacted = store.getAllLeads().filter((l) => l.stage === "contacted");
  console.log("\nSample of Breakdown #10 follow-up drafts:");
  for (const uc of updatedContacted) {
    const f = (uc.signalData as any)?.followUpEmail;
    console.log(`- [${uc.companyName}] Subject: '${f?.subject}' to ${f?.targetEmail}`);
  }
}

main().catch(console.error);
