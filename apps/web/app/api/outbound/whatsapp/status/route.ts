import { NextResponse } from "next/server";

export async function GET() {
  const openWaUrl = process.env.OPENWA_URL || "http://localhost:3050";

  try {
    const res = await fetch(`${openWaUrl}/api/v1/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // 2-second timeout to avoid UI blocking if OpenWA is not running
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) {
      return NextResponse.json({
        available: false,
        status: "UNREACHABLE",
        gatewayUrl: openWaUrl,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      available: true,
      status: data.engine?.status || "UNKNOWN",
      engine: data.engine?.type,
      banner: data.banner,
      gatewayUrl: openWaUrl,
    });
  } catch {
    return NextResponse.json({
      available: false,
      status: "STOPPED",
      gatewayUrl: openWaUrl,
      message: "OpenWA gateway is not running. Start with 'cd apps/openwa && bun run dev'.",
    });
  }
}
