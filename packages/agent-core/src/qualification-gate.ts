import { isGenericEmail, isLikelyPersonName, isValidEmail, sanitizeEmail } from "./pipeline-engine";
import type { CloudInfrastructureAudit } from "./cloud-audit";

export const NEGATIVE_INDUSTRY_REGEX =
  /\b(print\s*shop|printers?|printing|stationery|signage|signs?|banner|banners|photocopy|copier|wedding\s*invitations?|car\s*wrap|vehicle\s*wrap|hardware\s*repair|phone\s*repair|mobile\s*repair|appliance\s*repair|commercial\s*cleaning|plumbing|roofing|construction|tailoring|dry\s*cleaning|laundry|auto\s*repair|mechanic|gardening|landscaping|pest\s*control)\b/i;

export const PARKED_DOMAIN_PATTERNS = [
  /sedo(?:\.com)?/i,
  /dan\.com/i,
  /hugedomains/i,
  /godaddy\.com\/domainsearch/i,
  /afternic/i,
  /domain\s*is\s*for\s*sale/i,
  /buy\s*this\s*domain/i,
  /parked\s*(?:free\s*)?by/i,
  /this\s*domain\s*(?:has\s*been|is)\s*registered/i,
  /under\s*construction/i,
  /domain\s*expired/i,
  /renew\s*your\s*domain/i,
  /inquire\s*about\s*this\s*domain/i
];

export interface LeadQualificationInput {
  company: {
    name: string;
    domain: string;
    websiteUrl?: string;
    description?: string;
    techStack?: string[];
    stage?: string;
  };
  contact: {
    fullName?: string;
    email?: string;
    title?: string;
    linkedinUrl?: string;
    phone?: string;
    verificationStatus?: string;
    emailCandidates?: string[];
  };
  trigger?: {
    source?: string;
    headline?: string;
    signalType?: string;
    detectedAt?: string;
  };
  cloudAudit?: Partial<CloudInfrastructureAudit>;
}

export type PipelineClassification = "ready_for_outreach" | "needs_manual_review" | "disqualified";

export interface ScoreBreakdown {
  domainHealth: number; // 0 to 15
  reachability: number; // 0 to 35
  intentPain: number;   // 0 to 30
  icpTechFit: number;   // 0 to 20
  total: number;        // 0 to 100
}

export interface QualificationResult {
  score: number;
  stage: PipelineClassification;
  passed: boolean;
  rejectionReason?: string;
  breakdown: ScoreBreakdown;
  reachabilityDetails: {
    hasHumanName: boolean;
    isPersonalEmail: boolean;
    isSocketVerified: boolean;
    hasPersonalLinkedin: boolean;
    hasPhone: boolean;
    targetEmail?: string;
    targetName?: string;
  };
  intentDetails: {
    intentAngle: "aws_devops_hiring" | "aws_finops_cost" | "aws_migration" | "aws_agency_whitelabel" | "ai_bedrock_vpc" | "devsecops_hardening" | "general_cloud";
    triggerSummary: string;
    isHiringDevOps: boolean;
    hasS3Leak: boolean;
    needsMigration: boolean;
    hasRedditPain: boolean;
  };
  icpDetails: {
    detectedTech: string[];
    hasAiWorkload: boolean;
    isAwsNative: boolean;
    isAgencyOrDevShop: boolean;
  };
  recommendedPitchAngle: string;
  qualifiedAt: string;
}

/**
 * Step 3 Automated Qualification & Verification Gate for 3 Dices (AWS Cloud Agency).
 *
 * Scoring Rubric (0 to 100):
 * - Domain Health (15 pts): Verified live domain vs parked/dead domain.
 * - Reachability (35 pts): Real human Founder/CTO with personal email (+25/18), LinkedIn (+10), phone (+5).
 * - Intent / Pain Trigger (30 pts): DevOps hiring (+30), Reddit cloud pain (+30), S3 direct leak (+25), Heroku/VPS migration (+20), Agency white-label (+20).
 * - ICP Tech Fit (20 pts): Modern AWS cloud-native stack (+15) + AI/Bedrock workload (+5).
 *
 * Classification:
 * - Score >= 80 -> ready_for_outreach
 * - Score 60-79 -> needs_manual_review
 * - Score < 60  -> disqualified
 */
