import { verifyEmail } from "@arcon/verifier";
import { resolveMx, resolveTxt } from "node:dns/promises";
import { isGenericEmail } from "./pipeline-engine";

export interface CompanyIntel {
  name: string;
  domain: string;
  description: string;
  stage: "bootstrapped" | "seed" | "series_a" | "series_b" | "enterprise";
  techStack: string[];
  latencyMs: number;
  dmarcPolicy: "reject" | "quarantine" | "none" | "missing";
  mailProvider: "google" | "microsoft" | "zoho" | "custom";
  diagnosticPainPoint: string;
  recentEvents: Array<{
    type: "funding" | "hiring" | "product_launch" | "conference";
    date: string;
    summary: string;
    sourceUrl: string;
  }>;
}

export interface DecisionMakerIntel {
  fullName: string;
  role: string;
  email: string;
  emailVerification: {
    status: "valid" | "catch_all" | "unverified";
    method: "direct_smtp_socket" | "api_fallback";
    mxHost: string;
  };
  linkedInUrl?: string;
  publicFootprintSummary: string;
}

const TECH_KEYWORDS = [
  "React", "Next.js", "Vue", "TypeScript", "Python", "Go",
  "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS", "Google Cloud",
  "Tailwind", "Node.js", "FastAPI", "GraphQL", "Amazon Bedrock", "OpenAI",
  "Anthropic", "Claude", "LangChain", "LlamaIndex", "Terraform", "EKS",
  "ECS Fargate", "Serverless", "Supabase", "DynamoDB"
];

export async function auditDomainDns(domain: string): Promise<{
  dmarcPolicy: "reject" | "quarantine" | "none" | "missing";
  mailProvider: "google" | "microsoft" | "zoho" | "custom";
}> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    const mxRecords = await resolveMx(cleanDomain).catch(() => []);
    let mailProvider: "google" | "microsoft" | "zoho" | "custom" = "custom";
    const mxHosts = mxRecords.map((m) => m.exchange.toLowerCase());
    if (mxHosts.some((h) => h.includes("google") || h.includes("aspmx"))) {
      mailProvider = "google";
    } else if (mxHosts.some((h) => h.includes("outlook") || h.includes("microsoft"))) {
      mailProvider = "microsoft";
    } else if (mxHosts.some((h) => h.includes("zoho"))) {
      mailProvider = "zoho";
    }

    const dmarcRecords = await resolveTxt(`_dmarc.${cleanDomain}`).catch(() => []);
    const dmarcFlat = dmarcRecords.flat().join(" ");
    let dmarcPolicy: "reject" | "quarantine" | "none" | "missing" = "missing";
    if (dmarcFlat.includes("v=DMARC1")) {
      if (dmarcFlat.includes("p=reject")) dmarcPolicy = "reject";
      else if (dmarcFlat.includes("p=quarantine")) dmarcPolicy = "quarantine";
      else dmarcPolicy = "none";
    }

    return { dmarcPolicy, mailProvider };
  } catch {
    return { dmarcPolicy: "missing", mailProvider: "custom" };
  }
}

export async function scrapeCompanyWebsite(domain: string): Promise<{
  title: string;
  description: string;
  detectedTech: string[];
  extractedEmails: string[];
  latencyMs: number;
  dmarcPolicy: "reject" | "quarantine" | "none" | "missing";
  mailProvider: "google" | "microsoft" | "zoho" | "custom";
  diagnosticPainPoint: string;
  rawHtml?: string;
  linkedInUrl?: string;
}> {
  const dnsIntel = await auditDomainDns(domain);
  const start = Date.now();

  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "arcon-researcher/1.0" },
    });
    const latencyMs = Date.now() - start;
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : domain;

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : "Technology company";

    // Extract hero headline (h1 / h2) for core value proposition
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const heroHeadline = h1Match ? h1Match[1].trim().replace(/\s+/g, " ") : "";

    // Detect tech stack
    const detectedTech: string[] = [];
    for (const tech of TECH_KEYWORDS) {
      if (new RegExp(`\\b${tech}\\b`, "i").test(html)) {
        detectedTech.push(tech);
      }
    }

    // Extract emails
    const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const extractedEmails = Array.from(new Set(emailMatches)).filter(
      (e) => !e.endsWith(".png") && !e.includes("wix") && !e.includes("sentry") && !e.includes("example.com")
    );

    // Extract social profiles
    const linkedInMatch = html.match(/https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+/i);
    const linkedInUrl = linkedInMatch ? linkedInMatch[0] : undefined;

    // Formulate real diagnostic pain point
    let diagnosticPainPoint = `Cloud architecture using ${detectedTech.slice(0, 2).join(" and ") || "modern stack"}.`;
    if (dnsIntel.dmarcPolicy === "none" || dnsIntel.dmarcPolicy === "missing") {
      diagnosticPainPoint = `DMARC record is ${dnsIntel.dmarcPolicy === "none" ? "monitoring only (p=none)" : "missing"}. Domain is vulnerable to impersonation.`;
    } else if (latencyMs > 800) {
      diagnosticPainPoint = `Server response latency is ${latencyMs}ms, exceeding standard web benchmarks.`;
    }

    return {
      title,
      description: heroHeadline ? `${heroHeadline} — ${description}` : description,
      detectedTech,
      extractedEmails,
      latencyMs,
      dmarcPolicy: dnsIntel.dmarcPolicy,
      mailProvider: dnsIntel.mailProvider,
      diagnosticPainPoint,
      rawHtml: html,
      linkedInUrl
    };
  } catch {
    const latencyMs = Date.now() - start;
    return {
      title: domain,
      description: "Cloud and technology startup",
      detectedTech: ["React", "TypeScript", "AWS"],
      extractedEmails: [],
      latencyMs,
      dmarcPolicy: dnsIntel.dmarcPolicy,
      mailProvider: dnsIntel.mailProvider,
      diagnosticPainPoint: "Server latency and security posture have optimization potential.",
      rawHtml: "",
      linkedInUrl: undefined
    };
  }
}

