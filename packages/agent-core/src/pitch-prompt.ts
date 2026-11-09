import type { CloudInfrastructureAudit } from "./cloud-audit";
import { cleanCompanyName } from "./pipeline-engine";

export interface RawPitchData {
  company: {
    name: string;
    domain: string;
    description?: string;
    techStack?: string[];
    cloudProvider?: string;
    hostingEnvironment?: string;
  };
  decisionMaker: {
    fullName: string;
    role?: string;
    email?: string;
    linkedinUrl?: string;
  };
  technicalAudit?: {
    isAws?: boolean;
    detectedAwsServices?: string[];
    directS3AssetLeaks?: boolean;
    leakedS3Bucket?: string;
    dmarcPolicy?: string;
  };
  trigger: {
    angle:
      | "aws_devops_hiring"
      | "aws_finops_cost"
      | "aws_migration"
      | "aws_agency_whitelabel"
      | "ai_bedrock_vpc"
      | "devsecops_hardening"
      | "general_cloud";
    signalSummary: string;
    jobTitle?: string;
    featuredProject?: string;
  };
}

export interface FormattedPitchPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export interface GeneratedPitchResult {
  subject: string;
  body: string;
  angle: string;
  wordCount: number;
  reasoning: string;
}

/**
 * Constructs the standardized Cold Email Generation Prompt for 3 Dices (AWS Cloud Agency).
 * Built on Reddit (r/sales, r/coldemail, r/devops) consensus:
 * - < 80 words
 * - 1-3 word lowercase subject lines
 * - 3 steps: Trigger Observation -> Value Delta -> Soft Low-Friction CTA
 * - Zero calendar/call asks in Email 1
 * - Trust-stacked signature with quantifiable PS proof
 */
export function buildPitchPrompt(rawData: RawPitchData): FormattedPitchPrompt {
  const companyClean = cleanCompanyName(rawData.company.name);
  const rawFirstName = rawData.decisionMaker.fullName.split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);

  const systemPrompt = `You are Deep Mehta, AWS Certified Solutions Architect – Professional and Founder of 3 Dices Technology (https://3dices.com).
You write elite, high-converting B2B cold emails directly to agency founders, CTOs, and technical leaders based on verified technical intelligence.

STRICT OPERATOR RULES (Based on 2026 cold email consensus across r/sales & r/coldemail):
1. LENGTH: Strictly under 80 words total (aim for 50-70 words). Keep paragraphs to 1-2 punchy sentences.
2. SUBJECT LINE: Strictly 1 to 3 words, ALL LOWERCASE (e.g. "client servers", "devops role", "cloud bill", "aws migration", "bedrock rag", "dmarc audit").
   - NEVER include company names, prospect names, exclamation marks, or marketing pitches in the subject line.
3. 3-STEP FORMULA:
   - Step 1 (Trigger Observation): State a specific, verifiable fact about their infrastructure, recruitment, or agency build. NEVER use fake flattery ("impressed by your work", "hope this email finds you well").
   - Step 2 (Insight / Quantified Delta): Connect that observation to an immediate value or cost delta (e.g., 35-40% compute cut via Graviton, fractional AWS team deployed in 48 hours vs 3-month recruiter lag, CloudFront S3 edge caching, or white-label hosting margin).
   - Step 3 (Soft Conversation Starter): Low-friction, curiosity-driven question.
     - NEVER ask for time or meetings ("10-minute chat", "hop on a call", "calendar link").
     - Use soft permission checks only: "Is this accurate for your setup?", "Am I going in the right direction?", "Open to seeing our 1-page breakdown?".
4. DELIVERABILITY: Zero links or attachments in the email body (only website in the signature).
5. SIGNATURE BLOCK (Must match exactly):
Best regards,
Deep Mehta
AWS Certified Solutions Architect – Professional | Founder
3 Dices Technology | https://3dices.com
LinkedIn: https://linkedin.com/in/deepmehta
PS: [Specific 1-line quantifiable proof matching the angle]

OUTPUT FORMAT:
Return valid JSON only matching this schema:
{
  "subject": "1-3 words lowercase subject line",
  "body": "The complete email body text including greeting, 3-step pitch, signature, and PS.",
  "angle": "The primary angle used",
  "wordCount": number
}`;

  const userPrompt = `RAW PROSPECT DATA:
- Company Name: ${companyClean}
- Corporate Domain: ${rawData.company.domain}
- Decision Maker: ${firstName} (${rawData.decisionMaker.fullName})
- Title/Role: ${rawData.decisionMaker.role || "Founder / Technical Leader"}
- Target Email: ${rawData.decisionMaker.email || "direct email"}
- Detected Tech Stack: ${(rawData.company.techStack || []).join(", ") || "Cloud Native"}
- Hosting Environment: ${rawData.company.hostingEnvironment || rawData.company.cloudProvider || "Cloud"}
- AWS Services Detected: ${(rawData.technicalAudit?.detectedAwsServices || []).join(", ") || "None"}
- Direct S3 Asset Leak: ${rawData.technicalAudit?.directS3AssetLeaks ? `Yes (Bucket: ${rawData.technicalAudit.leakedS3Bucket})` : "None"}
- DMARC Policy: ${rawData.technicalAudit?.dmarcPolicy || "standard"}
- Buying Trigger / Pain Point: ${rawData.trigger.signalSummary}
- Primary Hook Angle: ${rawData.trigger.angle}
${rawData.trigger.jobTitle ? `- Recruiting Role: ${rawData.trigger.jobTitle}` : ""}
${rawData.trigger.featuredProject ? `- Featured Portfolio Project: ${rawData.trigger.featuredProject}` : ""}

Draft the personalized 3 Dices cold email following all strict rules now.`;

  return { systemPrompt, userPrompt };
}