export function qualifyLead(input: LeadQualificationInput): QualificationResult {
  const { company, contact, trigger, cloudAudit } = input;
  const qualifiedAt = new Date().toISOString();

  const combinedCorpus = [
    company.name,
    company.domain,
    company.description || "",
    (company.techStack || []).join(" "),
    trigger?.headline || "",
    trigger?.source || "",
    trigger?.signalType || "",
    contact.title || ""
  ].join(" ").toLowerCase();

  // ----------------------------------------------------
  // Gate 0: Negative Industry Disqualification
  // ----------------------------------------------------
  const negativeMatch = combinedCorpus.match(NEGATIVE_INDUSTRY_REGEX);
  if (negativeMatch) {
    return {
      score: 0,
      stage: "disqualified",
      passed: false,
      rejectionReason: `Negative industry match: non-digital trade or consumer service ("${negativeMatch[0]}").`,
      breakdown: { domainHealth: 0, reachability: 0, intentPain: 0, icpTechFit: 0, total: 0 },
      reachabilityDetails: {
        hasHumanName: false,
        isPersonalEmail: false,
        isSocketVerified: false,
        hasPersonalLinkedin: false,
        hasPhone: false
      },
      intentDetails: {
        intentAngle: "aws_finops_cost",
        triggerSummary: "Negative industry filter triggered",
        isHiringDevOps: false,
        hasS3Leak: false,
        needsMigration: false,
        hasRedditPain: false
      },
      icpDetails: {
        detectedTech: [],
        hasAiWorkload: false,
        isAwsNative: false,
        isAgencyOrDevShop: false
      },
      recommendedPitchAngle: "aws_finops_cost",
      qualifiedAt
    };
  }

  // ----------------------------------------------------
  // Dimension 1: Domain Health & Liveness (0 to 15 pts)
  // ----------------------------------------------------
  const domainClean = (company.domain || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim();

  let domainHealth = 0;
  const isParked = PARKED_DOMAIN_PATTERNS.some((p) => p.test(domainClean) || p.test(company.description || ""));

  if (!domainClean || !domainClean.includes(".") || isParked) {
    return {
      score: 0,
      stage: "disqualified",
      passed: false,
      rejectionReason: isParked
        ? `Domain "${domainClean}" appears parked, expired, or for sale.`
        : `Invalid or missing corporate domain ("${domainClean}").`,
      breakdown: { domainHealth: 0, reachability: 0, intentPain: 0, icpTechFit: 0, total: 0 },
      reachabilityDetails: {
        hasHumanName: false,
        isPersonalEmail: false,
        isSocketVerified: false,
        hasPersonalLinkedin: false,
        hasPhone: false
      },
      intentDetails: {
        intentAngle: "aws_finops_cost",
        triggerSummary: "Domain health check failed",
        isHiringDevOps: false,
        hasS3Leak: false,
        needsMigration: false,
        hasRedditPain: false
      },
      icpDetails: {
        detectedTech: [],
        hasAiWorkload: false,
        isAwsNative: false,
        isAgencyOrDevShop: false
      },
      recommendedPitchAngle: "aws_finops_cost",
      qualifiedAt
    };
  }

  // Live and valid domain
  domainHealth = 15;

  // ----------------------------------------------------
  // Dimension 2: Reachability & Decision Maker Presence (0 to 35 pts)
  // ----------------------------------------------------
  const hasHumanName = isLikelyPersonName(contact.fullName);

  // Discover candidate personal emails
  const allEmailCandidates = [
    contact.email,
    ...(contact.emailCandidates || [])
  ]
    .map(sanitizeEmail)
    .filter(Boolean);

  const personalEmails = allEmailCandidates.filter((e) => !isGenericEmail(e) && isValidEmail(e));
  const hasPersonalEmail = personalEmails.length > 0;
  const targetEmail = personalEmails[0] || (isValidEmail(contact.email) ? sanitizeEmail(contact.email) : undefined);

  const isSocketVerified =
    contact.verificationStatus === "socket_valid" ||
    contact.verificationStatus === "valid";
  const isCatchAll =
    contact.verificationStatus === "catch_all";

  const hasPersonalLinkedin = Boolean(
    contact.linkedinUrl &&
    /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i.test(contact.linkedinUrl)
  );
  const hasSearchLinkedin = Boolean(
    contact.linkedinUrl &&
    contact.linkedinUrl.includes("linkedin.com") &&
    !hasPersonalLinkedin
  );

  const cleanPhone = (contact.phone || "").replace(/[^\d]/g, "");
  const hasPhone = cleanPhone.length >= 10;

  let reachabilityScore = 0;

  if (hasHumanName) {
    // Email points
    if (hasPersonalEmail) {
      if (isSocketVerified) reachabilityScore += 25;
      else if (isCatchAll) reachabilityScore += 18;
      else reachabilityScore += 14; // valid syntax personal candidate
    } else if (targetEmail && isValidEmail(targetEmail)) {
      // Only generic email available (info@, sales@)
      reachabilityScore += 5;
    }

    // LinkedIn points
    if (hasPersonalLinkedin) {
      reachabilityScore += 10;
    } else if (hasSearchLinkedin) {
      reachabilityScore += 4;
    }

    // Phone bonus
    if (hasPhone) {
      reachabilityScore += 5;
    }
  }

  reachabilityScore = Math.min(35, reachabilityScore);

  // ----------------------------------------------------
  // Dimension 3: Intent & Pain Trigger (0 to 30 pts)
  // ----------------------------------------------------
  const isHiringDevOps =
    Boolean(
      contact.title &&
      /\b(devops|cloud|sre|platform|infrastructure|kubernetes|aws)\b/i.test(contact.title)
    ) ||
    /\b(hiring.*(devops|cloud|infrastructure|sre|kubernetes)|senior devops|cloud architect|platform engineer)\b/i.test(
      `${trigger?.headline || ""} ${trigger?.source || ""}`
    );

  const hasRedditPain =
    Boolean(trigger?.source?.includes("reddit")) ||
    /\b(cloud\s*bill|aws\s*cost|high\s*bill|egress|overspend|bill\s*shock|outage|migration\s*issue)\b/i.test(
      `${trigger?.headline || ""} ${company.description || ""}`
    );

  const hasS3Leak = Boolean(cloudAudit?.finOps?.directS3AssetLeaks);
  const hostingEnv = (cloudAudit?.hostingEnvironment || "").toLowerCase();
  const provider = (cloudAudit?.cloudProvider || "").toLowerCase();

  const needsMigration =
    provider === "heroku" ||
    provider === "render" ||
    provider === "legacy_vps" ||
    hostingEnv.includes("heroku") ||
    hostingEnv.includes("render") ||
    hostingEnv.includes("vps");

  const stack = new Set<string>((company.techStack || []).map((t) => t.toLowerCase()));
  const hasAwsInStack = stack.has("aws") || combinedCorpus.includes("aws");
  const isAws = hasAwsInStack || Boolean(cloudAudit?.isAws);

  const isAgencyOrDevShop =
    /\b(agency|studios?|design\s*agency|digital\s*agency|creative\s*agency|web\s*development|software\s*(company|development|solutions|house)|app\s*development|dev\s*shop|interactive|consultancy|digital\s*solutions)\b/i.test(
      `${company.name} ${company.description || ""} ${trigger?.headline || ""}`
    );

  let intentPain = 0;
  let intentAngle: QualificationResult["intentDetails"]["intentAngle"] = "aws_finops_cost";
  let triggerSummary = "Standard AWS Cloud & DevOps optimization trigger";

  if (isHiringDevOps) {
    intentPain = 30;
    intentAngle = "aws_devops_hiring";
    triggerSummary = `Actively hiring DevOps / Cloud Engineering: 3 Dices eliminates 3-month recruiter lag.`;
  } else if (hasRedditPain) {
    intentPain = 30;
    intentAngle = "aws_finops_cost";
    triggerSummary = `Expressed public cloud friction or AWS cost pain: Immediate FinOps audit angle.`;
  } else if (hasS3Leak) {
    intentPain = 25;
    intentAngle = "aws_finops_cost";
    triggerSummary = `Direct S3 asset leak bypassing CloudFront CDN: measurable AWS billing reduction.`;
  } else if (needsMigration) {
    intentPain = 20;
    intentAngle = "aws_migration";
    triggerSummary = `Outgrowing ${provider || "PaaS / Monolith"}: Seamless migration to AWS ECS / EKS.`;
  } else if (isAgencyOrDevShop) {
    intentPain = 20;
    intentAngle = "aws_agency_whitelabel";
    triggerSummary = `B2B Digital Agency: White-label cloud infrastructure and DevOps SLA for client builds.`;
  } else if (isAws) {
    intentPain = 20;
    intentAngle = "aws_finops_cost";
    triggerSummary = `Existing AWS footprint: 35-40% compute margin recovery via Graviton & Savings Plans.`;
  } else {
    intentPain = 10;
    intentAngle = "general_cloud";
    triggerSummary = `Tech-enabled business: Cloud modernization and DevSecOps assessment.`;
  }

  intentPain = Math.min(30, intentPain);

  // ----------------------------------------------------
  // Dimension 4: ICP Tech Fit (0 to 20 pts)
  // ----------------------------------------------------
  const CLOUD_ICP_TECH = [
    "aws", "kubernetes", "eks", "ecs", "docker", "terraform",
    "python", "go", "node.js", "next.js", "react", "postgresql",
    "redis", "mongodb", "dynamodb", "serverless", "lambda"
  ];

  const matchedTech: string[] = [];
  for (const tech of CLOUD_ICP_TECH) {
    if (stack.has(tech) || combinedCorpus.includes(tech)) {
      matchedTech.push(tech);
    }
  }

  const AI_TECH = ["amazon bedrock", "openai", "anthropic", "claude", "langchain", "llamaindex", "fastapi"];
  const matchedAi = AI_TECH.filter((t) => stack.has(t) || combinedCorpus.includes(t));
  const hasAiWorkload = matchedAi.length > 0 || /\b(ai|llm|agentic|genai|embeddings?|rag)\b/i.test(combinedCorpus);

  let icpTechFit = 0;
  if (matchedTech.length >= 3) {
    icpTechFit += 15;
  } else if (matchedTech.length >= 1) {
    icpTechFit += 10;
  } else if (isAgencyOrDevShop) {
    icpTechFit += 10;
  } else {
    icpTechFit += 5;
  }

  if (hasAiWorkload) {
    icpTechFit += 5;
    if (intentAngle === "general_cloud" || intentAngle === "aws_finops_cost") {
      intentAngle = "ai_bedrock_vpc";
      triggerSummary = "Active GenAI workload: Private Bedrock VPC integration & inference optimization.";
    }
  }

  icpTechFit = Math.min(20, icpTechFit);

  // ----------------------------------------------------
  // Total Score & Pipeline Classification Gate
  // ----------------------------------------------------
  let totalScore = domainHealth + reachabilityScore + intentPain + icpTechFit;

  // Strict Human Gate: If no genuine human contact, cap score at 35 and disqualify
  if (!hasHumanName) {
    totalScore = Math.min(totalScore, 35);
    return {
      score: totalScore,
      stage: "disqualified",
      passed: false,
      rejectionReason: "No verified personal founder or executive identified (generic inbox only).",
      breakdown: {
        domainHealth,
        reachability: 0,
        intentPain,
        icpTechFit,
        total: totalScore
      },
      reachabilityDetails: {
        hasHumanName: false,
        isPersonalEmail: hasPersonalEmail,
        isSocketVerified,
        hasPersonalLinkedin,
        hasPhone,
        targetEmail
      },
      intentDetails: {
        intentAngle,
        triggerSummary,
        isHiringDevOps,
        hasS3Leak,
        needsMigration,
        hasRedditPain
      },
      icpDetails: {
        detectedTech: matchedTech,
        hasAiWorkload,
        isAwsNative: Boolean(cloudAudit?.isAws),
        isAgencyOrDevShop
      },
      recommendedPitchAngle: intentAngle,
      qualifiedAt
    };
  }

  let stage: PipelineClassification = "disqualified";
  let passed = false;
  let rejectionReason: string | undefined;

  if (totalScore >= 80) {
    stage = "ready_for_outreach";
    passed = true;
  } else if (totalScore >= 60) {
    stage = "needs_manual_review";
    passed = false;
    rejectionReason = `Score ${totalScore}/100 qualifies for manual review (missing direct email socket verification or needs LinkedIn touch).`;
  } else {
    stage = "disqualified";
    passed = false;
    rejectionReason = `Total qualification score (${totalScore}/100) below minimum outreach threshold of 60.`;
  }

  return {
    score: totalScore,
    stage,
    passed,
    rejectionReason,
    breakdown: {
      domainHealth,
      reachability: reachabilityScore,
      intentPain,
      icpTechFit,
      total: totalScore
    },
    reachabilityDetails: {
      hasHumanName: true,
      isPersonalEmail: hasPersonalEmail,
      isSocketVerified,
      hasPersonalLinkedin,
      hasPhone,
      targetEmail,
      targetName: contact.fullName
    },
    intentDetails: {
      intentAngle,
      triggerSummary,
      isHiringDevOps,
      hasS3Leak,
      needsMigration,
      hasRedditPain
    },
    icpDetails: {
      detectedTech: matchedTech,
      hasAiWorkload,
      isAwsNative: Boolean(cloudAudit?.isAws),
      isAgencyOrDevShop
    },
    recommendedPitchAngle: intentAngle,
    qualifiedAt
  };
}

/**
 * Batch qualifies a list of leads.
 */
export function batchQualifyLeads(inputs: LeadQualificationInput[]): QualificationResult[] {
  return inputs.map(qualifyLead);
}
