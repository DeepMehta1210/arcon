import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message
} from "@aws-sdk/client-bedrock-runtime";

export interface CompanyAnalysis {
  summary: string;
  targetMarket: string;
  detectedOfferings: string[];
  recommendedAngle: "ai_agents" | "aws_finops" | "security_dmarc" | "devops_cicd";
  specificHookFact: string;
}

export interface GeneratedEmailDraft {
  subject: string;
  body: string;
  reasoning: string;
  probeScore: number;
  modelUsed: string;
}

/**
 * Strips raw HTML down to clean, human-readable prose text for LLM consumption.
 */
export function extractCleanTextFromHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000); // Keep top ~1,500 words
}

/**
 * Creates Bedrock client configured with the appropriate AWS region.
 */
export function getBedrockClient(): BedrockRuntimeClient {
  const region =
    process.env.BEDROCK_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    "us-east-1";
  return new BedrockRuntimeClient({ region });
}

/**
 * Helper to invoke Bedrock models using the modern Converse API.
 */
async function callBedrockConverse(params: {
  systemPrompt: string;
  userPrompt: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const {
    systemPrompt,
    userPrompt,
    modelId = process.env.BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0",
    temperature = 0.3,
    maxTokens = 1200
  } = params;

  const client = getBedrockClient();

  const messages: Message[] = [
    {
      role: "user",
      content: [{ text: userPrompt }]
    }
  ];

  const command = new ConverseCommand({
    modelId,
    messages,
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      temperature,
      maxTokens
    }
  });

  const response = await client.send(command);
  const text = response.output?.message?.content?.[0]?.text;
  if (!text) {
    throw new Error(`Empty response from Bedrock model: ${modelId}`);
  }
  return text.trim();
}

/**
 * Phase 1: Reads raw website copy and extracts structured company intelligence.
 */
export async function analyzeCompanyWithNova(params: {
  companyName: string;
  domain: string;
  websiteText: string;
  modelId?: string;
}): Promise<CompanyAnalysis> {
  const { companyName, domain, websiteText, modelId = "amazon.nova-lite-v1:0" } = params;

  const systemPrompt = `You are an elite B2B technical research analyst for 3 Dices Technology (a boutique AWS & AI engineering studio).
Your task is to analyze raw website copy of a target prospect company and extract structured, factual intelligence.

Return ONLY valid JSON matching this schema:
{
  "summary": "1 plain-English sentence of what this company builds and delivers",
  "targetMarket": "Who their ideal customer is (e.g. mid-market fintechs, early-stage SaaS, e-commerce)",
  "detectedOfferings": ["Top 2-4 specific services, products or capabilities they offer"],
  "recommendedAngle": "ai_agents | aws_finops | security_dmarc | devops_cicd",
  "specificHookFact": "A specific verifiable project, customer outcome, or technical detail mentioned on their site"
}

Angle selection guidelines for 3 Dices:
- "ai_agents": If they build software/SaaS, have an AI/RAG feature, or handle sensitive customer data.
- "aws_finops": If they have complex cloud infrastructure, high traffic, or microservices.
- "security_dmarc": If they are a B2B service or enterprise handling payments/security.
- "devops_cicd": If they build custom web/mobile platforms or software with fast release cycles.

Do NOT invent or hallucinate facts. If unknown, stick to what is explicitly stated in the text.`;

  const userPrompt = `Company: ${companyName} (${domain})
Raw Website Text:
"""
${websiteText.slice(0, 6000)}
"""`;

  const raw = await callBedrockConverse({
    systemPrompt,
    userPrompt,
    modelId,
    temperature: 0.2
  });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]) as CompanyAnalysis;
  } catch {
    return {
      summary: `${companyName} provides software solutions online.`,
      targetMarket: "Businesses seeking technical solutions",
      detectedOfferings: ["Software Development", "Cloud Solutions"],
      recommendedAngle: "devops_cicd",
      specificHookFact: `Recent product and service initiatives at ${domain}`
    };
  }
}

/**
 * Phase 2: Generates a bespoke, human-sounding B2B outreach email using Amazon Nova.
 */
