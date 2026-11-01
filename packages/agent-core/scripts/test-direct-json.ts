async function main() {
  const apiKey = process.env.NVIDIA_API_KEY;
  const systemPrompt = `You are an elite B2B technical email writer.
IMPORTANT: Do NOT write lengthy chain-of-thought or word-by-word counts. Output the final JSON immediately.
Return ONLY valid JSON matching:
{
  "subject": "concise, lowercase, personalized subject",
  "body": "complete 3-paragraph email body with greeting and signature",
  "reasoning": "1 sentence explanation"
}`;

  const userPrompt = `Prospect:
- Name: Pavel Shevtsov (CEO & Founder)
- Company: Magora (magora-systems.com)
- Verified Hook: Magora built AstraZeneca's patient-adherence platform across 14 countries (1.2M patients, +38% adherence, launched in 9 weeks under GDPR/MHRA).
- 3 Dices Angle: AI & Autonomous Agents on Amazon Bedrock (private VPC, zero data leakage, enterprise RAG, deterministic guardrails).

Write a 75-word peer-to-peer cold email from Deep Mehta (AWS Certified Solutions Architect – Professional | Founder, 3 Dices). Output JSON now.`;

  console.log("Calling model with direct JSON instruction...");
  const t0 = Date.now();
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.2
    })
  });

  const d = await res.json();
  console.log(`Finished in ${(Date.now() - t0) / 1000}s. Status:`, res.status);
  console.log("Content:\n", d.choices?.[0]?.message?.content);
  if (d.choices?.[0]?.message?.reasoning_content) {
    console.log("\nReasoning tokens:", d.usage?.completion_tokens_details?.reasoning_tokens);
  }
}

main().catch(console.error);
