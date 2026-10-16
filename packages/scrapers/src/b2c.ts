import type { RawLead, LeadSource } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";
import { extractEmails } from "./local-leads";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Extracts phone numbers from free-form text.
 */
export function extractPhoneFromText(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  return match ? match[0].trim() : undefined;
}

/**
 * Scrapes a public YouTube channel or creator profile by handle.
 */
export async function scrapeYouTubeCreator(handle: string): Promise<RawLead> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  const channelUrl = `https://www.youtube.com/@${cleanHandle}`;

  try {
    const res = await fetch(channelUrl, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": "CONSENT=PENDING+999"
      }
    });

    if (!res.ok) {
      throw new Error(`YouTube responded with status ${res.status}`);
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    const channelName = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : cleanHandle;

    // Extract description & bio
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    const description = descMatch ? descMatch[1] : "";

    // Extract emails from description
    const emails = extractEmails(`${html} ${description}`);

    // Extract external links (Instagram, Twitter, website)
    const links: Record<string, string> = { youtube: channelUrl };
    const igMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.-]+/i);
    if (igMatch) links.instagram = igMatch[0];

    const twMatch = html.match(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_.-]+/i);
    if (twMatch) links.twitter = twMatch[0];

    const ltMatch = html.match(/https?:\/\/(?:www\.)?linktr\.ee\/[a-zA-Z0-9_.-]+/i);
    if (ltMatch) links.linktree = ltMatch[0];

    // Extract subscriber count text
    const subMatch = html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/i) ||
                     html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/i);
    const subscribers = subMatch ? subMatch[1] : "Audience active";

    return {
      id: randomUUID(),
      source: "youtube",
      companyName: channelName,
      contactName: cleanHandle,
      headline: `YouTube Creator (${subscribers})`,
      emailCandidates: emails,
      phone: extractPhoneFromText(description),
      websiteUrl: links.linktree || channelUrl,
      socialUrls: links,
      signalData: {
        platform: "youtube",
        subscribers,
        descriptionSnippet: description.slice(0, 300)
      },
      discoveredAt: new Date().toISOString()
    };
  } catch (err) {
    // Structured resilient return
    return {
      id: randomUUID(),
      source: "youtube",
      companyName: cleanHandle,
      contactName: cleanHandle,
      headline: `YouTube Creator (@${cleanHandle})`,
      emailCandidates: [],
      websiteUrl: channelUrl,
      socialUrls: { youtube: channelUrl },
      signalData: { platform: "youtube", error: (err as Error).message },
      discoveredAt: new Date().toISOString()
    };
  }
}

/**
 * Scrapes a public Instagram profile by username.
 */
export async function scrapeInstagramCreator(username: string): Promise<RawLead> {
  const cleanUsername = username.replace(/^@/, "").trim();
  const profileUrl = `https://www.instagram.com/${cleanUsername}/`;

  try {
    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const html = await res.text();

    // Extract title & description meta
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    const fullName = titleMatch ? titleMatch[1].split("(@")[0].trim() : cleanUsername;

    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
    const descText = descMatch ? descMatch[1] : "";

    // Extract emails from HTML and description
    const emails = extractEmails(`${descText} ${html}`);

    // Extract follower stats
    const followerCount = descText.split("Followers")[0]?.trim() || "Active Creator";

    return {
      id: randomUUID(),
      source: "instagram",
      companyName: fullName || cleanUsername,
      contactName: cleanUsername,
      headline: `Instagram Creator (${followerCount} Followers)`,
      emailCandidates: emails,
      phone: extractPhoneFromText(descText),
      websiteUrl: profileUrl,
      socialUrls: { instagram: profileUrl },
      signalData: {
        platform: "instagram",
        followers: followerCount,
        bioSnippet: descText.slice(0, 300)
      },
      discoveredAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      id: randomUUID(),
      source: "instagram",
      companyName: cleanUsername,
      contactName: cleanUsername,
      headline: `Instagram Creator (@${cleanUsername})`,
      emailCandidates: [],
      websiteUrl: profileUrl,
      socialUrls: { instagram: profileUrl },
      signalData: { platform: "instagram", error: (err as Error).message },
      discoveredAt: new Date().toISOString()
    };
  }
}

/**
 * Scrapes a public Linktree profile to extract creator bio links and contacts.
 */
