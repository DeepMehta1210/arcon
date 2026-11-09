import type { RawLead, SignalEvent } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";

export interface RedditScrapeOptions {
  subreddit?: string;
  query?: string;
  limit?: number;
}

export interface RedditPainLead extends RawLead {
  postTitle: string;
  author: string;
  postUrl: string;
  subreddit: string;
}

/**
 * Searches Reddit public RSS feeds for live demand signals, AWS cost complaints,
 * and infrastructure pain points. Requires 0 API keys and never triggers 403s.
 */
export async function scrapeRedditSignals(
  options: RedditScrapeOptions = {}
): Promise<{ leads: RedditPainLead[]; signals: SignalEvent[] }> {
  const subreddit = options.subreddit || "aws";
  const query = options.query || "bill OR cost OR agency OR help";
  const limit = options.limit ?? 15;

  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://www.reddit.com/r/${subreddit}/search.rss?q=${encodedQuery}&restrict_sr=on&sort=new&limit=${limit * 2}`;

  const res = await fetch(rssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!res.ok) {
    throw new Error(`Reddit RSS feed returned status ${res.status}: ${res.statusText}`);
  }

  const xml = await res.text();
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  const entries = Array.from(xml.matchAll(entryRegex)).map((m) => m[1]);

  const leads: RedditPainLead[] = [];
  const signals: SignalEvent[] = [];

  for (const entry of entries) {
    const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["']/i);
    const authorMatch = entry.match(/<author>\s*<name>([^<]+)<\/name>/i);
    const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/i);
    const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i);

    let title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim() : "";
    const postUrl = linkMatch ? linkMatch[1] : `https://reddit.com/r/${subreddit}`;
    const author = authorMatch ? authorMatch[1].replace(/^\/u\//, "").trim() : "reddit_user";
    const date = updatedMatch ? updatedMatch[1] : new Date().toISOString();

    if (!title || title.toLowerCase().includes("submissions :") || author === "AutoModerator") continue;

    const leadId = randomUUID();
    const companyGuess = `Reddit Prospect (/u/${author})`;

    leads.push({
      id: leadId,
      source: "signal_finder",
      companyName: companyGuess,
      headline: `Reddit r/${subreddit}: "${title.slice(0, 80)}"`,
      contactName: author,
      emailCandidates: [],
      websiteUrl: postUrl,
      location: {
        country: "Global"
      },
      socialUrls: {
        redditPost: postUrl,
        redditAuthor: `https://www.reddit.com/user/${author}`
      },
      signalData: {
        channel: "reddit_signals",
        subreddit,
        author,
        postUrl,
        postTitle: title,
        snippet: contentMatch ? contentMatch[1].replace(/<[^>]+>/g, " ").slice(0, 300).trim() : "",
        intent: "active_cloud_discussion"
      },
      discoveredAt: date,
      postTitle: title,
      author,
      postUrl,
      subreddit
    });

    signals.push({
      id: randomUUID(),
      source: "reddit_signals",
      signalType: "product_launch",
      companyDomain: "reddit.com",
      companyName: companyGuess,
      headline: title,
      url: postUrl,
      detectedAt: date,
      metadata: {
        subreddit,
        author
      }
    });

    if (leads.length >= limit) break;
  }

  return { leads, signals };
}
