export async function register() {
  // Autonomous worker disabled in Next.js background to avoid regex data corruption.
  // Verification and research are driven directly by Antigravity / verified pipeline.
  if (process.env.ENABLE_AUTO_WORKER === "true" && process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutonomousWorker } = await import("@/lib/autonomous-worker");
    startAutonomousWorker();
  }
}
