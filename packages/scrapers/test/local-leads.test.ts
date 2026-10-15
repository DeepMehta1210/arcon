import { describe, expect, it } from "bun:test";
import { parseCsvRows, extractEmails, importLeadsFromCsv } from "../src/local-leads";

describe("local-leads importer", () => {
  it("parses CSV rows with quoted commas correctly", () => {
    const csv = 'name,address\n"Acme, Inc.","123 Main St, London"';
    const rows = parseCsvRows(csv);
    expect(rows.length).toBe(2);
    expect(rows[1][0]).toBe("Acme, Inc.");
    expect(rows[1][1]).toBe("123 Main St, London");
  });

  it("extracts multiple emails and removes duplicates", () => {
    const text = "sales@test.com, info@test.com, SALES@test.com; other text";
    const emails = extractEmails(text);
    expect(emails).toEqual(["sales@test.com", "info@test.com"]);
  });

  it("imports real UK cloud leads CSV file", () => {
    const filePath = "C:/Users/DeepMehta/Organiz/Research/github/marketing-and-leads/Leads/uk-cloud-leads-enriched.csv";
    const leads = importLeadsFromCsv(filePath, { limit: 5 });
    expect(leads.length).toBe(5);
    expect(leads[0].companyName).toContain("Esferasoft Solutions");
    expect(leads[0].emailCandidates.length).toBeGreaterThan(0);
    expect(leads[0].source).toBe("csv_import");
  });
});
