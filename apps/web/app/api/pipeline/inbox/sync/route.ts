import { NextResponse } from "next/server";
import { fetchInboundReplies } from "@arcon/outbound-email";
import { syncInboundRepliesToPostgres, getInboundConversationsSummary } from "@arcon/database";

export async function GET() {
  try {
    const threads = await getInboundConversationsSummary();
    return NextResponse.json({
      success: true,
      threadsCount: threads.length,
      threads
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
    let customConfig = undefined;
    try {
      const body = await request.json();
      if (body?.imapConfig) {
        customConfig = body.imapConfig;
      }
    } catch {}

    // 1. Fetch recent inbound messages from Zoho Mail IMAP
    const fetchResult = await fetchInboundReplies(customConfig);

    if (!fetchResult.success) {
      return NextResponse.json({
        success: false,
        error: fetchResult.error || "Failed to connect to IMAP server."
      }, { status: 400 });
    }

    // 2. Sync to PostgreSQL and advance matched leads to 'replied'
    const syncSummary = await syncInboundRepliesToPostgres(fetchResult.messages);

    return NextResponse.json({
      success: true,
      messagesFetched: fetchResult.messages.length,
      syncSummary
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
