import type { RawLead, SignalEvent } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";

export interface LinkedInJobScrapeOptions {
  keywords?: string;
  location?: string;
  limit?: number;
}

export interface LinkedInJobLead extends RawLead {
  jobTitle: string;
  jobLocation: string;
  jobPostingUrl: string;
}

const EXCLUDED_ENTERPRISE_GIANTS = new Set([
  "amazon", "amazon web services", "aws", "google", "microsoft",
  "meta", "apple", "ibm", "cisco", "oracle", "accenture", "deloitte", "pwc", "kpmg"
]);

/**
 * Normalizes company name into a clean root domain candidate.
 * e.g. "Bytes Software Services" -> "bytes.co.uk" / "bytes.com"
 */
function deriveDomainFromCompanyName(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)[0];
  return `${clean}.com`;
}

/**
 * Scrapes live LinkedIn public job postings for companies hiring AWS / DevOps / Cloud talent.
 * These companies have active budget and urgent infrastructure pain, making them ideal
 * prospects for white-label Cloud / DevOps partnerships.
 */
export async function scrapeLinkedInJobs(
  options: LinkedInJobScrapeOptions = {}
): Promise<{ leads: LinkedInJobLead[]; signals: SignalEvent[] }> {
  const keywords = options.keywords || 'DevOps "agency"';
  const location = options.location || "United Kingdom";
  const limit = options.limit ?? 15;

  const encodedKeywords = encodeURIComponent(keywords);
  const encodedLocation = encodeURIComponent(location);
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodedKeywords}&location=${encodedLocation}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  if (!res.ok) {
    throw new Error(`LinkedIn job search returned status ${res.status}: ${res.statusText}`);
  }

  const html = await res.text();
  const cardRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const cards = Array.from(html.matchAll(cardRegex)).map((m) => m[1]);

  const leads: LinkedInJobLead[] = [];
  const signals: SignalEvent[] = [];
  const seenCompanies = new Set<string>();

  for (const card of cards) {
    const titleMatch = card.match(/<h3[^>]*class=["'][^"']*base-search-card__title[^"']*["'][^>]*>\s*([^<]+)\s*<\/h3>/i);
    const companyMatch = card.match(/<h4[^>]*class=["'][^"']*base-search-card__subtitle[^"']*["'][^>]*>\s*<a[^>]*>([^<]+)<\/a>/i) ||
                         card.match(/<h4[^>]*class=["'][^"']*base-search-card__subtitle[^"']*["'][^>]*>\s*([^<]+)\s*<\/h4>/i);
    const locationMatch = card.match(/<span[^>]*class=["'][^"']*job-search-card__location[^"']*["'][^>]*>\s*([^<]+)\s*<\/span>/i);
    const linkMatch = card.match(/<a[^>]*class=["'][^"']*base-card__full-link[^"']*["'][^>]*href=["']([^"']+)["']/i);

    const company = companyMatch ? companyMatch[1].replace(/&amp;/g, "&").trim() : "";
    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").trim() : "Cloud/DevOps Role";
    const jobLoc = locationMatch ? locationMatch[1].trim() : location;
    const jobUrl = linkMatch ? linkMatch[1].split("?")[0] : "";

    if (!company || company.length < 2) continue;

    // Filter out giant tech conglomerates
    const lowerCompany = company.toLowerCase();
    if (EXCLUDED_ENTERPRISE_GIANTS.has(lowerCompany)) continue;
    if (seenCompanies.has(lowerCompany)) continue;
    seenCompanies.add(lowerCompany);

    const leadId = randomUUID();
    const candidateDomain = deriveDomainFromCompanyName(company);

    leads.push({
      id: leadId,
      source: "signal_finder",
      companyName: company,
      headline: `Hiring: ${title} (${jobLoc})`,
      websiteUrl: `https://${candidateDomain}`,
      emailCandidates: [
        `recruitment@${candidateDomain}`,
        `careers@${candidateDomain}`,
        `contact@${candidateDomain}`
      ],
      location: {
        city: jobLoc.split(",")[0]?.trim() || jobLoc,
        country: location.includes("United Kingdom") ? "United Kingdom" : "United States"
      },
      socialUrls: {
        linkedinJob: jobUrl
      },
      signalData: {
        channel: "linkedin_jobs",
        hiringRole: title,
        jobLocation: jobLoc,
        jobUrl,
        intent: "active_aws_hiring"
      },
      discoveredAt: new Date().toISOString(),
      jobTitle: title,
      jobLocation: jobLoc,
      jobPostingUrl: jobUrl
    });

    signals.push({
      id: randomUUID(),
      source: "linkedin_jobs",
      signalType: "hiring",
      companyDomain: candidateDomain,
      companyName: company,
      headline: `Active Job Posting: ${title}`,
      url: jobUrl,
      detectedAt: new Date().toISOString(),
      metadata: {
        role: title,
        location: jobLoc
      }
    });

    if (leads.length >= limit) break;
  }

  return { leads, signals };
}
