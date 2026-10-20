import {
  extractCleanTextFromHtml,
  analyzeCompanyWithNova,
  generateBespokeEmailWithNova
} from "../src/bedrock-writer";

async function runTest() {
  const domain = process.argv[2] || "magora-systems.com";
  const companyName = process.argv[3] || "Magora";
  const contactName = process.argv[4] || "Pavel Shevtsov";
  const role = process.argv[5] || "CEO & Founder";

  console.log("==================================================");
  console.log(`[TEST] Live Amazon Nova Research & Copywriter`);
  console.log(`Target: ${companyName} (${domain})`);
  console.log(`Contact: ${contactName} - ${role}`);
  console.log("==================================================\n");

  console.log(`1. Fetching website content from https://${domain} ...`);
  let rawHtml = "";
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(8000)
    });
    rawHtml = await res.text();
  } catch (err) {
    console.warn(`[WARN] Direct fetch failed (${(err as Error).message}), attempting fallback content.`);
    rawHtml = `<html><body><h1>${companyName}</h1><p>Bespoke web applications, custom enterprise software, cloud architecture, and AI integrations for UK businesses.</p></body></html>`;
  }

  const cleanText = extractCleanTextFromHtml(rawHtml);
  console.log(`✓ Clean text extracted (${cleanText.length} characters)\n`);

  const modelId = process.env.BEDROCK_MODEL_ID || "nvidia.nemotron-nano-3-30b";
  console.log(`2. Invoking Bedrock Model (${modelId}) for company comprehension...`);
  const analysis = await analyzeCompanyWithNova({
    companyName,
    domain,
    websiteText: cleanText,
    modelId
  });

  console.log("----------------- ANALYSIS RESULT -----------------");
  console.log(`Summary:             ${analysis.summary}`);
  console.log(`Target Market:       ${analysis.targetMarket}`);
  console.log(`Detected Offerings:  ${analysis.detectedOfferings.join(", ")}`);
  console.log(`Recommended Angle:   ${analysis.recommendedAngle}`);
  console.log(`Specific Hook Fact:  ${analysis.specificHookFact}`);
  console.log("---------------------------------------------------\n");

  console.log(`3. Generating bespoke outreach with Bedrock (${modelId})...`);
  const draft = await generateBespokeEmailWithNova({
    companyName,
    domain,
    decisionMakerName: contactName,
    decisionMakerRole: role,
    analysis,
    modelId
  });

  console.log("================ GENERATED EMAIL ================");
  console.log(`Model:       ${draft.modelUsed}`);
  console.log(`Probe Score: ${draft.probeScore}/100`);
  console.log(`Subject:     ${draft.subject}\n`);
  console.log(draft.body);
  console.log("=================================================\n");
  console.log(`Reasoning:   ${draft.reasoning}`);
}

runTest().catch((err) => {
  console.error("\n❌ Test failed with error:", err);
  process.exit(1);
});
