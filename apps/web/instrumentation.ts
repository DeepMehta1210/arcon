export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutonomousWorker } = await import("@/lib/autonomous-worker");
    startAutonomousWorker();
  }
}
