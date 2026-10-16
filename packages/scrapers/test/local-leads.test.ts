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

  it("imports CSV lead file correctly", () => {
    const { writeFileSync, unlinkSync } = require("node:fs");
    const { tmpdir } = require("node:os");
    const { join } = require("node:path");

    const tmpFile = join(tmpdir(), "test-leads.csv");
    const sampleCsv = `title,description,address,email,phone,website\n"Esferasoft Solutions Ltd","Cloud software","London UK","business@esferasoft.co.uk","+44123456789","https://esferasoft.co.uk"\n"Acme Corp","DevOps","Manchester UK","info@acme.co.uk","+44987654321","https://acme.co.uk"`;
    
    writeFileSync(tmpFile, sampleCsv, "utf-8");
    try {
      const leads = importLeadsFromCsv(tmpFile, { limit: 5 });
      expect(leads.length).toBe(2);
      expect(leads[0].companyName).toContain("Esferasoft Solutions");
      expect(leads[0].emailCandidates).toContain("business@esferasoft.co.uk");
      expect(leads[0].source).toBe("csv_import");
    } finally {
      try { unlinkSync(tmpFile); } catch {}
    }
  });
});
