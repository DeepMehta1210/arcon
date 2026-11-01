import { generateBespokeEmailWithNova } from "../src/bedrock-writer";

async function main() {
  const analysis = {
    summary: "Magora is a London-based software development agency that builds custom web and mobile apps, enterprise software, and AI/ML products for startups and enterprises.",
    targetMarket: "Startups needing MVPs and mid-market to enterprise businesses in regulated industries such as healthcare, fintech, and logistics across the UK, EU, and US.",
    detectedOfferings: ["Custom software and MVP development", "AI & ML development including AI agents and RAG", "Mobile and web application development", "Staff augmentation and dedicated development teams"],
    recommendedAngle: "ai_agents" as const,
    specificHookFact: "AstraZeneca's patient-adherence platform built by Magora is live in 14 countries, drove +38% therapy adherence, onboarded 1.2M patients, and launched 9 weeks from brief."
  };

  const draft = await generateBespokeEmailWithNova({
    companyName: "Magora",
    domain: "magora-systems.com",
    decisionMakerName: "Pavel Shevtsov",
    decisionMakerRole: "CEO & Founder",
    analysis,
    modelId: "nvidia/nemotron-3.5-super-vl-120b-a12b"
  });

  console.log("Subject:", draft.subject);
  console.log("Probe Score:", draft.probeScore);
  console.log("Reasoning:", draft.reasoning);
  console.log("Body:\n", draft.body);
}

main().catch(console.error);
