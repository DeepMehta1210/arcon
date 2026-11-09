import { auditCloudInfrastructure, type CloudInfrastructureAudit } from "./cloud-audit";
import { verifyEmail, type SmtpVerificationResult } from "@arcon/verifier";
import type { RawLead } from "@arcon/shared-types";
import { isGenericEmail, isLikelyPersonName, isValidEmail, sanitizeEmail } from "./pipeline-engine";

export interface CollectedLeadRawData {
  leadId: string;
  enrichedLead: RawLead;
  
  // 1. Company Intel
  company: {
    name: string;
    domain: string;
    websiteUrl?: string;
    description: string;
    techStack: string[];
    companyLinkedinUrl?: string;
    phone?: string;
    location?: {
      city?: string;
      country?: string;
      rawAddress?: string;
    };
  };

  // 2. Cloud & Infrastructure Intel
  cloudInfrastructure: CloudInfrastructureAudit;

  // 3. Decision Maker Intel
  decisionMaker: {
    fullName: string;
    role: string;
    personalLinkedinUrl?: string;
    primaryEmail?: string;
    emailVerificationStatus: "valid" | "catch_all" | "unverified";
    emailCandidates: string[];
    phone?: string;
    isPersonalProfile: boolean;
  };

  // 4. Intent & Why-Now Trigger
  trigger: {
    source: string;
    headline?: string;
    jobTitle?: string;
    signalType: "hiring" | "cloud_pain" | "directory" | "other";
    detectedAt: string;
    rawMetadata?: Record<string, unknown>;
  };
}

