import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "packages/database/data/imported-leads.json");
const leads = JSON.parse(fs.readFileSync(filePath, "utf8"));

console.log(`Total leads: ${leads.length}`);
leads.slice(0, 10).forEach((l: any, i: number) => {
  console.log(`\n[${i + 1}] Company: ${l.companyName} | Domain: ${l.websiteUrl}`);
  console.log(`    Contact: ${l.contactName || "NONE"}`);
  console.log(`    Email Candidates: ${(l.emailCandidates || []).join(", ") || "NONE"}`);
  console.log(`    Current Target: ${l.signalData?.draftEmail?.targetEmail || "NONE"}`);
  console.log(`    Subject: ${l.signalData?.draftEmail?.subject || "NONE"}`);
});
