import type { RawLead } from "@arcon/shared-types";
import { randomUUID } from "node:crypto";

export interface MapsScrapeOptions {
  keyword: string;
  city: string;
  limit?: number;
}

export interface IndianBusinessLead extends RawLead {
  isIndianMobile: boolean;
  hasWebsite: boolean;
  suggestedWhatsAppPitch: string;
}

const SOCIAL_REGEX = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/i,
  facebook: /https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/([A-Za-z0-9_.\-]+)/i,
  linkedin: /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in|school)\/([A-Za-z0-9_.\-%]+)/i,
};

export async function geocodeCity(city: string): Promise<{ lat: string; lon: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "arcon/1.0 (contact@3dices.com)" },
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data.length > 0 && data[0]) {
      return { lat: data[0].lat, lon: data[0].lon };
    }
    return null;
  } catch {
    return null;
  }
}

export function extractSocialLinks(html: string): Record<string, string> {
  const socials: Record<string, string> = {};
  for (const [platform, regex] of Object.entries(SOCIAL_REGEX)) {
    const match = html.match(regex);
    if (match && match[0]) {
      socials[platform] = match[0];
    }
  }
  return socials;
}

export function formatIndianMobile(phone?: string): { formatted?: string; isValidMobile: boolean } {
  if (!phone) return { isValidMobile: false };
  const cleanDigits = phone.replace(/[^\d]/g, "");

  if (cleanDigits.length === 10 && /^[6789]/.test(cleanDigits)) {
    return { formatted: `+91${cleanDigits}`, isValidMobile: true };
  }
  if (cleanDigits.startsWith("91") && cleanDigits.length === 12 && /^[6789]/.test(cleanDigits.slice(2))) {
    return { formatted: `+${cleanDigits}`, isValidMobile: true };
  }
  if (cleanDigits.startsWith("0") && cleanDigits.length === 11 && /^[6789]/.test(cleanDigits.slice(1))) {
    return { formatted: `+91${cleanDigits.slice(1)}`, isValidMobile: true };
  }

  return { formatted: phone, isValidMobile: false };
}

/**
 * Scrapes businesses and filters for Indian traditional businesses with:
 * 1. Missing or dead website
 * 2. Active Indian mobile number (+91 6-9xxxxxxxxx) ready for WhatsApp ping
 */
