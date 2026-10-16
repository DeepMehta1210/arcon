import { NextResponse } from "next/server";
import {
  scrapeLocalPlaces,
  fetchShowHNSignals,
  searchYCCompanies
} from "@arcon/scrapers";
import { LeadStore } from "@arcon/database";
import type { RawLead } from "@arcon/shared-types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, keyword, city, limit = 15, batch = "W24" } = body;

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: channel" },
        { status: 400 }
      );
    }

    let minedLeads: RawLead[] = [];

    if (channel === "places") {
      minedLeads = await scrapeLocalPlaces({
        keyword: keyword || "IT Services",
        city: city || "London",
        limit
      });
    } else if (channel === "show_hn") {
      const result = await fetchShowHNSignals({
        query: keyword || "Show HN",
        limit
      });
      minedLeads = result.leads;
    } else if (channel === "yc") {
      minedLeads = await searchYCCompanies({
        batch,
        query: keyword,
        limit
      });
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported channel: ${channel}` },
        { status: 400 }
      );
    }

    const store = LeadStore.getInstance();
    const { added, total } = store.addLeads(minedLeads);

    return NextResponse.json({
      success: true,
      channel,
      minedCount: minedLeads.length,
      added,
      total,
      stats: store.getStats()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
