import fs from "fs";
import path from "path";
import dns from "dns/promises";

const DB_PATH = path.join(process.cwd(), "packages/database/data/imported-leads.json");

export interface VerifiedLeadRecord {
  id: string;
  companyName: string;
  contactName: string;
  targetEmail: string;
  subject: string;
  body: string;
  angle: string;
}

export function loadLeads() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

export function saveLeads(leads: any[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
}

export async function checkDomainMx(domain: string): Promise<string | null> {
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) return null;
    mxRecords.sort((a, b) => a.priority - b.priority);
    return mxRecords[0].exchange;
  } catch {
    return null;
  }
}

export function applyVerifiedLeads(records: VerifiedLeadRecord[]) {
  const leads = loadLeads();
  let count = 0;

  for (const record of records) {
    const lead = leads.find((l: any) => l.id === record.id);
    if (lead) {
      lead.companyName = record.companyName;
      lead.contactName = record.contactName;
      lead.stage = "researched";
      lead.score = 96;
      lead.verificationStatus = "socket_valid";
      lead.notes = record.body;
      lead.signalData = {
        ...(lead.signalData || {}),
        draftEmail: {
          subject: record.subject,
          body: record.body,
          angle: record.angle,
          targetEmail: record.targetEmail,
          generatedAt: new Date().toISOString()
        }
      };
      count++;
      console.log(`[VERIFIED] ${record.companyName} | ${record.contactName} <${record.targetEmail}>`);
    } else {
      console.warn(`[NOT FOUND] Lead ID ${record.id} (${record.companyName})`);
    }
  }

  saveLeads(leads);
  console.log(`\nSuccessfully applied ${count} verified leads to ${DB_PATH}`);
  return count;
}
