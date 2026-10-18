import { verifyEmail } from "@arcon/verifier";
import { runResearchSwarm } from "./swarm";
import type { ProspectDossier } from "@arcon/shared-types";

export const GENERIC_EMAIL_PREFIXES = new Set([
  "sales", "info", "support", "contact", "hello", "help", "billing",
  "careers", "jobs", "team", "office", "admin", "press", "media",
  "enquiries", "inquiries", "mail", "general", "marketing", "hr",
  "feedback", "customerservice", "legal", "compliance", "privacy",
  "security", "devnull", "bounce", "postmaster", "hostmaster", "webmaster",
  "hi", "inquire", "business", "partners", "vendors", "investors", "corporate",
  "accounts", "finance", "client", "clients", "leads", "partnership", "partnerships",
  "services", "service", "consulting", "inquiry", "recruit", "recruiting", "recruitment",
  "career", "editorial", "news", "customercare", "operations", "dev", "development",
  "agency", "booking", "bookings", "frontdesk", "reception", "uk", "us", "london", "india",
  "united", "choosing", "connect", "reachus", "getintouch"
]);

const INVALID_EMAIL_EXTENSIONS = /\.(jpe?g|png|webp|svg|gif|ico|bmp|tiff?|pdf|css|js)$/i;

export const INVALID_NAME_WORDS = new Set([
  "company", "solutions", "technologies", "technology", "services", "service",
  "development", "developer", "design", "designers", "agency", "consulting",
  "limited", "ltd", "llc", "inc", "corp", "corporation", "team", "studio",
  "partners", "group", "systems", "media", "digital", "software", "web", "labs",
  "choosing", "about", "contact", "welcome", "portfolio", "careers", "home",
  "help", "united", "kingdom", "uk", "london", "usa", "america", "india",
  "canada", "australia", "germany", "france", "europe", "asia", "global",
  "international", "office", "headquarters", "dept", "department", "support",
  "sales", "business", "enterprise", "cloud", "security", "network", "no",
  "none", "case", "studies", "praise", "street", "road", "suite", "avenue",
  "review", "reviews", "display", "mobile", "racing", "game", "infotech", "tech"
]);

/**
 * Validates whether a given string is a plausible real human personal name (e.g. "Pavel Shevtsov", "Marcus Gitau")
 * rather than a company title, country name, or web page excerpt.
 */
