import type { RawLead, SignalEvent } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";

export interface RemoteOkScrapeOptions {
  tag?: string;
  limit?: number;
}

export interface RemoteOkLead extends RawLead {
  position: string;
  jobUrl: string;
  salary?: string;
  techTags: string[];
}

function deriveDomainFromCompany(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return `${clean}.com`;
}

/**
 * Scrapes companies actively paying to hire DevOps, Cloud, and Infrastructure engineers
 * via the official RemoteOK API. Zero API keys required.
 */
export async function scrapeRemoteOkJobs(
  options: RemoteOkScrapeOptions = {}
): Promise<{ leads: RemoteOkLead[]; signals: SignalEvent[] }> {
  const tag = (options.tag || "devops").toLowerCase().trim();
  const limit = options.limit ?? 15;

  const url = `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`RemoteOK API returned status ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as Array<Record<string, any>>;
  // First item in RemoteOK JSON is legal notice disclaimer, skip index 0
  const jobListings = Array.isArray(data) ? data.slice(1) : [];

  const leads: RemoteOkLead[] = [];
  const signals: SignalEvent[] = [];
  const seenCompanies = new Set<string>();

  for (const item of jobListings) {
    const company = item.company ? String(item.company).trim() : "";
    const position = item.position ? String(item.position).trim() : "DevOps/Cloud Role";
    const jobUrl = item.url ? String(item.url) : "https://remoteok.com";
    const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
    const location = item.location ? String(item.location) : "Remote / Global";
    const salary = item.salary ? String(item.salary) : undefined;

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
      headline: `Hiring: ${position} (${location})`,
      websiteUrl: `https://${candidateDomain}`,
      emailCandidates: [
        `recruitment@${candidateDomain}`,
        `careers@${candidateDomain}`,
        `contact@${candidateDomain}`
      ],
      location: {
        city: location.split(",")[0]?.trim() || "Remote",
        country: location.includes("US") || location.includes("United States") ? "United States" : "Global"
      },
      socialUrls: {
        jobPosting: jobUrl
      },
      signalData: {
        channel: "remoteok",
        position,
        salary,
        techTags: tags,
        jobUrl,
        intent: "active_devops_hiring"
      },
      discoveredAt: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      position,
      jobUrl,
      salary,
      techTags: tags
    });

    signals.push({
      id: randomUUID(),
      source: "remoteok",
      signalType: "hiring",
      companyDomain: candidateDomain,
      companyName: company,
      headline: `Active RemoteOK Job: ${position}`,
      url: jobUrl,
      detectedAt: new Date().toISOString(),
      metadata: {
        role: position,
        salary,
        tags
      }
    });

    if (leads.length >= limit) break;
  }

  return { leads, signals };
}
