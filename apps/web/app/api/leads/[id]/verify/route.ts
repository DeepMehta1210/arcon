import { NextResponse } from "next/server";
import { LeadStore } from "@arcon/database";
import { verifyEmail } from "@arcon/verifier";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = LeadStore.getInstance();
    const lead = store.getLeadById(id);

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    const email = lead.emailCandidates[0];
    if (!email) {
      return NextResponse.json(
        { success: false, error: "No email candidate available for this lead" },
        { status: 400 }
      );
    }

    const result = await verifyEmail(email);
    const verificationStatus =
      result.exists
        ? "socket_valid"
        : result.isCatchAll
        ? "catch_all"
        : "socket_invalid";

    const updated = store.updateLead(id, {
      verificationStatus,
      stage: result.exists ? "verified" : lead.stage
    });

    return NextResponse.json({
      success: true,
      result,
      lead: updated
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
