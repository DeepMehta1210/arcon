import type { RawLead } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

export interface CsvImportOptions {
  limit?: number;
}

/**
 * Robust RFC 4180 compliant CSV line parser.
 * Handles escaped quotes, commas, and multiline values.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip CRLF
      }
      currentRow.push(currentField.trim());
      currentField = "";
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

const INVALID_EMAIL_EXTENSIONS = /\.(jpe?g|png|webp|svg|gif|ico|bmp|tiff?|pdf|css|js)$/i;

/**
 * Cleans spammy SEO titles and keyword stuffing from company names.
 * e.g. "Westferry Tech | Website Development Company | London UK" -> "Westferry Tech"
 */
export function cleanCompanyName(raw?: string): string {
  if (!raw) return "Company";
  let cleaned = raw.trim();
  // Strip everything after SEO delimiter: | - – — • :
  cleaned = cleaned.split(/\s*[-–—|•:]\s*/)[0].trim();
  // Strip leading prefixes like "Welcome to"
  cleaned = cleaned.replace(/^Welcome to\s+/i, "").trim();
  return cleaned || raw.slice(0, 30).trim();
}

/**
 * Extracts all valid email addresses from text or comma-separated string,
 * strictly rejecting image filenames (e.g. @2x.jpg) and invalid extensions.
 */
export function extractEmails(raw: string): string[] {
  if (!raw) return [];
  // Separate common TLDs if concatenated with capitalized text e.g. .comNYC -> .com NYC
  const preprocessed = raw.replace(/\.(com|org|net|io|co|in|uk|ai|tech|me|dev|app)([A-Z])/g, ".$1 $2");
  const matches = preprocessed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((e) => e.toLowerCase().trim()))).filter((email) => {
    if (INVALID_EMAIL_EXTENSIONS.test(email)) return false;
    const parts = email.split("@");
    if (parts.length !== 2) return false;
    const domainParts = parts[1].split(".");
    const tld = domainParts[domainParts.length - 1];
    return tld && tld.length >= 2 && /^[a-z]+$/.test(tld);
  });
}

/**
 * Imports leads from raw CSV text content into standard RawLead objects.
 */
export function importLeadsFromCsvContent(
  content: string,
  sourceName = "csv_upload",
  options: CsvImportOptions = {}
): RawLead[] {
  const rows = parseCsvRows(content);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/^["']|["']$/g, ""));
  const dataRows = rows.slice(1);
  const limit = options.limit ?? dataRows.length;
  const targetRows = dataRows.slice(0, limit);

  const leads: RawLead[] = [];

  for (const row of targetRows) {
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = row[index] ?? "";
    });

    // Detect field mappings
    const rawCompanyName =
      rowObj["name"] ||
      rowObj["company"] ||
      rowObj["company name"] ||
      rowObj["title"] ||
      rowObj["website"]?.replace(/https?:\/\/(www\.)?/, "").split("/")[0] ||
      "Unknown Company";

    const companyName = cleanCompanyName(rawCompanyName);

    if (!companyName || companyName === "Unknown Company") continue;

    const rawEmails = [
      rowObj["email"],
      rowObj["personal email"],
      rowObj["company email"],
      rowObj["extra_emails"]
    ].filter(Boolean).join(", ");

    const emails = extractEmails(rawEmails);

    const contactName =
      rowObj["decision_makers"]?.split(";")[0]?.split("(")[0]?.trim() ||
      rowObj["person name"] ||
      rowObj["contact"] ||
      undefined;

    const phone =
      rowObj["phone"] ||
      rowObj["company phone"] ||
      rowObj["personal contact number"] ||
      undefined;

    let websiteUrl = rowObj["website"] || undefined;
    if (websiteUrl && !websiteUrl.startsWith("http")) {
      websiteUrl = `https://${websiteUrl}`;
    }

    const linkedin =
      rowObj["linkedin_company"] ||
      rowObj["company linkedin"] ||
      rowObj["personal linkedin"] ||
      undefined;

    const rawAddress = rowObj["address"] || undefined;
    const city = rowObj["city"] || undefined;
    const country = rowObj["country"] || (sourceName.includes("uk-") ? "United Kingdom" : "United States");

    leads.push({
      id: randomUUID(),
      source: "csv_import",
      companyName,
      headline: rowObj["category"] || rowObj["position"] || "B2B Target",
      contactName,
      emailCandidates: emails,
      phone,
      websiteUrl,
      location: {
        city,
        country,
        rawAddress
      },
      socialUrls: linkedin ? { linkedin } : {},
      signalData: {
        sourceFile: sourceName,
        rating: rowObj["rating"],
        reviews: rowObj["reviews"],
        decisionMakerLinkedin: rowObj["decision_maker_linkedin"]
      },
      discoveredAt: new Date().toISOString()
    });
  }

  return leads;
}

/**
 * Imports leads from a local CSV file into standard RawLead objects.
 */
export function importLeadsFromCsv(filePath: string, options: CsvImportOptions = {}): RawLead[] {
  if (!existsSync(filePath)) {
    throw new Error(`CSV file not found at: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  return importLeadsFromCsvContent(content, filePath, options);
}
