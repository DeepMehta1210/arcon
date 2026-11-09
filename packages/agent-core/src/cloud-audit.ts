import { resolveNs, resolveMx, resolveTxt } from "node:dns/promises";

export interface CloudInfrastructureAudit {
  domain: string;
  cloudProvider: "aws" | "gcp" | "azure" | "heroku" | "render" | "vercel" | "digitalocean" | "cloudflare" | "legacy_vps" | "unknown";
  isAws: boolean;
  detectedAwsServices: string[];
  hostingEnvironment: string;
  dnsProvider: "route53" | "cloudflare" | "godaddy" | "namecheap" | "custom";
  mailProvider: "google" | "microsoft" | "zoho" | "aws_ses" | "custom";
  
  // FinOps & Cost Optimization Gaps
  finOps: {
    directS3AssetLeaks: boolean;
    leakedS3Buckets: string[];
    uncachedOrigin: boolean;
    costOptimizationAngle: string;
    estimatedSavingsPercent: number;
  };

  // DevSecOps & Compliance Posture
  devSecOps: {
    dmarcPolicy: "reject" | "quarantine" | "none" | "missing";
    hasSpf: boolean;
    usesAwsSes: boolean;
    hasHsts: boolean;
    hasCsp: boolean;
    securityGapsSummary: string;
  };

  // Tech Stack & Workload Profile
  detectedTech: string[];
  hasAiWorkload: boolean;
  
  // The primary hook & recommended pitch angle for 3 Dices
  primaryHook: string;
  recommendedAngle: "aws_devops_hiring" | "aws_finops_cost" | "aws_migration" | "aws_agency_whitelabel" | "ai_bedrock_vpc" | "devsecops_hardening";
}

const CLOUD_TECH_KEYWORDS = [
  "React", "Next.js", "Vue", "TypeScript", "Python", "Go", "Node.js", "Ruby",
  "PostgreSQL", "MySQL", "Redis", "MongoDB", "DynamoDB", "Aurora",
  "Docker", "Kubernetes", "EKS", "ECS", "Terraform", "Serverless", "Lambda",
  "GitHub Actions", "GitLab CI", "Prometheus", "Grafana", "Kafka",
  "Amazon Bedrock", "OpenAI", "Anthropic", "Claude", "LangChain", "LlamaIndex", "FastAPI"
];

