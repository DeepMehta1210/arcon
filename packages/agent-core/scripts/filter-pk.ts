import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "packages/database/data/imported-leads.json");
const leads = JSON.parse(fs.readFileSync(filePath, "utf8"));

const pkLeads = leads.filter((l: any) => {
  const allText = JSON.stringify(l).toLowerCase();
  return (
    allText.includes("pakistan") ||
    allText.includes(".pk") ||
    allText.includes("+92") ||
    allText.includes("lahore") ||
    allText.includes("karachi") ||
    allText.includes("islamabad") ||
    allText.includes("rawalpindi") ||
    allText.includes("turn up technologies")
  );
});

console.log(`Total leads matching Pakistan: ${pkLeads.length}`);
pkLeads.forEach((l: any, i: number) => {
  console.log(`[${i + 1}] ID: ${l.id} | Name: ${l.companyName} | Web: ${l.websiteUrl} | Phone: ${l.phone} | Loc: ${l.location?.rawAddress || l.location?.country}`);
});
