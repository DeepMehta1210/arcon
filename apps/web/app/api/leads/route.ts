import { NextResponse } from "next/server";
import { LeadStore, runLeadIngestion } from "@growth-os/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const query = searchParams.get("q")?.toLowerCase();
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const store = LeadStore.getInstance();
    let leads = store.getAllLeads();

    // If store is empty, auto-ingest
    if (leads.length === 0) {
      runLeadIngestion();
      leads = store.getAllLeads();
    }

    if (stage) {
      leads = leads.filter((l) => l.stage === stage);
    }

    if (query) {
      leads = leads.filter(
        (l) =>
          l.companyName.toLowerCase().includes(query) ||
          l.contactName?.toLowerCase().includes(query) ||
          l.headline?.toLowerCase().includes(query) ||
          l.location?.city?.toLowerCase().includes(query) ||
          l.location?.country?.toLowerCase().includes(query)
      );
    }

    const total = leads.length;
    const paginatedLeads = leads.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      stats: store.getStats(),
      total,
      leads: paginatedLeads
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
    const result = runLeadIngestion();
    return NextResponse.json({
      success: true,
      message: `Ingestion completed. Processed ${result.filesProcessed.length} files.`,
      result
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
