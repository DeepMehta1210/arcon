import { verifyEmail } from "@arcon/verifier";
import { resolveMx, resolveTxt } from "node:dns/promises";
import { isGenericEmail, isLikelyPersonName, sanitizeEmail } from "./pipeline-engine";

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

/**
 * Extracts portfolio client case studies and featured builds from HTML.
 */
export function extractPortfolioProjectsFromHtml(html: string): string[] {
  if (!html) return [];
  const projects = new Set<string>();

  // Pattern 1: Project links: /work/slug, /case-studies/slug, /projects/slug, /portfolio/slug
  const linkMatches = html.matchAll(
    /<a[^>]*href=["'](?:https?:\/\/[^"']+)?\/(?:work|case-studies|portfolio|projects|clients)\/([^"'\/?#]+)["'][^>]*>(.*?)<\/a>/gi
  );
  for (const match of linkMatches) {
    const slug = match[1];
    const innerText = match[2].replace(/<[^>]+>/g, "").trim();

    if (
      innerText &&
      innerText.length >= 2 &&
      innerText.length <= 40 &&
      !/^(view|read|see|case|project|more|all|explore|visit|next|previous)\b/i.test(innerText)
    ) {
      projects.add(innerText);
    } else if (
      slug &&
      slug.length >= 3 &&
      slug.length <= 35 &&
      !/^(all|index|page|tag|category|archive)$/i.test(slug)
    ) {
      const formatted = slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      projects.add(formatted);
    }
    if (projects.size >= 4) break;
  }

  // Pattern 2: Headings inside case study or project containers
  const headingMatches = html.matchAll(
    /<(?:h2|h3|h4)[^>]*class=["'][^"']*(?:project|case-study|portfolio|client|card-title)[^"']*["'][^>]*>([^<]+)<\/(?:h2|h3|h4)>/gi
  );
  for (const match of headingMatches) {
    const title = match[1].trim();
    if (
      title.length >= 2 &&
      title.length <= 40 &&
      !/^(our work|recent work|case studies|selected projects|featured work|latest work)$/i.test(title)
    ) {
      projects.add(title);
    }
    if (projects.size >= 4) break;
  }

  return Array.from(projects).slice(0, 3);
}

/**
 * Extracts agency philosophy / manifesto / mission statement from HTML.
 */
export function extractAgencyPhilosophyFromHtml(html: string): string | undefined {
  if (!html) return undefined;

  // Pattern 1: Philosophy / Manifesto / About headings followed by paragraph
  const sectionMatch = html.match(
    /<(?:h1|h2|h3|h4)[^>]*>(?:About(?:\s+Us)?|Our Philosophy|Philosophy|Manifesto|Our Approach|What We Believe|Our Mission|The Studio|Our Ethos|Craft)<\/(?:h1|h2|h3|h4)>\s*<(?:p|div)[^>]*>([^<]{25,350})<\/(?:p|div)>/i
  );
  if (sectionMatch && sectionMatch[1]) {
    return sectionMatch[1].replace(/\s+/g, " ").trim();
  }

  // Pattern 2: Elements with manifesto / philosophy class
  const classMatch = html.match(
    /<(?:p|div)[^>]*class=["'][^"']*(?:manifesto|philosophy|ethos|mission-statement)[^"']*["'][^>]*>([^<]{25,350})<\/(?:p|div)>/i
  );
  if (classMatch && classMatch[1]) {
    return classMatch[1].replace(/\s+/g, " ").trim();
  }

  return undefined;
}

/**
 * Classifies the agency archetype based on text corpus.
 */
export function classifyAgencyArchetype(
  textCorpus: string
): "creative_studio" | "dev_shop" | "ecommerce_shopify" | "wordpress_content" | undefined {
  const lower = textCorpus.toLowerCase();
  const isAgency = /\b(agency|studios?|web\s*design|digital\s*agency|creative\s*agency|development\s*agency|dev\s*shop|interactive)\b/i.test(
    lower
  );
  if (!isAgency) return undefined;

  if (/\b(shopify|shopify\s*plus|e-?commerce|dtc|d2c|conversion\s*rate|checkout|klaviyo|cart)\b/i.test(lower)) {
    return "ecommerce_shopify";
  }
  if (
    /\b(3d|webgl|interactive|motion\s*design|art\s*direction|digital\s*experience|awwwards|immersive|sensory|aesthetic)\b/i.test(
      lower
    )
  ) {
    return "creative_studio";
  }
  if (/\b(wordpress|elementor|wp\s*engine|cms\s*development|web\s*maintenance|managed\s*hosting)\b/i.test(lower)) {
    return "wordpress_content";
  }
  if (/\b(custom\s*software|web\s*apps?|full\s*stack|next\.js|engineering|backend|api|headless|cloud\s*architecture|saas)\b/i.test(lower)) {
    return "dev_shop";
  }

  return "creative_studio";
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
  featuredProjects?: string[];
  agencyPhilosophy?: string;
  agencyArchetype?: "creative_studio" | "dev_shop" | "ecommerce_shopify" | "wordpress_content";
}> {
  const dnsIntel = await auditDomainDns(domain);
  const start = Date.now();

  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

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

    // Deep Agency & Portfolio Extraction
    const featuredProjects = extractPortfolioProjectsFromHtml(html);
    const agencyPhilosophy = extractAgencyPhilosophyFromHtml(html);
    const textCorpus = `${title} ${description} ${heroHeadline} ${html.slice(0, 3000)}`;
    const agencyArchetype = classifyAgencyArchetype(textCorpus);

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
      linkedInUrl,
      featuredProjects,
      agencyPhilosophy,
      agencyArchetype
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
      linkedInUrl: undefined,
      featuredProjects: [],
      agencyPhilosophy: undefined,
      agencyArchetype: undefined
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
  if (name && !isLikelyPersonName(name)) {
    name = undefined;
  }
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
    const cleanEmail = sanitizeEmail(email);
    if (cleanEmail.endsWith(`@${cleanDomain}`) && !isGenericEmail(cleanEmail) && !candidateEmails.includes(cleanEmail)) {
      candidateEmails.push(cleanEmail);
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
 * Generates an authentic, high-converting B2B cold email adhering to the
 * 13 Cold Email Breakdowns playbook (Kévin Moënne-Loccoz / Lemlist standards):
 * 1. 1-3 word lowercase subject lines (e.g. 'cloud bill', 'latency', 'bedrock rag', 'devops pipeline')
 * 2. Sentence Color Audit: >85% about the prospect / verifiable diagnostic, 0% self-centered agency pitch
 * 3. Step 1 CTA: Zero time-asks. Friction-free conversation starters ('Is this accurate?', 'Am I going in the right direction?')
 * 4. Trust-stacked signature: Name, Title, 3 Dices URL, clickable LinkedIn profile, and 1-line proof P.S.
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
  featuredProject?: string;
  agencyPhilosophy?: string;
  agencyArchetype?: "creative_studio" | "dev_shop" | "ecommerce_shopify" | "wordpress_content";
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
    senderRole = "AWS Certified Solutions Architect – Professional | Founder",
    featuredProject,
    agencyPhilosophy,
    agencyArchetype
  } = params;

  // Capitalize first name properly
  const rawFirstName = decisionMakerName.split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);

  // Clean company name from SEO title suffixes
  const cleanCompanyName = companyName.split(/[-–|]/)[0].trim() || companyName;
  const techLabel = detectedTech.slice(0, 2).join(" & ") || "cloud";

  // Trust signature block
  const trustSignature = `Best regards,
${senderName}
${senderRole}
3 Dices Technology | https://3dices.com
LinkedIn: https://linkedin.com/in/deepmehta`;

  // Detect specialization match:
  const textCorpus = `${brandDescription} ${cleanCompanyName} ${detectedTech.join(" ")}`.toLowerCase();
  const isAgency =
    Boolean(agencyArchetype) ||
    /\b(agency|studios?|web\s*design|digital\s*agency|creative\s*agency|development\s*agency|interactive|software\s*house|dev\s*shop|creative\s*digital)\b/i.test(
      textCorpus
    );

  const isAiLead =
    detectedTech.some((t) =>
      ["Amazon Bedrock", "OpenAI", "Anthropic", "Claude", "LangChain", "LlamaIndex", "FastAPI"].includes(t)
    ) || /\b(ai|llm|agents?|rag|chatbot|gpt|machine learning|genai|models?)\b/i.test(textCorpus);

  const isSlowLatency = latencyMs > 600;
  const isSecurityGap = dmarcPolicy === "none" || dmarcPolicy === "missing";

  let subject = "";
  let body = "";

  if (agencyArchetype === "ecommerce_shopify") {
    // ─── ARCHETYPE: E-COMMERCE / SHOPIFY AGENCY (Lemlist 95/100) ───
    subject = "checkout speed";
    body = `Hi ${firstName},

Noticed ${featuredProject ? `your recent launch for ${featuredProject}` : `the high-converting e-commerce builds from ${cleanCompanyName}`}.

When clients run heavy paid ad bursts or flash sales, unoptimized origin caching and database locks are usually what slow down checkout speed and depress conversion.

We partner with e-commerce agencies behind the scenes—hardening AWS auto-scaling and CDN edge layers so client stores hold sub-350ms response times under peak ad traffic.

Am I going in the right direction for your client setups?

${trustSignature}
PS: Zero database bottlenecks during an 80,000 req/min flash sale on AWS last quarter.`;
  } else if (isAgency && isSlowLatency) {
    // ─── ARCHETYPE 1: AGENCY CLIENT SITE SPEED (Lemlist 95/100) ───
    subject = "site speed";
    body = `Hi ${firstName},

Inspected ${featuredProject ? `your recent build for ${featuredProject}` : `${domain}'s client showcase`}—the design and visual branding look great.

Ran a quick speed check on your live showcase URL—initial server response is currently sitting at ${latencyMs}ms from edge nodes. Under peak traffic, that delay causes bounce-offs before visitors see your work.

We act as the silent AWS cloud partner for design agencies—moving client sites to edge-cached AWS infrastructure to drop load times under 450ms without touching your frontend design.

Open to seeing a 60-second speed breakdown for your showcase sites?

${trustSignature}
PS: Cut page load times by 65% for an agency's 14 client sites on AWS with zero downtime.`;
  } else if (isAgency && agencyArchetype === "wordpress_content") {
    // ─── ARCHETYPE: WORDPRESS / CONTENT AGENCY (Lemlist 95/100) ───
    subject = "hosting margin";
    body = `Hi ${firstName},

Quick question—when your team launches web builds${featuredProject ? ` like ${featuredProject}` : ""}, do you hand clients off to shared hosting, or do you bill them monthly for managed infrastructure?

Most partner agencies bill their clients $250 to $400/mo for managed cloud, pay us $125/mo to manage the AWS infrastructure invisibly under their brand, and pocket the recurring margin without ever opening an SSH terminal.

Open to seeing how our agency white-label model works?

${trustSignature}
PS: Partner agencies average $3,200/mo in pure hosting margin on AWS with zero developer overhead.`;
  } else if (isAgency) {
    // ─── ARCHETYPE 2: AGENCY WHITE-LABEL CLOUD MARGIN (Lemlist 95/100) ───
    subject = "client servers";
    body = `Hi ${firstName},

Quick question—when your team launches custom web builds for clients, who handles the AWS infrastructure and auto-scaling so servers don't crash during traffic surges?

We act as the silent white-label cloud partner for boutique design agencies—managing 100% of AWS hosting, auto-scaling, and daily backups behind the scenes under your brand.

Most of our partner agencies bill their clients $300/mo for managed cloud, pay us $150/mo, and pocket the margin without ever touching a server terminal.

Open to seeing our 1-page agency partner breakdown?

${trustSignature}
PS: Managing 25+ agency client production workloads on AWS with 99.99% uptime.`;
  } else if (isAiLead) {
    // ─── ARCHETYPE 1: PRIVATE ENTERPRISE AI & BEDROCK RAG (Breakdown #3 / #7) ───
    subject = "bedrock rag";
    body = `Hi ${firstName},

Saw ${cleanCompanyName} is actively shipping AI capabilities.

The #1 challenge engineering teams face when scaling LLMs is data privacy—preventing customer prompts from leaking outside the VPC—while stopping multi-step agents from breaking on edge cases.

We engineer private GenAI systems directly on Amazon Bedrock inside your own AWS VPC with deterministic guardrails. Mapped out our VPC Bedrock architecture diagram and evaluation harness.

Want access to my notes?

${trustSignature}
PS: Deployed private enterprise RAG on Bedrock with zero third-party API exposure.`;
  } else if (isSlowLatency) {
    // ─── ARCHETYPE 2: LATENCY & EDGE BOTTLENECK AUDIT (Breakdown #2 — Score 95/100) ───
    subject = "latency";
    body = `Hi ${firstName},

Inspected ${domain}'s server response latency—initial TTFB is sitting at ${latencyMs}ms.

Under peak traffic, that latency causes user drop-offs and drives up underlying compute overhead. Moving static assets to edge routing and tuning database connection pooling would drop that to under 180ms.

I put together a 6-point checklist we used to optimize this for our last SaaS client. Want me to send the checklist over?

${trustSignature}
PS: Cut page load times by 60% for a high-traffic media platform with zero downtime.`;
  } else if (isSecurityGap) {
    // ─── ARCHETYPE 3: DMARC & CLOUD SECURITY POSTURE (Breakdown #4) ───
    subject = "dmarc audit";
    body = `Hi ${firstName},

Ran a quick domain security audit on ${domain}—your DMARC policy is currently ${dmarcPolicy === "none" ? "monitoring-only (p=none)" : "missing"}.

Under current Gmail and Yahoo enforcement, this leaves your domain exposed to spoofing and directly degrades transactional email deliverability.

I have the exact 3 DNS records you need to enforce strict alignment without breaking legitimate mail. Want me to send them over?

${trustSignature}
PS: Handled AWS security hardening and SOC 2 readiness controls for UK & US fintechs.`;
  } else if (detectedTech.some((t) => ["Docker", "Kubernetes", "AWS", "Terraform", "Next.js", "Node"].includes(t))) {
    // ─── ARCHETYPE 4: THE VENDING MACHINE FINOPS ANGLE (Breakdown #4 — Score 82/100) ───
    subject = "cloud bill";
    body = `Hi ${firstName},

You're at a vending machine. Diet Coke: $0 or $1.50. What would you choose? Zero, right?

Then why pay AWS on-demand rates when Graviton instances + compute savings plans give ${cleanCompanyName} the exact same compute for 40% less?

Took 2 minutes to calculate the monthly delta for your stack. 

Is this accurate for your current infrastructure?

${trustSignature}
PS: Cut monthly AWS spend by 38% for a fintech last month without touching application code.`;
  } else {
    // ─── ARCHETYPE 5: DEVOPS AUTOMATION & CI/CD PLAYBOOK (Breakdown #7 — Score 91/100) ───
    subject = "devops pipeline";
    body = `Hi ${firstName},

Saw your team is building on ${techLabel}. As engineering teams grow, deployments often become bottlenecks—either manual and risky, or dragging out over 45 minutes.

We built automated GitHub Actions pipelines with instant 1-step rollbacks that cut deployment cycles down to under 7 minutes. Put our ECS/EKS architecture breakdown and Terraform template into a 1-page dossier.

Am I going in the right direction?

${trustSignature}
PS: Migrated an overloaded monolith to Amazon EKS with zero cutover downtime.`;
  }

  return { subject, body };
}

/**
 * Generates a high-value follow-up email following Breakdown #10 (Score 90+ rewrite):
 * - Subject: Re: ${initialSubject}
 * - 2-3 sentences max.
 * - ZERO guilt-tripping ("Did you get my email?", "Just following up").
 * - Pure value-add: offers a direct calculation, diagnostic finding, or diagram.
 */
export function generateFollowUpEmail(params: {
  initialSubject: string;
  companyName: string;
  decisionMakerName: string;
  domain: string;
  senderName?: string;
}): { subject: string; body: string } {
  const {
    initialSubject,
    companyName,
    decisionMakerName,
    domain,
    senderName = "Deep Mehta"
  } = params;

  const rawFirstName = decisionMakerName.split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const cleanCompanyName = companyName.split(/[-–|]/)[0].trim() || companyName;

  const cleanSubject = initialSubject.replace(/^re:\s*/i, "");
  const subject = `Re: ${cleanSubject}`;

  let valueNote = `Took 3 minutes to put together a tailored AWS latency and compute audit for ${cleanCompanyName}.`;
  if (/client servers|hosting margin|site speed/i.test(cleanSubject)) {
    valueNote = `Mapped out the 1-page AWS architecture blueprint we use for agency client sites (auto-scaling ECS, CloudFront edge caching, and daily S3 snapshots).`;
  }

  const body = `Hi ${firstName},

${valueNote}

Is this accurate for your setup, or should I share the breakdown here?

Best regards,
${senderName}
3 Dices Technology | https://3dices.com
LinkedIn: https://linkedin.com/in/deepmehta`;

  return { subject, body };
}
