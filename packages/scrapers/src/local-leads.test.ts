import { describe, expect, it } from "bun:test";
import { importLeadsFromCsvContent, parseCsvRows } from "./local-leads";

describe("local-leads CSV Parser & Ingestion", () => {
  it("correctly parses RFC 4180 CSV rows including quotes and commas", () => {
    const csv = `Company,Email,Location\n"Acme, Inc.",contact@acme.com,"San Francisco, CA"\n"Globex Corp",info@globex.com,London`;
    const rows = parseCsvRows(csv);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(["Company", "Email", "Location"]);
    expect(rows[1]).toEqual(["Acme, Inc.", "contact@acme.com", "San Francisco, CA"]);
    expect(rows[2]).toEqual(["Globex Corp", "info@globex.com", "London"]);
  });

  it("extracts leads from memory CSV string with auto-detected columns", () => {
    const csv = `Company Name,Contact,Email,Phone,Website,City\nCloudForge,John Doe,john@cloudforge.io,+1-555-0199,cloudforge.io,Austin\nNextGen AI,,support@nextgen.ai,,https://nextgen.ai,New York`;
    const leads = importLeadsFromCsvContent(csv, "test-upload.csv");

    expect(leads.length).toBe(2);
    expect(leads[0].companyName).toBe("CloudForge");
    expect(leads[0].contactName).toBe("John Doe");
    expect(leads[0].emailCandidates).toContain("john@cloudforge.io");
    expect(leads[0].phone).toBe("+1-555-0199");
    expect(leads[0].websiteUrl).toBe("https://cloudforge.io");
    expect(leads[0].location?.city).toBe("Austin");

    expect(leads[1].companyName).toBe("NextGen AI");
    expect(leads[1].emailCandidates).toContain("support@nextgen.ai");
    expect(leads[1].websiteUrl).toBe("https://nextgen.ai");
  });

  it("ignores header-only or empty CSV content safely", () => {
    const emptyLeads = importLeadsFromCsvContent("", "empty.csv");
    expect(emptyLeads).toEqual([]);

    const headerOnly = importLeadsFromCsvContent("Company,Email\n", "header.csv");
    expect(headerOnly).toEqual([]);
  });
});
