import { NextResponse } from "next/server";
import { dispatchWhatsAppTouch } from "@arcon/outbound-wa";
import { LeadStore } from "@arcon/database";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, text, leadId } = body;

    if (!phone || !text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: phone or text" },
        { status: 400 }
      );
    }

    const openWaUrl = process.env.OPENWA_URL || "http://localhost:3050";

    const receipt = await dispatchWhatsAppTouch({
      phone,
      text,
      enforceSte100: false,
      simulateJitter: true,
      wahaConfig: {
        baseUrl: openWaUrl,
        isGatewayOpenWA: true,
      },
    });

    if (receipt.status === "failed") {
      return NextResponse.json(
        {
          success: false,
          receipt,
          error: receipt.error || "Failed to dispatch WhatsApp message via OpenWA Gateway",
        },
        { status: 502 }
      );
    }

    // Advance lead stage in database
    if (leadId) {
      const store = LeadStore.getInstance();
      const existing = store.getLeadById(leadId);
      store.updateLead(leadId, {
        stage: "contacted",
        signalData: {
          ...(existing?.signalData || {}),
          lastWhatsAppOutbound: {
            timestamp: receipt.timestamp,
            recipientPhone: receipt.recipientPhone,
            messageId: receipt.messageId,
            status: receipt.status,
            gateway: "OpenWA",
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      receipt,
      gateway: "OpenWA",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