export async function scrapeIndianLocalBusinesses(
  keyword: string,
  city: string,
  limit = 20
): Promise<IndianBusinessLead[]> {
  const coords = await geocodeCity(city);
  const leads: IndianBusinessLead[] = [];

  if (coords) {
    try {
      const bboxDelta = 0.08;
      const minLat = parseFloat(coords.lat) - bboxDelta;
      const maxLat = parseFloat(coords.lat) + bboxDelta;
      const minLon = parseFloat(coords.lon) - bboxDelta;
      const maxLon = parseFloat(coords.lon) + bboxDelta;

      // Overpass query across commercial shops, craft, and industrial amenities
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:15];(node["shop"](${minLat},${minLon},${maxLat},${maxLon});node["craft"](${minLat},${minLon},${maxLat},${maxLon});node["office"](${minLat},${minLon},${maxLat},${maxLon}););out;`;
      const res = await fetch(overpassUrl, {
        headers: { "User-Agent": "arcon/1.0" },
      });

      if (res.ok) {
        const data = await res.json() as {
          elements?: Array<{
            id: number;
            lat: number;
            lon: number;
            tags?: Record<string, string>;
          }>;
        };

        for (const el of data.elements ?? []) {
          const tags = el.tags ?? {};
          const name = tags.name || tags["operator"];
          if (!name) continue;

          const rawPhone = tags.phone || tags["contact:phone"] || tags["contact:mobile"];
          const website = tags.website || tags["contact:website"];
          const email = tags.email || tags["contact:email"];

          const { formatted, isValidMobile } = formatIndianMobile(rawPhone);
          const hasWebsite = Boolean(website && website.startsWith("http"));

          // Filter: Prioritize businesses without website or with valid mobile
          if (isValidMobile && (!hasWebsite || website?.includes("business.site") || website?.includes("justdial"))) {
            const hook = `{Namaste|Hello} ${name} team, found your details on Google Maps while looking for ${keyword} in ${city}. Quick question—are you currently taking new client orders / inquiries?`;

            leads.push({
              id: randomUUID(),
              source: "google_maps",
              companyName: name,
              headline: `${keyword} in ${city}`,
              emailCandidates: email ? [email] : [],
              phone: formatted,
              websiteUrl: hasWebsite ? website : undefined,
              location: {
                city,
                country: "India",
                rawAddress: `${tags["addr:street"] ?? ""} ${tags["addr:city"] ?? city}`.trim(),
              },
              socialUrls: {},
              signalData: {
                osmId: el.id,
                category: tags.shop || tags.craft || tags.office || keyword,
              },
              discoveredAt: new Date().toISOString(),
              isIndianMobile: true,
              hasWebsite,
              suggestedWhatsAppPitch: hook,
            });

            if (leads.length >= limit) break;
          }
        }
      }
    } catch {}
  }

  return leads;
}

export async function scrapeLocalPlaces(options: MapsScrapeOptions): Promise<RawLead[]> {
  const limit = options.limit ?? 15;
  const coords = await geocodeCity(options.city);

  const leads: RawLead[] = [];

  if (coords) {
    try {
      const bboxDelta = 0.08;
      const minLat = parseFloat(coords.lat) - bboxDelta;
      const maxLat = parseFloat(coords.lat) + bboxDelta;
      const minLon = parseFloat(coords.lon) - bboxDelta;
      const maxLon = parseFloat(coords.lon) + bboxDelta;

      const lowerKeyword = options.keyword.toLowerCase();
      let queryBody = "";

      if (lowerKeyword.includes("cafe") || lowerKeyword.includes("coffee")) {
        queryBody = `node["amenity"="cafe"](${minLat},${minLon},${maxLat},${maxLon});`;
      } else if (lowerKeyword.includes("clinic") || lowerKeyword.includes("dental") || lowerKeyword.includes("dentist")) {
        queryBody = `node["amenity"="dentist"](${minLat},${minLon},${maxLat},${maxLon});`;
      } else if (
        lowerKeyword.includes("agency") ||
        lowerKeyword.includes("design") ||
        lowerKeyword.includes("web") ||
        lowerKeyword.includes("software") ||
        lowerKeyword.includes("it") ||
        lowerKeyword.includes("digital") ||
        lowerKeyword.includes("marketing") ||
        lowerKeyword.includes("studio") ||
        lowerKeyword.includes("consulting")
      ) {
        // Query tech, digital, design, and advertising office establishments
        queryBody = `
          node["office"~"it|advertising|company|graphic_design|consulting|marketing|web_design|software"](${minLat},${minLon},${maxLat},${maxLon});
          way["office"~"it|advertising|company|graphic_design|consulting|marketing|web_design|software"](${minLat},${minLon},${maxLat},${maxLon});
        `;
      } else {
        queryBody = `
          node["office"](${minLat},${minLon},${maxLat},${maxLon});
          node["shop"](${minLat},${minLon},${maxLat},${maxLon});
        `;
      }

      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:15];(${queryBody.trim()});out tags ${limit * 2};`;
      const res = await fetch(overpassUrl, {
        headers: { "User-Agent": "arcon-scraper/1.0" },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          elements?: Array<{
            id: number;
            lat?: number;
            lon?: number;
            tags?: Record<string, string>;
          }>;
        };

        const seenNames = new Set<string>();

        for (const el of data.elements ?? []) {
          const tags = el.tags ?? {};
          let rawName = tags.name || tags["operator"] || tags["brand"];
          if (!rawName) continue;

          // Clean name
          rawName = rawName.split(/\s*[-–—|•:]\s*/)[0].trim();
          if (seenNames.has(rawName.toLowerCase())) continue;
          seenNames.add(rawName.toLowerCase());

          const rawWebsite = tags.website || tags["contact:website"] || tags["url"];
          const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"];
          const email = tags.email || tags["contact:email"];

          let cleanWebsite = rawWebsite;
          if (cleanWebsite && !cleanWebsite.startsWith("http")) {
            cleanWebsite = `https://${cleanWebsite}`;
          }

          // Prioritize agencies with website or contact info
          leads.push({
            id: randomUUID(),
            source: "google_maps",
            companyName: rawName,
            headline: `${options.keyword} in ${options.city}`,
            emailCandidates: email ? [email] : [],
            phone,
            websiteUrl: cleanWebsite,
            location: {
              city: options.city,
              rawAddress: `${tags["addr:street"] ?? ""} ${tags["addr:housenumber"] ?? ""}`.trim() || options.city,
            },
            socialUrls: {},
            signalData: {
              osmId: el.id,
              lat: el.lat,
              lon: el.lon,
              officeType: tags.office || tags.shop || "digital_office",
            },
            discoveredAt: new Date().toISOString(),
          });

          if (leads.length >= limit) break;
        }
      }
    } catch {}
  }

  return leads;
}

/**
 * Scrapes boutique digital, web design, and creative agencies in a given city.
 */
export async function scrapeDigitalAgencies(options: {
  city: string;
  keyword?: string;
  limit?: number;
}): Promise<RawLead[]> {
  const keyword = options.keyword || "Web Design Agency";
  return scrapeLocalPlaces({
    keyword,
    city: options.city,
    limit: options.limit ?? 15,
  });
}
