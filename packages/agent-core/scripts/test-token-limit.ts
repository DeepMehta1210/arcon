async function main() {
  const apiKey = process.env.NVIDIA_API_KEY;
  const systemPrompt = `You are an elite B2B technical email writer.
You must return ONLY a JSON object:
{
  "subject": "...",
  "body": "...",
  "reasoning": "..."
}`;

  const userPrompt = `Write a bespoke 80-word email from Deep Mehta (Founder, 3 Dices) to Pavel Shevtsov (CEO, Magora).
Hook: AstraZeneca patient-adherence platform onboarded 1.2M patients across 14 countries in 9 weeks.
Angle: Deploying private autonomous agents on AWS Bedrock inside client VPC without data leakage.`;

  console.log("Calling nvidia/nemotron-3.5-super-vl-120b-a12b with max_tokens: 4000...");
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
  console.log("Usage:", JSON.stringify(d.usage));
  console.log("\n--- CONTENT ---");
  console.log(d.choices?.[0]?.message?.content);
}

main().catch(console.error);
