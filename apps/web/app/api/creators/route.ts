import { NextResponse } from "next/server";
import { scrapeB2CCreator } from "@arcon/scrapers";
import { LeadStore } from "@arcon/database";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, identifier } = body;

    if (!platform || !identifier) {
      return NextResponse.json(
        { success: false, error: "Missing platform or identifier" },
        { status: 400 }
      );
    }

    const rawLead = await scrapeB2CCreator(platform, identifier);
    const store = LeadStore.getInstance();
    store.addLeads([rawLead]);
    const stored = store.getLeadById(rawLead.id) || rawLead;

    return NextResponse.json({
      success: true,
      lead: stored,
      stats: store.getStats()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