const TECH_KEYWORDS = [
  "React", "Next.js", "Vue", "TypeScript", "Python", "Go", "Node.js", "Ruby",
  "PostgreSQL", "MySQL", "Redis", "MongoDB", "DynamoDB", "Aurora",
  "Docker", "Kubernetes", "EKS", "ECS", "Terraform", "Serverless", "Lambda",
  "GitHub Actions", "GitLab CI", "Prometheus", "Grafana", "Kafka",
  "Amazon Bedrock", "OpenAI", "Anthropic", "Claude", "LangChain", "LlamaIndex", "FastAPI"
];

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function extractDomainFromUrl(url?: string): string {
  if (!url) return "";
  try {
    const withProtocol = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

/**
 * Extracts structured data from Schema.org JSON-LD tags.
 */
function parseSchemaOrgJsonLd(html: string): {
  organizationName?: string;
  telephone?: string;
  founders: Array<{ name: string; jobTitle?: string; linkedinUrl?: string }>;
  companyLinkedinUrl?: string;
  address?: { city?: string; country?: string; raw?: string };
} {
  const result: ReturnType<typeof parseSchemaOrgJsonLd> = {
    founders: []
  };

  const scriptMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    try {
      const data = JSON.parse(match[1].trim());
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;

        // Extract company telephone
        if (item.telephone && typeof item.telephone === "string" && !result.telephone) {
          result.telephone = item.telephone.trim();
        }

        // Extract organization name
        if ((item["@type"] === "Organization" || item["@type"] === "Corporation") && item.name) {
          result.organizationName = item.name.toString().trim();
        }

        // Extract social profiles from sameAs
        if (Array.isArray(item.sameAs)) {
          for (const url of item.sameAs) {
            if (typeof url === "string" && url.includes("linkedin.com/company/") && !result.companyLinkedinUrl) {
              result.companyLinkedinUrl = url.split("?")[0];
            }
          }
        }

        // Extract Founders / Executives
        const founderFields = [item.founder, item.founders, item.employee, item.alumni].filter(Boolean);
        for (const f of founderFields) {
          const people = Array.isArray(f) ? f : [f];
          for (const person of people) {
            if (person && typeof person === "object" && person.name) {
              const name = person.name.toString().trim();
              const role = person.jobTitle?.toString().trim() || "Founder / Executive";
              const sameAs = Array.isArray(person.sameAs) ? person.sameAs[0] : person.sameAs;
              const linkedinUrl = typeof sameAs === "string" && sameAs.includes("linkedin.com/in/") ? sameAs.split("?")[0] : undefined;

              if (name && isLikelyPersonName(name)) {
                result.founders.push({ name, jobTitle: role, linkedinUrl });
              }
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  return result;
}

/**
 * Step 2 Core Engine:
 * Collects deep company intelligence, cloud infrastructure metrics, and decision-maker profiles,
 * and persists them directly into PostgreSQL (without drafting emails).
 */
export async function collectLeadRawData(lead: RawLead): Promise<CollectedLeadRawData> {
  const cleanDomain = extractDomainFromUrl(lead.websiteUrl) || `${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.com`;
  const url = cleanDomain.startsWith("http") ? cleanDomain : `https://${cleanDomain}`;

  // 1. Parallel Cloud Infrastructure & Security Audit
  const cloudAuditPromise = auditCloudInfrastructure({
    domain: cleanDomain,
    sourceSignal: lead.headline,
    jobTitle: (lead as any).jobTitle
  });

  // 2. Fetch Homepage (Stream first 60KB for ultra-fast throughput)
  let html = "";
  let headers: Record<string, string> = {};
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(4500)
    });
    headers = Object.fromEntries(res.headers.entries());
    html = await res.text();
  } catch {
    // Continue with DNS & signal data if website is slow or blocking
  }

  // Parse Schema.org JSON-LD
  const schemaIntel = parseSchemaOrgJsonLd(html);

  // Extract meta title & description
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : lead.companyName;

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : lead.headline || "Technology company";

  // Deep crawl team / about subpages if decision maker not in JSON-LD
  let extendedHtml = html;
  const subpageUrls = new Set<string>();
  const subpageMatches = html.matchAll(/href=["']((?:https?:\/\/[^"'\s>]+)?\/(?:about|about-us|team|people|our-team|leadership|who-we-are|contact|contact-us))["']/gi);
  for (const m of subpageMatches) {
    try {
      const resolved = new URL(m[1], url).toString();
      if (new URL(resolved).hostname === new URL(url).hostname) {
        subpageUrls.add(resolved);
      }
    } catch {}
    if (subpageUrls.size >= 2) break;
  }

  for (const subUrl of subpageUrls) {
    try {
      const subRes = await fetch(subUrl, {
        headers: { "User-Agent": BROWSER_USER_AGENT },
        signal: AbortSignal.timeout(2200)
      });
      if (subRes.ok) {
        extendedHtml += " " + (await subRes.text());
      }
    } catch {}
  }

  // 3. Extract LinkedIn Profiles (Personal & Company)
  let companyLinkedinUrl = schemaIntel.companyLinkedinUrl || lead.socialUrls?.linkedin;
  let personalLinkedinUrl: string | undefined = schemaIntel.founders[0]?.linkedinUrl;
  let decisionMakerName: string | undefined = schemaIntel.founders[0]?.name || lead.contactName;
  let decisionMakerRole: string | undefined = schemaIntel.founders[0]?.jobTitle;

  // Search personal LinkedIn profile links in HTML
  if (!personalLinkedinUrl) {
    const personalLinkedInMatches = extendedHtml.matchAll(/https?:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/gi);
    for (const match of personalLinkedInMatches) {
      personalLinkedinUrl = match[0].split("?")[0];
      if (!decisionMakerName) {
        const slug = match[1].replace(/-[a-z0-9]+$/, "").replace(/[-_]+/g, " ");
        const candidate = slug.replace(/\b\w/g, (c) => c.toUpperCase()).trim();
        if (isLikelyPersonName(candidate)) {
          decisionMakerName = candidate;
        }
      }
      break;
    }
  }

  // Search company LinkedIn if not yet found
  if (!companyLinkedinUrl) {
    const compMatch = extendedHtml.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_-]+/i);
    if (compMatch) {
      companyLinkedinUrl = compMatch[0].split("?")[0];
    }
  }

  // Scan team headings for Founder / CTO / VP / Director
  if (!decisionMakerName) {
    const execPatterns = [
      /<(?:h2|h3|h4|h5|strong|b|span)[^>]*>([A-Z][a-z]+ [A-Z][a-z]+)<\/(?:h2|h3|h4|h5|strong|b|span)>\s*<(?:p|span|div|small)[^>]*>\s*(?:Founder|Co-Founder|CEO|CTO|Managing Director|Head of Engineering|VP of Engineering|Technical Director)\b/i,
      /(?:Founder|Co-Founder|CEO|CTO|Managing Director|Head of Engineering|VP of Engineering)\s*(?:[-–|:]|\sat\s)\s*([A-Z][a-z]+ [A-Z][a-z]+)/i,
      /([A-Z][a-z]+ [A-Z][a-z]+)\s*(?:[-–|:]|\s*,\s*|\s*—\s*)\s*(?:Founder|Co-Founder|CEO|CTO|Managing Director|Head of Engineering|VP of Engineering|Technical Director)\b/i
    ];
    for (const pattern of execPatterns) {
      const match = extendedHtml.match(pattern);
      if (match && match[1] && isLikelyPersonName(match[1])) {
        decisionMakerName = match[1].trim();
        break;
      }
    }
  }

  // Fallback decision maker identity if not publicly indexed
  const isPersonalProfile = Boolean(decisionMakerName && isLikelyPersonName(decisionMakerName));
  const finalFullName = isPersonalProfile ? decisionMakerName! : `${lead.companyName} Leadership`;
  const finalRole = decisionMakerRole || (lead.headline?.includes("DevOps") ? "Engineering Lead" : "Founder & Technical Director");

  // 4. Extract Emails & Generate Permutations
  const scrapedEmails = Array.from(extendedHtml.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g))
    .map((m) => m[0].toLowerCase())
    .filter((e) => !e.endsWith(".png") && !e.includes("example.com") && !e.includes("sentry"));

  const candidateEmails: string[] = [];
  if (isPersonalProfile) {
    const parts = finalFullName.toLowerCase().split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    if (first && last) {
      candidateEmails.push(`${first}@${cleanDomain}`);
      candidateEmails.push(`${first}.${last}@${cleanDomain}`);
      candidateEmails.push(`${first[0]}${last}@${cleanDomain}`);
      candidateEmails.push(`${first}_${last}@${cleanDomain}`);
    } else if (first) {
      candidateEmails.push(`${first}@${cleanDomain}`);
    }
  }

  // Prioritize existing lead emails and personal scraped emails
  for (const email of [...(lead.emailCandidates || []), ...scrapedEmails]) {
    const clean = sanitizeEmail(email);
    if (clean && !candidateEmails.includes(clean) && !isGenericEmail(clean)) {
      candidateEmails.unshift(clean);
    }
  }

  // 5. Fast Email Deliverability Probe
  let selectedEmail = candidateEmails[0];
  let verificationStatus: "valid" | "catch_all" | "unverified" = "unverified";
  if (selectedEmail) {
    try {
      const vResult: SmtpVerificationResult = await verifyEmail(selectedEmail);
      if (vResult.exists && !vResult.isCatchAll) {
        verificationStatus = "valid";
      } else if (vResult.isCatchAll) {
        verificationStatus = "catch_all";
      }
    } catch {
      // Leave unverified
    }
  }

  // 6. Complete Cloud Audit
  const cloudAudit = await cloudAuditPromise;

  // Extract page tech keywords
  const pageTech: string[] = [];
  for (const tech of TECH_KEYWORDS) {
    if (new RegExp(`\\b${tech}\\b`, "i").test(extendedHtml)) {
      pageTech.push(tech);
    }
  }
  const fullTechStack = Array.from(new Set([...cloudAudit.detectedTech, ...pageTech]));

  // 7. Enriched Lead Object for Database Upsert
  const enrichedLead: RawLead = {
    ...lead,
    companyName: lead.companyName,
    contactName: finalFullName,
    websiteUrl: lead.websiteUrl || url,
    emailCandidates: candidateEmails.length > 0 ? candidateEmails : (lead.emailCandidates || []),
    phone: schemaIntel.telephone || lead.phone,
    socialUrls: {
      ...(lead.socialUrls || {}),
      ...(companyLinkedinUrl ? { linkedin: companyLinkedinUrl } : {}),
      ...(personalLinkedinUrl ? { personalLinkedin: personalLinkedinUrl } : {})
    },
    signalData: {
      ...(lead.signalData || {}),
      cloudAudit,
      decisionMaker: {
        fullName: finalFullName,
        role: finalRole,
        linkedInUrl: personalLinkedinUrl,
        email: selectedEmail,
        emailVerification: { status: verificationStatus }
      }
    }
  };

  return {
    leadId: lead.id,
    enrichedLead,
    company: {
      name: lead.companyName,
      domain: cleanDomain,
      websiteUrl: lead.websiteUrl || url,
      description,
      techStack: fullTechStack,
      companyLinkedinUrl,
      phone: schemaIntel.telephone || lead.phone,
      location: lead.location
    },
    cloudInfrastructure: cloudAudit,
    decisionMaker: {
      fullName: finalFullName,
      role: finalRole,
      personalLinkedinUrl,
      primaryEmail: selectedEmail,
      emailVerificationStatus: verificationStatus,
      emailCandidates: candidateEmails,
      phone: schemaIntel.telephone || lead.phone,
      isPersonalProfile
    },
    trigger: {
      source: lead.source,
      headline: lead.headline,
      jobTitle: (lead as any).jobTitle,
      signalType: lead.source.includes("job") ? "hiring" : "cloud_pain",
      detectedAt: lead.discoveredAt || new Date().toISOString(),
      rawMetadata: lead.signalData
    }
  };
}
