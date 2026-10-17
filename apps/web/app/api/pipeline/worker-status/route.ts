import { NextResponse } from "next/server";
import { getAutonomousWorker } from "@/lib/autonomous-worker";
import { LeadStore } from "@arcon/database";

export async function GET() {
  try {
    const worker = getAutonomousWorker();
    const status = worker.getStatus();
    const store = LeadStore.getInstance();

    const allLeads = store.getAllLeads();
    const sourcedCount = allLeads.filter((l) => l.stage === "sourced").length;
    const researchedCount = allLeads.filter((l) => l.stage === "researched").length;

    return NextResponse.json({
      success: true,
      worker: status,
      queue: {
        sourcedPending: sourcedCount,
        researchedReadyForSales: researchedCount,
        totalLeads: allLeads.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "run_now";
    const worker = getAutonomousWorker();

    if (action === "run_now") {
      const result = await worker.runCycle();
      return NextResponse.json({
        success: true,
        message: `Cycle executed: ${result.processed} leads enriched, ${result.readyForSales} qualified for sales.`,
        result,
        worker: worker.getStatus()
      });
    }

    if (action === "pause") {
      worker.stop();
      return NextResponse.json({
        success: true,
        message: "Autonomous worker paused.",
        worker: worker.getStatus()
      });
    }

    if (action === "resume") {
      worker.start();
      return NextResponse.json({
        success: true,
        message: "Autonomous worker resumed.",
        worker: worker.getStatus()
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