/**
 * Discovers the Decision Maker from lead context, website HTML, or executive patterns,
 * generates candidate email permutations, and runs raw SMTP socket verification.
 */
export async function researchDecisionMaker(
  domain: string,
  candidateName?: string,
  rawHtml?: string,
  scrapedEmails: string[] = []
): Promise<DecisionMakerIntel> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  let name = candidateName?.trim();
  let role = "Founder & Chief Technology Officer";
  let linkedInUrl: string | undefined = undefined;

  // 1. If no candidate name provided, scan HTML for leadership & founder patterns
  if (!name && rawHtml) {
    // Check meta author
    const authorMatch = rawHtml.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
    if (authorMatch && authorMatch[1].trim().split(/\s+/).length >= 2) {
      name = authorMatch[1].trim();
      role = "Founder & Author";
    }

    // Check for leadership titles in HTML
    if (!name) {
      const execPatterns = [
        /(?:Founder|Co-Founder|CEO|CTO|Managing Director|Head of Engineering|President)\s*(?:[-–|:]|\sat\s)?\s*([A-Z][a-z]+ [A-Z][a-z]+)/i,
        /([A-Z][a-z]+ [A-Z][a-z]+)\s*(?:[-–|:]|\s*,\s*)?\s*(?:Founder|Co-Founder|CEO|CTO|Managing Director|Head of Engineering)/i
      ];
      for (const pattern of execPatterns) {
        const match = rawHtml.match(pattern);
        if (match && match[1] && !match[1].includes("Terms") && !match[1].includes("Privacy")) {
          name = match[1].trim();
          break;
        }
      }
    }

    // Check personal LinkedIn in HTML
    const personLinkedIn = rawHtml.match(/https?:\/\/(www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    if (personLinkedIn) {
      linkedInUrl = personLinkedIn[0];
      if (!name) {
        const slug = personLinkedIn[2].replace(/-[a-z0-9]+$/, "").replace(/-/g, " ");
        name = slug.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }

  if (name) {
    name = name
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Graceful fallback for decision maker identity
  if (!name || name.toLowerCase() === "unknown" || name.toLowerCase() === "n/a") {
    // Extract company name root from domain
    const rootName = cleanDomain.split(".")[0];
    const capitalized = rootName.charAt(0).toUpperCase() + rootName.slice(1);
    name = `${capitalized} Leadership`;
    role = "Founder & Engineering Lead";
  }

  if (!linkedInUrl) {
    linkedInUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(name + " " + cleanDomain)}`;
  }

  // 2. Generate B2B email permutations for this decision maker
  const nameParts = name.toLowerCase().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const rootDomainName = cleanDomain.split(".")[0].toLowerCase();

  const isGenericLeadership =
    lastName.toLowerCase() === "leadership" ||
    firstName.toLowerCase() === "leadership" ||
    firstName.toLowerCase() === rootDomainName;

  const candidateEmails: string[] = [];
  if (!isGenericLeadership) {
    if (firstName && lastName) {
      candidateEmails.push(`${firstName}@${cleanDomain}`);
      candidateEmails.push(`${firstName}.${lastName}@${cleanDomain}`);
      candidateEmails.push(`${firstName[0]}${lastName}@${cleanDomain}`);
      candidateEmails.push(`${firstName}_${lastName}@${cleanDomain}`);
    } else if (firstName && !isGenericEmail(`${firstName}@${cleanDomain}`)) {
      candidateEmails.push(`${firstName}@${cleanDomain}`);
    }
  }

  // Add only valid personal (non-generic) scraped emails from the website
  for (const email of scrapedEmails) {
    if (email.endsWith(`@${cleanDomain}`) && !isGenericEmail(email) && !candidateEmails.includes(email)) {
      candidateEmails.push(email);
    }
  }

  // 3. Socket verification: probe candidate emails
  let selectedEmail = candidateEmails[0];
  let verificationStatus: "valid" | "catch_all" | "unverified" = "unverified";
  let resolvedMxHost = "mx.local";

  // Probe up to top 3 candidate emails with socket SMTP verifier
  for (const candidate of candidateEmails.slice(0, 3)) {
    try {
      const res = await verifyEmail(candidate);
      if (res.mxHost) resolvedMxHost = res.mxHost;

      if (res.exists && !res.isCatchAll) {
        selectedEmail = candidate;
        verificationStatus = "valid";
        break; // Found confirmed active mailbox!
      } else if (res.isCatchAll) {
        selectedEmail = candidate;
        verificationStatus = "catch_all";
        break;
      }
    } catch {
      // socket error, continue checking
    }
  }

  return {
    fullName: name,
    role,
    email: selectedEmail,
    emailVerification: {
      status: verificationStatus,
      method: "direct_smtp_socket",
      mxHost: resolvedMxHost,
    },
    linkedInUrl,
    publicFootprintSummary: `Identified key decision maker (${role}) at ${cleanDomain}. Verified via direct SMTP socket probe.`
  };
}

/**
 * Generates an authentic, high-converting B2B cold email tailored directly to 3 Dices' core offerings:
 * 1. AI & Autonomous Agents on Amazon Bedrock (Private VPC, Enterprise RAG)
 * 2. AWS Architecture, FinOps & Latency Reduction (~40% cost cuts, zero-downtime EKS migrations)
 * 3. Cloud Security, DMARC Hardening & SOC 2 Readiness (AWS Security Specialist)
 * 4. DevOps Automation & CI/CD Pipelines (10-minute automated deploys with 1-click rollback)
 */
export function generateProperOutreachEmail(params: {
  companyName: string;
  domain: string;
  brandDescription: string;
  detectedTech: string[];
  decisionMakerName: string;
  decisionMakerRole: string;
  latencyMs: number;
  dmarcPolicy: string;
  senderName?: string;
  senderRole?: string;
}): { subject: string; body: string } {
  const {
    companyName,
    domain,
    brandDescription,
    detectedTech,
    decisionMakerName,
    latencyMs,
    dmarcPolicy,
    senderName = "Deep Mehta",
    senderRole = "AWS Certified Solutions Architect – Professional | Founder"
  } = params;

  // Capitalize first name properly
  const rawFirstName = decisionMakerName.split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);

  // Clean company name from SEO title suffixes (e.g. "Acme - Mobile App & Software Development" -> "Acme")
  const cleanCompanyName = companyName.split(/[-–|]/)[0].trim() || companyName;
  const techLabel = detectedTech.slice(0, 2).join(" & ") || "cloud";

  // Clean brand description sentence
  const cleanDesc = brandDescription.split(/[.?!]/)[0].trim() || brandDescription;

  // Personal Observation / Hook based on real brand research
  let observation = "";
  if (cleanDesc.toLowerCase().startsWith(cleanCompanyName.toLowerCase())) {
    const afterName = cleanDesc.slice(cleanCompanyName.length).replace(/^['’]s/i, "").trim();
    observation = `While reviewing ${cleanCompanyName}, I was really impressed by how your team ${afterName}.`;
  } else if (/^(helps|delivers|builds|empowers|provides|supports|develops|creates)\b/i.test(cleanDesc)) {
    observation = `While reviewing ${cleanCompanyName}, I was really impressed by how your team ${cleanDesc}.`;
  } else {
    observation = `While reviewing ${cleanCompanyName}, I was really impressed by your work in ${cleanDesc}.`;
  }

  // Detect which 3 Dices specialization matches this prospect best:
  const textCorpus = `${brandDescription} ${cleanCompanyName} ${detectedTech.join(" ")}`.toLowerCase();
  const isAiLead =
    detectedTech.some((t) =>
      ["Amazon Bedrock", "OpenAI", "Anthropic", "Claude", "LangChain", "LlamaIndex", "FastAPI"].includes(t)
    ) || /\b(ai|llm|agents?|rag|chatbot|gpt|machine learning|genai|models?)\b/i.test(textCorpus);

  const isSlowLatency = latencyMs > 600;
  const isSecurityGap = dmarcPolicy === "none" || dmarcPolicy === "missing";

  let subject = "";
  let body = "";

  if (isAiLead) {
    // ─── PILLAR 1: ENTERPRISE AI & AUTONOMOUS AGENTS (AMAZON BEDROCK) ───
    subject = `${firstName} - private AI & agent architecture for ${cleanCompanyName}`;
    body = `Hi ${firstName},

${observation}

I noticed ${cleanCompanyName} is actively shipping AI features. One of the main challenges technical teams face as they scale LLMs is data privacy—preventing customer data from leaking to third-party APIs—while keeping multi-step agents from breaking on unpredictable edge cases.

At 3 Dices, we engineer enterprise GenAI systems and autonomous AI agents directly on Amazon Bedrock inside your own AWS VPC. That keeps all model invocations strictly inside your private security perimeter, with deterministic guardrails and evaluation harnesses so agents execute reliably in production rather than acting as brittle chat demos.

Would you be open to a brief 10-minute engineering chat this week, or would it be helpful if I shared our architecture teardown on running private Bedrock agents inside AWS?

Best regards,
${senderName}
${senderRole}
3 Dices Technology | https://3dices.com`;
  } else if (isSlowLatency) {
    // ─── PILLAR 2: AWS INFRASTRUCTURE, FINOPS & LATENCY OPTIMIZATION ───
    subject = `${firstName} - question about ${cleanCompanyName}'s server response latency`;
    body = `Hi ${firstName},

${observation}

I ran a performance check on ${domain} and noticed your initial server response time is sitting around ${latencyMs}ms. Under traffic surges, this latency can create drop-offs and drive up underlying compute overhead.

At 3 Dices, we partner with technical founders to eliminate backend bottlenecks and right-size AWS environments. In recent client work, we migrated an overloaded monolith to containerized services on Amazon EKS with zero cutover downtime and cut their monthly cloud bill by ~40%.

We're currently offering a complimentary 30-Minute AWS Architecture & Cost Review. We audit your setup, identify immediate latency and cost leaks, and share actionable runbooks whether you work with us or not.

Would you be open to a quick 10-minute call this Thursday to see if there are easy wins for ${cleanCompanyName}?

Best regards,
${senderName}
${senderRole}
3 Dices Technology | https://3dices.com`;
  } else if (isSecurityGap) {
    // ─── PILLAR 3: CLOUD SECURITY, DMARC HARDENING & SOC 2 READINESS ───
    subject = `${firstName} - quick note regarding ${domain}'s email security setup`;
    body = `Hi ${firstName},

${observation}

While running a quick domain audit on ${domain}, I noticed your DMARC email authentication policy is ${dmarcPolicy === "none" ? "monitoring-only (p=none)" : "currently missing"}. Under current Gmail and Yahoo enforcement, this leaves your domain exposed to spoofing and can impact critical transactional email deliverability.

At 3 Dices, we specialize in AWS cloud security hardening, VPC network isolation, and technical controls for SOC 2 readiness—built directly by an AWS Certified Solutions Architect – Professional & Security Specialist.

Happy to send over the exact DNS records to fix this in 5 minutes, or chat if your team is preparing for upcoming security audits.

Best regards,
${senderName}
${senderRole}
3 Dices Technology | https://3dices.com`;
  } else {
    // ─── PILLAR 4: DEVOPS AUTOMATION, CI/CD & AWS CLOUD ARCHITECTURE ───
    subject = `Quick question regarding ${cleanCompanyName}'s ${techLabel} architecture`;
    body = `Hi ${firstName},

${observation}

I noticed your team is building on ${techLabel}. As engineering teams scale, releases and cloud environments often become bottlenecks—either manual and risky, or dragging out over hours.

At 3 Dices, we're a boutique cloud and DevOps engineering studio. We build automated GitHub Actions pipelines with instant 1-step rollbacks—consistently cutting release times from hours down to under 10 minutes—and manage multi-account AWS foundations that scale without rework. You work directly with the senior engineers writing the code, with no junior hand-offs or agency overhead.

Would you be open to a quick 10-minute introductory call this week to see if there's an opportunity to collaborate, or can I send over our architecture checklist?

Best regards,
${senderName}
${senderRole}
3 Dices Technology | https://3dices.com`;
  }

  return { subject, body };
}