export async function auditCloudInfrastructure(params: {
  domain: string;
  companyName?: string;
  sourceSignal?: string;
  jobTitle?: string;
}): Promise<CloudInfrastructureAudit> {
  const { domain, sourceSignal, jobTitle } = params;
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();

  // 1. Parallel DNS Lookups (Route53, MX, DMARC, SPF)
  const [nsRecords, mxRecords, dmarcRecords, txtRecords] = await Promise.all([
    resolveNs(cleanDomain).catch(() => []),
    resolveMx(cleanDomain).catch(() => []),
    resolveTxt(`_dmarc.${cleanDomain}`).catch(() => []),
    resolveTxt(cleanDomain).catch(() => [])
  ]);

  const nsList = nsRecords.map((ns) => ns.toLowerCase());
  const isRoute53 = nsList.some((ns) => ns.includes("awsdns"));
  let dnsProvider: "route53" | "cloudflare" | "godaddy" | "namecheap" | "custom" = "custom";
  if (isRoute53) dnsProvider = "route53";
  else if (nsList.some((ns) => ns.includes("cloudflare"))) dnsProvider = "cloudflare";
  else if (nsList.some((ns) => ns.includes("domaincontrol") || ns.includes("godaddy"))) dnsProvider = "godaddy";
  else if (nsList.some((ns) => ns.includes("registrar-servers") || ns.includes("namecheap"))) dnsProvider = "namecheap";

  // Mail Provider & SES detection
  const mxHosts = mxRecords.map((m) => m.exchange.toLowerCase());
  let mailProvider: "google" | "microsoft" | "zoho" | "aws_ses" | "custom" = "custom";
  if (mxHosts.some((h) => h.includes("google") || h.includes("aspmx"))) mailProvider = "google";
  else if (mxHosts.some((h) => h.includes("outlook") || h.includes("microsoft"))) mailProvider = "microsoft";
  else if (mxHosts.some((h) => h.includes("zoho"))) mailProvider = "zoho";
  else if (mxHosts.some((h) => h.includes("amazonses") || h.includes("aws"))) mailProvider = "aws_ses";

  // DMARC & SPF
  const dmarcFlat = dmarcRecords.flat().join(" ");
  let dmarcPolicy: "reject" | "quarantine" | "none" | "missing" = "missing";
  if (dmarcFlat.includes("v=DMARC1")) {
    if (dmarcFlat.includes("p=reject")) dmarcPolicy = "reject";
    else if (dmarcFlat.includes("p=quarantine")) dmarcPolicy = "quarantine";
    else dmarcPolicy = "none";
  }

  const txtFlat = txtRecords.flat().join(" ");
  const hasSpf = txtFlat.includes("v=spf1");
  const usesAwsSes = txtFlat.includes("include:amazonses.com") || mailProvider === "aws_ses";

  // 2. HTTP Probes for Server, Edge CDN, S3 Leaks, and Security Headers
  let headers: Record<string, string> = {};
  let html = "";
  try {
    const res = await fetch(`https://${cleanDomain}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(3500)
    });
    headers = Object.fromEntries(res.headers.entries());
    html = await res.text();
  } catch {
    // Timeout or blocked, continue with DNS intel
  }

  // Detect Cloud Provider & AWS footprint
  const serverHeader = (headers["server"] || "").toLowerCase();
  const viaHeader = (headers["via"] || "").toLowerCase();
  const isCloudFront =
    serverHeader.includes("cloudfront") ||
    Boolean(headers["x-amz-cf-id"]) ||
    viaHeader.includes("cloudfront") ||
    (headers["x-cache"] || "").toLowerCase().includes("cloudfront");
  const isAwsAlb = Boolean(headers["x-amzn-trace-id"]);
  const isAwsS3Origin = serverHeader.includes("amazons3");
  const isAwsBackend = Boolean(headers["x-amz-request-id"]) || Boolean(headers["x-amz-id-2"]);

  const isAws = isRoute53 || isCloudFront || isAwsAlb || isAwsS3Origin || isAwsBackend || usesAwsSes;

  const detectedAwsServices: string[] = [];
  if (isRoute53) detectedAwsServices.push("Route 53 DNS");
  if (isCloudFront) detectedAwsServices.push("CloudFront CDN");
  if (isAwsAlb) detectedAwsServices.push("Application Load Balancer (ALB)");
  if (isAwsS3Origin) detectedAwsServices.push("Amazon S3 Origin");
  if (usesAwsSes) detectedAwsServices.push("Amazon Simple Email Service (SES)");

  let cloudProvider: CloudInfrastructureAudit["cloudProvider"] = "unknown";
  let hostingEnvironment = "Custom / On-Premise Infrastructure";

  if (serverHeader.includes("cowboy") || viaHeader.includes("vegur") || serverHeader.includes("heroku")) {
    cloudProvider = "heroku";
    hostingEnvironment = "Heroku Dynos (PaaS)";
  } else if (serverHeader.includes("render") || Boolean(headers["x-render-origin-server"])) {
    cloudProvider = "render";
    hostingEnvironment = "Render Cloud (PaaS)";
  } else if (Boolean(headers["x-vercel-id"])) {
    cloudProvider = "vercel";
    hostingEnvironment = "Vercel Edge Network";
  } else if (serverHeader.includes("cloudflare") || Boolean(headers["cf-ray"])) {
    cloudProvider = "cloudflare";
    hostingEnvironment = isAws ? "AWS Backend via Cloudflare Edge" : "Cloudflare Edge";
  } else if (isAws) {
    cloudProvider = "aws";
    hostingEnvironment = detectedAwsServices.length > 0 ? `Amazon Web Services (${detectedAwsServices.join(", ")})` : "Amazon Web Services (AWS)";
  } else if (serverHeader.includes("nginx") || serverHeader.includes("apache") || serverHeader.includes("cpanel")) {
    cloudProvider = "legacy_vps";
    hostingEnvironment = `Monolithic VPS / VM (${serverHeader || "Linux/Nginx"})`;
  }

  // 3. Scan for Direct S3 Asset Leaks in HTML (FinOps Egress Leak)
  const s3Matches = Array.from(
    html.matchAll(/https?:\/\/([a-zA-Z0-9.\-_]+)\.s3(?:[.\-][a-zA-Z0-9\-]+)?\.amazonaws\.com/gi)
  ).map((m) => m[1]);
  const uniqueS3Buckets = Array.from(new Set(s3Matches));
  const directS3AssetLeaks = uniqueS3Buckets.length > 0 && !isCloudFront;

  // 4. DevSecOps Hygiene
  const hasHsts = Boolean(headers["strict-transport-security"]);
  const hasCsp = Boolean(headers["content-security-policy"]);

  const secGaps: string[] = [];
  if (dmarcPolicy === "missing" || dmarcPolicy === "none") {
    secGaps.push(`DMARC policy is ${dmarcPolicy === "none" ? "monitoring only (p=none)" : "missing"}, exposing domain to email spoofing`);
  }
  if (!hasHsts) secGaps.push("Missing Strict-Transport-Security (HSTS)");
  if (!hasCsp) secGaps.push("Missing Content-Security-Policy (CSP)");

  // 5. Tech Stack & AI Workload Detection
  const combinedCorpus = `${html} ${sourceSignal || ""} ${jobTitle || ""}`.toLowerCase();
  const detectedTech: string[] = [];
  for (const tech of CLOUD_TECH_KEYWORDS) {
    if (new RegExp(`\\b${tech}\\b`, "i").test(combinedCorpus)) {
      detectedTech.push(tech);
    }
  }

  const hasAiWorkload =
    detectedTech.some((t) => ["Amazon Bedrock", "OpenAI", "Anthropic", "Claude", "LangChain", "LlamaIndex"].includes(t)) ||
    /\b(ai|llm|agents?|rag|vector|embeddings?|gpt|genai)\b/i.test(combinedCorpus);

  // 6. Select Pitch Angle & Formulate High-Value Diagnostic Hook
  let recommendedAngle: CloudInfrastructureAudit["recommendedAngle"] = "aws_finops_cost";
  let primaryHook = "AWS infrastructure and cloud spending review";

  const isHiringDevOps =
    Boolean(jobTitle && /\b(devops|cloud|sre|platform|infrastructure|kubernetes|aws)\b/i.test(jobTitle)) ||
    /\b(hiring.*(devops|cloud|infrastructure|sre|kubernetes)|senior devops engineer)\b/i.test(sourceSignal || "");

  if (isHiringDevOps) {
    recommendedAngle = "aws_devops_hiring";
    primaryHook = `Actively recruiting for ${jobTitle || "Senior DevOps / Cloud Engineer"}. 3 Dices provides senior fractional AWS DevOps & Kubernetes engineering in 48 hours without the 3-month recruiter lag.`;
  } else if (cloudProvider === "heroku" || cloudProvider === "render" || cloudProvider === "legacy_vps") {
    recommendedAngle = "aws_migration";
    primaryHook = `Currently running on ${hostingEnvironment}. Migrating to containerized AWS (ECS Fargate / EKS) delivers 40%+ infrastructure cost reduction and automated auto-scaling.`;
  } else if (directS3AssetLeaks) {
    recommendedAngle = "aws_finops_cost";
    primaryHook = `Detected direct S3 asset delivery from bucket "${uniqueS3Buckets[0]}" bypassing CloudFront CDN, generating inflated AWS data egress billing.`;
  } else if (hasAiWorkload) {
    recommendedAngle = "ai_bedrock_vpc";
    primaryHook = `Building with AI/LLMs. Migrating public API calls to private Amazon Bedrock inside a secure AWS VPC eliminates external data leakage and cuts inference latency.`;
  } else if (isAws) {
    recommendedAngle = "aws_finops_cost";
    primaryHook = `Operating on AWS (${detectedAwsServices.join(", ") || "Cloud"}). Graviton instance migration and Compute Savings Plans offer immediate 30-40% FinOps savings.`;
  } else {
    recommendedAngle = "aws_agency_whitelabel";
    primaryHook = `White-label managed AWS infrastructure and 24/7 DevOps engineering for client projects with guaranteed 99.99% SLA.`;
  }

  return {
    domain: cleanDomain,
    cloudProvider,
    isAws,
    detectedAwsServices,
    hostingEnvironment,
    dnsProvider,
    mailProvider,
    finOps: {
      directS3AssetLeaks,
      leakedS3Buckets: uniqueS3Buckets,
      uncachedOrigin: !isCloudFront && cloudProvider !== "vercel" && cloudProvider !== "cloudflare",
      costOptimizationAngle: directS3AssetLeaks
        ? "Route S3 assets through CloudFront edge to eliminate on-demand AWS data egress premiums"
        : "Migrate on-demand EC2/RDS instances to Graviton3 + 1-Year Compute Savings Plans",
      estimatedSavingsPercent: directS3AssetLeaks ? 45 : 35
    },
    devSecOps: {
      dmarcPolicy,
      hasSpf,
      usesAwsSes,
      hasHsts,
      hasCsp,
      securityGapsSummary: secGaps.join("; ") || "Standard baseline security headers present"
    },
    detectedTech,
    hasAiWorkload,
    primaryHook,
    recommendedAngle
  };
}