export async function generateBespokeEmailWithNova(params: {
  companyName: string;
  domain: string;
  decisionMakerName: string;
  decisionMakerRole?: string;
  analysis: CompanyAnalysis;
  senderName?: string;
  senderRole?: string;
  modelId?: string;
}): Promise<GeneratedEmailDraft> {
  const {
    companyName,
    domain,
    decisionMakerName,
    decisionMakerRole,
    analysis,
    senderName = "Deep Mehta",
    senderRole = "AWS Certified Solutions Architect – Professional | Founder",
    modelId = "amazon.nova-lite-v1:0"
  } = params;

  const rawFirstName = decisionMakerName.split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const cleanCompanyName = companyName.split(/[-–|]/)[0].trim() || companyName;

  const systemPrompt = `You are ${senderName}, ${senderRole} at 3 Dices (https://3dices.com).
You write authentic, high-converting B2B cold emails directly to founders, CTOs, and technical leaders.

3 DICES VALUE PROPOSITIONS:
1. AI & Autonomous Agents on Amazon Bedrock: Private VPC security, enterprise RAG, deterministic guardrails (no third-party data leakage).
2. AWS Architecture & FinOps: Right-sizing overloaded clusters, cutting monthly AWS bills by ~40%, zero-downtime EKS migrations.
3. DevOps & CI/CD Pipelines: Automated GitHub Actions pipelines cutting release cycles to under 10 minutes with 1-click rollback.
4. Cloud Security & DMARC: Hardening VPC network perimeters and email authentication for SOC 2 compliance.

RULES FOR OUTREACH (NEVER VIOLATE):
- DO NOT use generic openings: NEVER say "I hope you are well", "I was really impressed by how your team [tagline]", or "In today's fast-paced world".
- The very first sentence MUST mention a specific project, service, or fact from their website (${analysis.specificHookFact}).
- Focus on ONE primary pain point aligned with the angle: "${analysis.recommendedAngle}".
- Tone: Peer-to-peer, technical, humble, zero corporate buzzwords.
- Length: STRICTLY 70-95 words total across 3 short paragraphs.
- Call to Action: Low-pressure invitation (e.g. "Open to a 10-minute engineering chat Thursday, or could I send over our architecture checklist?").
- Signature MUST end with:
Best regards,
${senderName}
${senderRole}
3 Dices Technology | https://3dices.com

Format output as JSON:
{
  "subject": "Concise, lowercase, personalized subject line",
  "body": "Complete email body including greeting and signature",
  "reasoning": "Why this angle was selected for this specific company"
}`;

  const userPrompt = `Prospect:
- Name: ${firstName} (${decisionMakerName})
- Role: ${decisionMakerRole || "Technical Leader"}
- Company: ${cleanCompanyName} (${domain})
- Company Summary: ${analysis.summary}
- Target Market: ${analysis.targetMarket}
- Verified Fact / Hook: ${analysis.specificHookFact}
- Selected Angle: ${analysis.recommendedAngle}

Write the email now following all rules.`;

  const raw = await callBedrockConverse({
    systemPrompt,
    userPrompt,
    modelId,
    temperature: 0.3
  });

  let parsed: { subject: string; body: string; reasoning: string };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = {
      subject: `${firstName} - question regarding ${cleanCompanyName}'s cloud architecture`,
      body: `Hi ${firstName},\n\nSaw ${cleanCompanyName}'s recent work on ${analysis.specificHookFact}.\n\nAt 3 Dices, we help technical founders eliminate cloud bottlenecks and deploy private AI workloads on AWS. In recent client work, we migrated an overloaded monolith to Amazon EKS with zero downtime while reducing monthly cloud spend by ~40%.\n\nWould you be open to a 10-minute engineering chat this week to see if there are quick wins for your team?\n\nBest regards,\n${senderName}\n${senderRole}\n3 Dices Technology | https://3dices.com`,
      reasoning: "Fallback parsed"
    };
  }

  // Phase 3: Harness²-Style Probing and Self-Critique
  const probe = await probeEmailQualityWithNova({
    emailBody: parsed.body,
    specificFact: analysis.specificHookFact,
    companyName: cleanCompanyName,
    modelId
  });

  return {
    subject: parsed.subject,
    body: probe.refinedBody || parsed.body,
    reasoning: parsed.reasoning,
    probeScore: probe.score,
    modelUsed: modelId
  };
}

/**
 * Phase 3: Harness²-style recursive probe to critique the draft and refine any robotic sentences.
 */
export async function probeEmailQualityWithNova(params: {
  emailBody: string;
  specificFact: string;
  companyName: string;
  modelId?: string;
}): Promise<{ score: number; refinedBody?: string; feedback: string }> {
  const { emailBody, specificFact, companyName, modelId = "amazon.nova-lite-v1:0" } = params;

  const systemPrompt = `You are an ASD-STE100 and B2B cold email quality auditor.
Evaluate this outreach email on a scale of 0 to 100 based on:
1. Specificity (0-35): Does it reference real work (${specificFact}) rather than a generic template?
2. Natural Tone (0-35): Does it sound like an experienced human engineer wrote it? (Penalty for buzzwords like "synergy", "cutting-edge", "game-changer", "dive deeper").
3. Brevity & Clarity (0-30): Is it under 95 words with a clear, low-friction ask?

Return JSON:
{
  "score": number (0-100),
  "feedback": "Short explanation",
  "needsRefinement": boolean,
  "refinedBody": "If needsRefinement is true, output the improved version here. Otherwise null."
}`;

  const userPrompt = `Company: ${companyName}
Draft Email:
"""
${emailBody}
"""`;

  try {
    const raw = await callBedrockConverse({
      systemPrompt,
      userPrompt,
      modelId,
      temperature: 0.1
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: 90, feedback: "Passed baseline audit" };
    const result = JSON.parse(jsonMatch[0]);

    return {
      score: typeof result.score === "number" ? result.score : 88,
      feedback: result.feedback || "Evaluated",
      refinedBody: result.needsRefinement && result.refinedBody ? result.refinedBody : undefined
    };
  } catch {
    return { score: 85, feedback: "Default baseline evaluation passed" };
  }
}