/**
 * Deterministic Pitch Generator that produces a production-ready, < 80 word,
 * highly tailored cold email pitch immediately from the raw data.
 */
export function generatePitchFromRawData(rawData: RawPitchData): GeneratedPitchResult {
  const companyClean = cleanCompanyName(rawData.company.name);
  const rawFirstName = rawData.decisionMaker.fullName.split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const angle = rawData.trigger.angle;
  const techLabel = (rawData.company.techStack || []).slice(0, 2).join(" & ") || "cloud";

  const trustSignature = `Best regards,
Deep Mehta
AWS Certified Solutions Architect – Professional | Founder
3 Dices Technology | https://3dices.com
LinkedIn: https://linkedin.com/in/deepmehta`;

  let subject = "client servers";
  let body = "";
  let ps = "PS: Managing 25+ agency client production workloads on AWS with 99.99% uptime.";
  let reasoning = "";

  switch (angle) {
    case "aws_devops_hiring": {
      subject = "devops role";
      const roleName = rawData.trigger.jobTitle || "Senior DevOps Engineer";
      body = `Hi ${firstName},

Saw ${companyClean} is actively recruiting for a ${roleName}.

Sourcing and onboarding a senior full-time cloud engineer typically takes 8 to 12 weeks and $140k+ in overhead.

At 3 Dices, we step in as your fractional AWS team within 48 hours—handling your Terraform IaC, EKS Kubernetes, CI/CD, and 24/7 reliability for a fraction of that cost.

Am I going in the right direction?

${trustSignature}
PS: Cut deployment cycles from 45 mins to 7 mins for our last SaaS client.`;
      reasoning = `Lead is recruiting for ${roleName}. 3 Dices pitches fractional senior engineering in 48 hours to eliminate recruiter delay.`;
      break;
    }

    case "aws_migration": {
      subject = "aws migration";
      const host = rawData.company.hostingEnvironment || "a monolithic setup";
      body = `Hi ${firstName},

Noticed ${companyClean}'s backend is running on ${host}.

As workloads scale, PaaS and legacy VPS setups become expensive bottlenecks—lacking granular VPC security and driving up monthly hosting costs.

We migrate production workloads into modern containerized AWS (ECS Fargate or Amazon EKS) with automated Terraform modules and zero cutover downtime.

Open to seeing our 1-page migration blueprint?

${trustSignature}
PS: Migrated an overloaded monolith to Amazon EKS with zero cutover downtime.`;
      reasoning = `Lead runs on PaaS/monolith VPS (${host}). Pitches containerized AWS ECS/EKS migration.`;
      break;
    }

    case "aws_finops_cost": {
      subject = "cloud bill";
      if (rawData.technicalAudit?.directS3AssetLeaks && rawData.technicalAudit.leakedS3Bucket) {
        body = `Hi ${firstName},

Ran a quick review of ${companyClean}'s public cloud footprint.

Noticed assets loading directly from S3 bucket "${rawData.technicalAudit.leakedS3Bucket}" without CloudFront edge caching, incurring unnecessary on-demand AWS data egress billing.

Routing assets through CloudFront edge drops egress costs by over 50%.

Took 2 minutes to calculate the monthly delta for your setup.

Is this accurate for your current infrastructure?

${trustSignature}
PS: Reduced monthly AWS spend by 38% for a growth client last month without touching application code.`;
        reasoning = `Direct S3 asset egress leak detected on bucket ${rawData.technicalAudit.leakedS3Bucket}. CloudFront routing cuts egress by 50%.`;
      } else {
        body = `Hi ${firstName},

Ran a quick infrastructure review for ${companyClean}.

Most engineering teams building on ${techLabel} pay on-demand AWS rates when Graviton instances and Compute Savings Plans give the exact same compute for 35–40% less.

Took 2 minutes to calculate the monthly delta for your stack.

Is this accurate for your current setup?

${trustSignature}
PS: Cut monthly AWS spend by 38% for a fintech last month without touching application code.`;
        reasoning = `Operating on AWS. Pitches Graviton3 and Compute Savings Plan 35-40% margin recovery.`;
      }
      break;
    }

    case "ai_bedrock_vpc": {
      subject = "bedrock rag";
      body = `Hi ${firstName},

Saw ${companyClean} is actively shipping AI capabilities.

The #1 challenge engineering teams face when scaling LLMs is data privacy—preventing customer prompts from leaking outside the VPC—while keeping inference latency predictable.

We engineer private GenAI systems directly on Amazon Bedrock inside your own AWS VPC with deterministic guardrails.

Want access to our VPC architecture notes?

${trustSignature}
PS: Deployed private enterprise RAG on Bedrock with zero third-party API exposure.`;
      reasoning = `Active GenAI/LLM workload. Pitches private Bedrock VPC deployment to eliminate data leakage.`;
      break;
    }

    case "devsecops_hardening": {
      subject = "dmarc audit";
      const policy = rawData.technicalAudit?.dmarcPolicy || "missing";
      body = `Hi ${firstName},

Ran a quick domain security audit on ${rawData.company.domain}—your DMARC policy is currently ${policy === "none" ? "monitoring-only (p=none)" : "missing"}.

Under current Gmail and Yahoo enforcement, this leaves your domain exposed to spoofing and degrades transactional mail deliverability.

I have the exact 3 DNS records you need to enforce strict alignment without breaking legitimate mail. Want me to send them over?

${trustSignature}
PS: Handled AWS security hardening and SOC 2 readiness controls for UK & US fintechs.`;
      reasoning = `DMARC policy is ${policy}. Pitches DNS hardening to prevent domain spoofing.`;
      break;
    }

    case "aws_agency_whitelabel":
    default: {
      subject = "client servers";
      body = `Hi ${firstName},

Quick question—when your team launches custom web builds for clients, who handles the AWS infrastructure and auto-scaling so servers don't crash during traffic surges?

We act as the silent white-label cloud partner for boutique design agencies—managing 100% of AWS hosting, auto-scaling, and daily backups behind the scenes under your brand.

Most partner agencies bill clients $300/mo, pay us $150/mo, and pocket the recurring margin without touching a server terminal.

Open to seeing our 1-page agency partner breakdown?

${trustSignature}
PS: Managing 25+ agency client production workloads on AWS with 99.99% uptime.`;
      reasoning = `B2B digital agency delivering client web applications. Pitches white-label managed AWS hosting margin.`;
      break;
    }
  }

  // Calculate clean word count (excluding signature)
  const bodyWithoutSig = body.split("Best regards")[0] || body;
  const wordCount = bodyWithoutSig.trim().split(/\s+/).filter(Boolean).length;

  return {
    subject,
    body,
    angle,
    wordCount,
    reasoning
  };
}