export async function scrapeLinktreeCreator(username: string): Promise<RawLead> {
  const cleanUsername = username.replace(/^(?:https?:\/\/)?(?:www\.)?linktr\.ee\//i, "").replace(/^@/, "").trim();
  const url = `https://linktr.ee/${cleanUsername}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html,application/xhtml+xml"
      }
    });

    const html = await res.text();
    const emails = extractEmails(html);

    // Extract social destination links
    const socialUrls: Record<string, string> = { linktree: url };
    const matches = Array.from(html.matchAll(/href="(https:\/\/[^"]+)"/gi));
    for (const match of matches) {
      const link = match[1];
      if (link.includes("instagram.com")) socialUrls.instagram = link;
      if (link.includes("youtube.com")) socialUrls.youtube = link;
      if (link.includes("twitter.com") || link.includes("x.com")) socialUrls.twitter = link;
      if (link.includes("wa.me") || link.includes("whatsapp.com")) socialUrls.whatsapp = link;
    }

    return {
      id: randomUUID(),
      source: "linktree",
      companyName: cleanUsername,
      contactName: cleanUsername,
      headline: "Linktree Creator Profile",
      emailCandidates: emails,
      phone: extractPhoneFromText(html),
      websiteUrl: url,
      socialUrls,
      signalData: {
        platform: "linktree",
        totalLinksDiscovered: Object.keys(socialUrls).length
      },
      discoveredAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      id: randomUUID(),
      source: "linktree",
      companyName: cleanUsername,
      contactName: cleanUsername,
      headline: `Linktree Profile (${cleanUsername})`,
      emailCandidates: [],
      websiteUrl: url,
      socialUrls: { linktree: url },
      signalData: { platform: "linktree", error: (err as Error).message },
      discoveredAt: new Date().toISOString()
    };
  }
}

/**
 * Scrapes a public GitHub developer profile via public API.
 */
export async function scrapeGitHubCreator(username: string): Promise<RawLead> {
  const cleanUsername = username.replace(/^@/, "").trim();
  const url = `https://api.github.com/users/${cleanUsername}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "arcon-outbound-engine/1.0",
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!res.ok) {
      throw new Error(`GitHub API error ${res.status}`);
    }

    const data = await res.json() as {
      name?: string;
      bio?: string;
      company?: string;
      blog?: string;
      location?: string;
      email?: string;
      followers?: number;
      public_repos?: number;
      html_url?: string;
    };

    const emails: string[] = [];
    if (data.email) emails.push(data.email.toLowerCase().trim());
    if (data.bio) {
      emails.push(...extractEmails(data.bio));
    }

    let websiteUrl = data.blog ? data.blog.trim() : undefined;
    if (websiteUrl && !websiteUrl.startsWith("http")) {
      websiteUrl = `https://${websiteUrl}`;
    }

    return {
      id: randomUUID(),
      source: "github",
      companyName: data.company?.replace(/^@/, "") || data.name || cleanUsername,
      contactName: data.name || cleanUsername,
      headline: `GitHub Developer (${data.followers || 0} followers, ${data.public_repos || 0} repos)`,
      emailCandidates: Array.from(new Set(emails)),
      websiteUrl: websiteUrl || data.html_url,
      location: data.location ? { rawAddress: data.location } : undefined,
      socialUrls: {
        github: data.html_url || `https://github.com/${cleanUsername}`
      },
      signalData: {
        platform: "github",
        bio: data.bio,
        repos: data.public_repos,
        followers: data.followers
      },
      discoveredAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      id: randomUUID(),
      source: "github",
      companyName: cleanUsername,
      contactName: cleanUsername,
      headline: `GitHub User (@${cleanUsername})`,
      emailCandidates: [],
      websiteUrl: `https://github.com/${cleanUsername}`,
      socialUrls: { github: `https://github.com/${cleanUsername}` },
      signalData: { platform: "github", error: (err as Error).message },
      discoveredAt: new Date().toISOString()
    };
  }
}

/**
 * Universal B2C creator scraper routing across YouTube, Instagram, Linktree, and GitHub.
 */
export async function scrapeB2CCreator(
  platform: "youtube" | "instagram" | "linktree" | "github",
  identifier: string
): Promise<RawLead> {
  switch (platform) {
    case "youtube":
      return scrapeYouTubeCreator(identifier);
    case "instagram":
      return scrapeInstagramCreator(identifier);
    case "linktree":
      return scrapeLinktreeCreator(identifier);
    case "github":
      return scrapeGitHubCreator(identifier);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
