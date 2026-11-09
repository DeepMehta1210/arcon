const apiKey = process.env.NVIDIA_API_KEY || "";

async function main() {
  const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
    headers: { "Authorization": "Bearer " + apiKey }
  });
  const data = await res.json();
  console.log("First 5 raw models:", JSON.stringify(data.data?.slice(0, 5), null, 2));
}

main();