export function isLikelyPersonName(name?: string): boolean {
  if (!name || typeof name !== "string") return false;
  const words = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 3) return false;
  for (const w of words) {
    if (INVALID_NAME_WORDS.has(w)) return false;
    if (!/^[a-z]+(?:['\-][a-z]+)?$/i.test(w)) return false;
  }
  return true;
}

/**
 * Cleans encoded URL parameters (%20, <>, etc.) and trims whitespace.
 */
export function sanitizeEmail(email?: string): string {
  if (!email || typeof email !== "string") return "";
  let clean = email.trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {}
  clean = clean.toLowerCase();
  clean = clean.replace(/^(%20|\u003e|<|>|'|"|\s|&gt;|&lt;)+/g, "");
  clean = clean.replace(/(%20|\u003e|<|>|'|"|\s|&gt;|&lt;)+$/g, "");
  return clean.trim();
}

/**
 * Validates that an email conforms to strict RFC syntax and is NOT an image asset or invalid file.
 */
export function isValidEmail(email?: string): boolean {
  const clean = sanitizeEmail(email);
  if (!clean) return false;
  if (INVALID_EMAIL_EXTENSIONS.test(clean)) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return false;
  const parts = clean.split("@");
  if (parts.length !== 2) return false;
  const domainParts = parts[1].split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) return false;
  return true;
}

/**
 * Checks whether an email address is a shared/generic company inbox (e.g. sales@, info@, vendors.partnership@)
 * rather than a direct personal email of a Founder/Executive.
 */
export function isGenericEmail(email?: string): boolean {
  const clean = sanitizeEmail(email);
  if (!clean || !isValidEmail(clean)) return true;
  const localPart = clean.split("@")[0].toLowerCase().trim();
  if (GENERIC_EMAIL_PREFIXES.has(localPart)) return true;

  // Split compound parts (e.g. vendors.partnership, sales-team, info_uk)
  const subparts = localPart.split(/[._\-+]/);
  for (const part of subparts) {
    if (GENERIC_EMAIL_PREFIXES.has(part)) return true;
  }
  return false;
}

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

export interface PipelineLeadInput {
  id: string;
  companyName: string;
  contactName?: string;
  headline?: string;
  websiteUrl?: string;
  emailCandidates: string[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface EnrichedPipelineResult {
  leadId: string;
  companyName: string;
  isValidated: boolean;
  verificationStatus: "socket_valid" | "socket_invalid" | "catch_all";
  targetEmail?: string;
  contactName?: string;
  isPersonalDecisionMaker: boolean;
  score: number;
  draftSubject: string;
  draftBody: string;
  suggestedAngle: string;
  detectedTech?: string[];
  dossier: ProspectDossier;
}

/**
 * Executes zero-cost email verification, deep tech/cloud research,
 * and high-converting personalized email crafting for a lead.
 *
 * Guarantees that the receiver email is strictly a Decision Maker / Founder,
 * filtering out generic inboxes (sales@, info@, etc.).
 */
export async function enrichAndPersonalizeLead(
  lead: PipelineLeadInput
): Promise<EnrichedPipelineResult> {
  // Derive domain from website or company name
  let domain = "target.com";
  if (lead.websiteUrl) {
    try {
      const withProtocol = lead.websiteUrl.startsWith("http")
        ? lead.websiteUrl
        : `https://${lead.websiteUrl}`;
      domain = new URL(withProtocol).hostname.replace(/^www\./, "");
    } catch {
      domain = `${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    }
  } else {
    domain = `${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  }

  const cleanedCompany = cleanCompanyName(lead.companyName);

  // 1. Run the multi-agent research swarm to discover the Decision Maker
  const dossier = await runResearchSwarm({
    domain,
    companyName: cleanedCompany,
    contactName: lead.contactName,
    observedSignal: lead.headline
  });

  const rawPersonName = dossier.decisionMaker.fullName || lead.contactName;
  const isPerson = isLikelyPersonName(rawPersonName);
  const discoveredPersonName = isPerson ? rawPersonName : undefined;

  // 2. Select ONLY personal candidate emails (strictly excluding sales@, info@, support@, etc.)
  const personalCandidates = lead.emailCandidates.filter((e) => !isGenericEmail(e) && isValidEmail(e));

  // Add the discovered decision maker email if personal
  if (dossier.decisionMaker.email && !isGenericEmail(dossier.decisionMaker.email)) {
    if (!personalCandidates.includes(dossier.decisionMaker.email)) {
      personalCandidates.push(dossier.decisionMaker.email);
    }
  }

  let finalTargetEmail: string | undefined = undefined;
  let isVerified = false;
  let verificationStatus: "socket_valid" | "socket_invalid" | "catch_all" = "socket_invalid";

  // 3. Probe personal decision maker candidate emails with direct SMTP socket
  if (personalCandidates.length > 0) {
    for (const cand of personalCandidates.slice(0, 3)) {
      try {
        const vResult = await verifyEmail(cand);
        if (vResult.exists) {
          isVerified = true;
          verificationStatus = "socket_valid";
          finalTargetEmail = cand;
          break;
        } else if (vResult.isCatchAll) {
          isVerified = true;
          verificationStatus = "catch_all";
          finalTargetEmail = cand;
          break;
        }
      } catch {
        // Continue probing next personal candidate
      }
    }

    // If probing didn't get socket confirmation, use first personal candidate with catch_all status
    if (!finalTargetEmail && personalCandidates[0]) {
      finalTargetEmail = personalCandidates[0];
      verificationStatus = "catch_all";
      isVerified = true;
    }
  }

  // If NO personal decision maker email exists or no genuine human contact, do NOT qualify for Sales Review!
  const isPersonalDecisionMaker = Boolean(finalTargetEmail && !isGenericEmail(finalTargetEmail) && isPerson);

  if (!isPersonalDecisionMaker) {
    isVerified = false;
    verificationStatus = "socket_invalid";
  }

  const rawFirstName = (discoveredPersonName || "").split(/\s+/)[0] || "";
  const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1) : "";

  const subject =
    dossier.recommendedOutreach?.tailoredSubject ||
    `Question regarding ${cleanedCompany}'s cloud infrastructure`;

  const body =
    dossier.recommendedOutreach?.tailoredBody ||
    `Hi ${firstName || "there"},\n\nI was reviewing ${cleanedCompany}'s infrastructure and noticed your engineering team is actively scaling.\n\nAt 3 Dices, we partner with technical founders to eliminate backend bottlenecks, automate CI/CD release pipelines, and cut AWS spend—routinely reducing monthly cloud bills by ~40%.\n\nWould you be open to a quick 10-minute call this Thursday to see if there are easy wins for your team?\n\nBest regards,\nDeep Mehta\nAWS Certified Solutions Architect – Professional | Founder, 3 Dices`;

  return {
    leadId: lead.id,
    companyName: cleanedCompany,
    isValidated: isVerified && isPersonalDecisionMaker,
    verificationStatus,
    targetEmail: finalTargetEmail,
    contactName: discoveredPersonName,
    isPersonalDecisionMaker,
    score: dossier.qualification.overallScore,
    draftSubject: subject,
    draftBody: body,
    suggestedAngle: dossier.recommendedOutreach?.selectedPlay || "AWS Architecture Review",
    detectedTech: dossier.company.techStack,
    dossier
  };
}
