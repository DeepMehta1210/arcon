import type { RawLead } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";

export interface YCSearchOptions {
  batch?: string; // e.g. "W24", "S23"
  query?: string;
  limit?: number;
}

export async function searchYCCompanies(options: YCSearchOptions = {}): Promise<RawLead[]> {
  const limit = options.limit ?? 10;
  const batch = options.batch ?? "W24";

  // Use Algolia HN/YC public search endpoint or fallback mock for resilient testing
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
      `"YC ${batch}" ${options.query ?? "launch"}`
    )}&tags=story&hitsPerPage=${limit}`;

    const res = await fetch(url, { headers: { "User-Agent": "arcon/1.0" } });
    if (!res.ok) throw new Error(`Algolia query failed: ${res.statusText}`);

    const data = await res.json() as {
      hits?: Array<{
        objectID: string;
        title: string;
        url?: string;
        author: string;
        created_at: string;
      }>;
    };

    const leads: RawLead[] = (data.hits ?? []).map((hit) => {
      const cleanTitle = hit.title.replace(/^Show HN:\s*/i, "");
      const companyGuess = cleanTitle.split(/[-–—:|]/)[0].trim();
      const domain = hit.url ? new URL(hit.url).hostname.replace(/^www\./, "") : undefined;

      return {
        id: randomUUID(),
        source: "yc_directory",
        companyName: companyGuess || hit.title,
        headline: hit.title,
        contactName: hit.author,
        emailCandidates: domain ? [`founders@${domain}`, `hello@${domain}`] : [],
        websiteUrl: hit.url,
        socialUrls: {
          hn: `https://news.ycombinator.com/user?id=${hit.author}`,
          discussion: `https://news.ycombinator.com/item?id=${hit.objectID}`
        },
        signalData: {
          batch,
          hnId: hit.objectID,
          author: hit.author
        },
        discoveredAt: new Date().toISOString()
      };
    });

    return leads;
  } catch (err) {
    // Return structured fallback
    return [
      {
        id: randomUUID(),
        source: "yc_directory",
        companyName: "Sample YC Startup",
        headline: `YC ${batch} Launch`,
        contactName: "Founder",
        emailCandidates: ["founder@sampleyc.com"],
        websiteUrl: "https://sampleyc.com",
        socialUrls: {},
        signalData: { batch, mock: true, error: (err as Error).message },
        discoveredAt: new Date().toISOString()
      }
    ];
  }
}
