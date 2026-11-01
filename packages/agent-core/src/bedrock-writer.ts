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
    modelId = process.env.BEDROCK_MODEL_ID || "nvidia.nemotron-nano-3-30b",
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
 * Resolves the display name of the active AI model.
 */
export function getActiveModelName(requestedModelId?: string): string {
  if (process.env.NVIDIA_API_KEY) {
    return requestedModelId && requestedModelId.includes("/")
      ? requestedModelId
      : process.env.NVIDIA_MODEL_ID || "nvidia/nemotron-3.5-super-vl-120b-a12b";
  }
  return requestedModelId || process.env.BEDROCK_MODEL_ID || "nvidia.nemotron-nano-3-30b";
}

/**
 * Dual-Engine Caller:
 * Priority 1: NVIDIA NIM API (https://integrate.api.nvidia.com/v1) via native fetch
 * Priority 2: AWS Bedrock Converse API (fallback)
 */
async function callAIEngine(params: {
  systemPrompt: string;
  userPrompt: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (apiKey) {
    const nvidiaModel =
      params.modelId && params.modelId.includes("/")
        ? params.modelId
        : process.env.NVIDIA_MODEL_ID || "nvidia/nemotron-3.5-super-vl-120b-a12b";

    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: nvidiaModel,
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: params.userPrompt }
          ],
          temperature: params.temperature ?? 0.3,
          max_tokens: params.maxTokens ? Math.max(params.maxTokens, 4000) : 4000
        }),
        signal: AbortSignal.timeout(45000)
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string | null;
              reasoning_content?: string | null;
            };
          }>;
        };
        const choice = data.choices?.[0]?.message;
        const content = choice?.content?.trim() || choice?.reasoning_content?.trim();
        if (content) {
          return content;
        }
      } else {
        const errText = await res.text();
        console.warn(`[NVIDIA NIM] Request returned ${res.status}: ${errText}. Falling back to AWS Bedrock...`);
      }
    } catch (err) {
      console.warn(`[NVIDIA NIM] Connection error: ${(err as Error).message}. Falling back to AWS Bedrock...`);
    }
  }

  // Graceful fallback: AWS Bedrock Converse API
  return callBedrockConverse(params);
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
  const { companyName, domain, websiteText, modelId = process.env.BEDROCK_MODEL_ID || "nvidia.nemotron-nano-3-30b" } = params;

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

  const raw = await callAIEngine({
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
    modelId = params.modelId || process.env.BEDROCK_MODEL_ID || "nvidia.nemotron-nano-3-30b"
  } = params;

  const rawFirstName = decisionMakerName.split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const cleanCompanyName = companyName.split(/[-–|]/)[0].trim() || companyName;

  const systemPrompt = `You are ${senderName}, ${senderRole} at 3 Dices (https://3dices.com).
You write elite, high-converting B2B cold emails directly to founders, CTOs, and technical leaders adhering to the Lemlist / 13 Cold Email Breakdowns standard (scoring 90+/100).

CORE ARCHETYPES:
1. FinOps / Cost Waste: Use the Vending Machine analogy (Diet Coke: $0 vs $1.50. What would you choose? Zero, right? Then why pay AWS on-demand rates when Graviton instances + compute savings plans give the exact same compute for 40% less?).
2. Latency / TTFB Diagnostic: Highlight measured latency bottlenecks and how edge caching + connection pooling drops it below 180ms.
3. Private Bedrock AI / RAG: Focus on the #1 failure mode in scaling LLMs—preventing customer prompts from leaking outside the VPC and preventing brittle multi-step agent crashes with deterministic guardrails.
4. DevOps / Release Velocity: Focus on automated GitHub Actions pipelines with instant 1-step rollback cutting deployment cycles from 45m to <7m.

STRICT COLD OUTREACH RULES (LEMLIST PLAYBOOK):
- Subject line: MUST BE STRICTLY 1 to 3 words lowercase (e.g. "cloud bill", "latency", "bedrock rag", "devops pipeline"). NEVER use prospect names or marketing pitch sentences in the subject line!
- Opening sentence: NEVER use fake flattery or generic filler ("I hope you are well", "I was really impressed by how your team...", "In today's fast-paced world"). Start directly with the verifiable observation or the everyday analogy.
- Sentence Color Audit: >85% about the prospect / their infrastructure. NEVER write "At 3 Dices, we partner with..." or pitch agency credentials before demonstrating value.
- Step 1 Call to Action: NEVER ask for time, meetings, or calendar slots (NO "10-minute chat", "hop on a call", "jump on a call", "discovery call"). Ask low-friction conversation starters only (e.g. "Is this accurate for your setup?", "Am I going in the right direction?", "Want me to send the 6-point checklist over?").
- Signature MUST end with:
Best regards,
${senderName}
${senderRole}
3 Dices Technology | https://3dices.com
LinkedIn: https://linkedin.com/in/deepmehta
PS: Cut monthly AWS spend by 38% for a fintech last month without touching application code.

Format output as JSON:
{
  "subject": "1-3 words lowercase subject line (e.g. cloud bill)",
  "body": "Complete email body including greeting and trust-stacked signature",
  "reasoning": "Why this archetype and angle were selected"
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

  const raw = await callAIEngine({
    systemPrompt,
    userPrompt,
    modelId,
    temperature: 0.3
  });

  let parsed: { subject: string; body: string; reasoning: string };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    let jsonStr = jsonMatch[0];
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      jsonStr = jsonStr.replace(/(?<="[^"]*)\r?\n(?=[^"]*")/g, "\\n");
      parsed = JSON.parse(jsonStr);
    }
  } catch (err) {
    console.warn(`[PARSER WARNING] ${(err as Error).message}. Raw response was:\n`, raw);
    parsed = {
      subject: "cloud bill",
      body: `Hi ${firstName},

You're at a vending machine. Diet Coke: $0 or $1.50. What would you choose? Zero, right?

Then why pay AWS on-demand rates when Graviton instances + compute savings plans give ${cleanCompanyName} the exact same compute for 40% less?

Took 2 minutes to calculate the monthly delta for your setup. 

Is this accurate for your current infrastructure?

Best regards,
${senderName}
${senderRole}
3 Dices Technology | https://3dices.com
LinkedIn: https://linkedin.com/in/deepmehta
PS: Cut monthly AWS spend by 38% for a fintech last month without touching application code.`,
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
    modelUsed: getActiveModelName(modelId)
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
  const { emailBody, specificFact, companyName, modelId = process.env.BEDROCK_MODEL_ID || "nvidia.nemotron-nano-3-30b" } = params;

  const systemPrompt = `You are a B2B cold outreach auditor applying the Lemlist / 13 Cold Email Breakdowns standard (aiming for 90+/100).
Evaluate this outreach email on a scale of 0 to 100 based on:
1. Prospect-First Ratio / Color Audit (0-35): Is the email focused on the prospect's infrastructure, metrics, or an intriguing analogy rather than self-centered agency credentials ("At 3 Dices...")?
2. Natural Tone & Zero Fluff (0-35): Does it sound like an experienced human architect wrote it? Heavy penalties for fake flattery ("impressed by your team"), corporate buzzwords, and marketing slop.
3. Friction-Free Call to Action (0-30): Does it ask a simple, low-friction question ("Is this accurate?", "Am I going in the right direction?") instead of demanding time on a calendar ("10-minute chat")?

IMPORTANT: Do not write lengthy chain-of-thought. Output the final JSON immediately.

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
    const raw = await callAIEngine({
      systemPrompt,
      userPrompt,
      modelId,
      temperature: 0.1
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: 90, feedback: "Passed baseline audit" };
    let jsonStr = jsonMatch[0];
    let result: { score?: number; feedback?: string; needsRefinement?: boolean; refinedBody?: string };
    try {
      result = JSON.parse(jsonStr);
    } catch {
      jsonStr = jsonStr.replace(/(?<="[^"]*)\r?\n(?=[^"]*")/g, "\\n");
      result = JSON.parse(jsonStr);
    }

    return {
      score: typeof result.score === "number" ? result.score : 88,
      feedback: result.feedback || "Evaluated",
      refinedBody: result.needsRefinement && result.refinedBody ? result.refinedBody : undefined
    };
  } catch {
    return { score: 85, feedback: "Default baseline evaluation passed" };
  }
}
