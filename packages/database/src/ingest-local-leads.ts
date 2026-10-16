import { importLeadsFromCsv } from "@arcon/scrapers";
import { LeadStore } from "./lead-store";
import { existsSync } from "node:fs";
import { join } from "node:path";

const LEADS_DIR = "C:/Users/DeepMehta/Organiz/Research/github/marketing-and-leads/Leads";

export function runLeadIngestion(): {
  filesProcessed: string[];
  totalImported: number;
  stats: ReturnType<LeadStore["getStats"]>;
} {
  const store = LeadStore.getInstance();
  const files = [
    "uk-cloud-leads-enriched.csv",
    "usa-it-leads-clutch.csv",
    "USA_IT_1000_Leads.csv",
    "Wordpress_data.csv"
  ];

  const processed: string[] = [];
  let totalImported = 0;

  for (const filename of files) {
    const fullPath = join(LEADS_DIR, filename);
    if (!existsSync(fullPath)) {
      console.warn(`File not found, skipping: ${fullPath}`);
      continue;
    }

    try {
      const leads = importLeadsFromCsv(fullPath);
      const res = store.addLeads(leads);
      processed.push(filename);
      totalImported += res.added;
      console.log(`Ingested ${leads.length} records from ${filename} (${res.added} new).`);
    } catch (err) {
      console.error(`Failed to ingest ${filename}:`, err);
    }
  }

  const stats = store.getStats();
  console.log("Ingestion complete. Current Lead Store stats:", stats);

  return {
    filesProcessed: processed,
    totalImported,
    stats
  };
}

// Allow direct CLI execution
if (import.meta.main) {
  runLeadIngestion();
}
