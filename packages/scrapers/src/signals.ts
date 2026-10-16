import type { RawLead, SignalEvent } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";

export interface SignalSearchOptions {
  query?: string;
  limit?: number;
}

export async function fetchShowHNSignals(options: SignalSearchOptions = {}): Promise<{ leads: RawLead[]; signals: SignalEvent[] }> {
  const limit = options.limit ?? 10;
  const query = options.query ?? "Show HN";

  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=show_hn&hitsPerPage=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": "arcon/1.0" } });
  if (!res.ok) {
    throw new Error(`Failed to query HN signals: ${res.statusText}`);
  }

  const data = await res.json() as {
    hits?: Array<{
      objectID: string;
      title: string;
      url?: string;
      author: string;
      created_at: string;
      points?: number;
      num_comments?: number;
    }>;
  };

  const leads: RawLead[] = [];
  const signals: SignalEvent[] = [];

  for (const hit of data.hits ?? []) {
    const cleanTitle = hit.title.replace(/^Show HN:\s*/i, "");
    const companyGuess = cleanTitle.split(/[-–—:|]/)[0].trim();
    let domain = "";
    if (hit.url) {
      try {
        domain = new URL(hit.url).hostname.replace(/^www\./, "");
      } catch {}
    }

    leads.push({
      id: randomUUID(),
      source: "signal_finder",
      companyName: companyGuess || hit.title,
      headline: hit.title,
      contactName: hit.author,
      emailCandidates: domain ? [`founders@${domain}`, `hello@${domain}`] : [],
      websiteUrl: hit.url,
      socialUrls: {
        authorProfile: `https://news.ycombinator.com/user?id=${hit.author}`,
        discussion: `https://news.ycombinator.com/item?id=${hit.objectID}`
      },
      signalData: {
        points: hit.points ?? 0,
        comments: hit.num_comments ?? 0,
        hnId: hit.objectID
      },
      discoveredAt: new Date().toISOString()
    });

    signals.push({
      id: randomUUID(),
      source: "hacker_news_show_hn",
      signalType: "product_launch",
      companyDomain: domain || "unknown.com",
      companyName: companyGuess || hit.title,
      headline: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      detectedAt: hit.created_at,
      metadata: {
        points: hit.points ?? 0,
        comments: hit.num_comments ?? 0,
        author: hit.author
      }
    });
  }

  return { leads, signals };
}
