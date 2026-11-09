import type { RawLead, SignalEvent } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";

export interface WwrScrapeOptions {
  categorySlug?: string;
  limit?: number;
}

export interface WwrLead extends RawLead {
  roleTitle: string;
  jobListingUrl: string;
}

function deriveDomainFromCompany(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return `${clean}.com`;
}

/**
 * Scrapes real companies actively hiring Cloud, Systems, and DevOps engineers
 * via WeWorkRemotely's public RSS feed. Zero API keys needed.
 */
export async function scrapeWeWorkRemotelyJobs(
  options: WwrScrapeOptions = {}
): Promise<{ leads: WwrLead[]; signals: SignalEvent[] }> {
  const category = options.categorySlug || "remote-devops-sysadmin-jobs";
  const limit = options.limit ?? 15;

  const rssUrl = `https://weworkremotely.com/categories/${category}.rss`;

  const res = await fetch(rssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!res.ok) {
    throw new Error(`WeWorkRemotely RSS returned status ${res.status}: ${res.statusText}`);
  }

  const xml = await res.text();
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items = Array.from(xml.matchAll(itemRegex)).map((m) => m[1]);

  const leads: WwrLead[] = [];
  const signals: SignalEvent[] = [];
  const seenCompanies = new Set<string>();

  for (const item of items) {
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = item.match(/<link>([^<]+)<\/link>/i) || item.match(/<guid[^>]*>([^<]+)<\/guid>/i);
    const pubDateMatch = item.match(/<pubDate>([^<]+)<\/pubDate>/i);

    const fullTitle = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").trim() : "";
    const jobUrl = linkMatch ? linkMatch[1].trim() : "https://weworkremotely.com";
    const date = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!fullTitle || !fullTitle.includes(":")) continue;

    // WWR format is: "CompanyName: Job Title"
    const colonIdx = fullTitle.indexOf(":");
    const company = fullTitle.slice(0, colonIdx).trim();
    const roleTitle = fullTitle.slice(colonIdx + 1).trim();

    if (!company || company.length < 2) continue;

    const lowerComp = company.toLowerCase();
    if (seenCompanies.has(lowerComp)) continue;
    seenCompanies.add(lowerComp);

    const leadId = randomUUID();
    const candidateDomain = deriveDomainFromCompany(company);

    leads.push({
      id: leadId,
      source: "signal_finder",
      companyName: company,
      headline: `Hiring: ${roleTitle}`,
      websiteUrl: `https://${candidateDomain}`,
      emailCandidates: [
        `recruitment@${candidateDomain}`,
        `careers@${candidateDomain}`,
        `contact@${candidateDomain}`
      ],
      location: {
        city: "Remote",
        country: "Global"
      },
      socialUrls: {
        jobPosting: jobUrl
      },
      signalData: {
        channel: "weworkremotely",
        roleTitle,
        jobUrl,
        intent: "active_devops_hiring"
      },
      discoveredAt: date,
      roleTitle,
      jobListingUrl: jobUrl
    });

    signals.push({
      id: randomUUID(),
      source: "weworkremotely",
      signalType: "hiring",
      companyDomain: candidateDomain,
      companyName: company,
      headline: `WeWorkRemotely Job: ${roleTitle}`,
      url: jobUrl,
      detectedAt: date,
      metadata: {
        role: roleTitle
      }
    });

    if (leads.length >= limit) break;
  }

  return { leads, signals };
}
