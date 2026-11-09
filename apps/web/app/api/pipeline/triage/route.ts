import { NextResponse } from "next/server";
import { getTriageSummary, runStep3QualificationTriage } from "@arcon/database";

export async function GET() {
  try {
    const summary = await getTriageSummary();
    return NextResponse.json({
      success: true,
      ...summary
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const summary = await runStep3QualificationTriage();
    return NextResponse.json({
      success: true,
      message: "Step 3 Qualification Triage completed successfully.",
      summary
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
