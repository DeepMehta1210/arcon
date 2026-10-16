import { NextResponse } from "next/server";
import { dispatchColdEmail } from "@arcon/outbound-email";
import { LeadStore } from "@arcon/database";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toEmail, toName, subject, body: emailBody, leadId, senderEmail, senderName } = body;

    if (!toEmail || !subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: toEmail, subject, or body" },
        { status: 400 }
      );
    }

    const receipt = await dispatchColdEmail({
      toEmail,
      toName,
      subject,
      body: emailBody,
      enforceSte100: false,
      smtpConfig: {
        host: process.env.SMTP_HOST || "",
        port: parseInt(process.env.SMTP_PORT || "465", 10),
        secure: process.env.SMTP_SECURE !== "false",
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
        fromEmail: senderEmail || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "deep@3dices.com",
        fromName: senderName || process.env.SMTP_FROM_NAME || "Deep Mehta"
      }
    });

    if (receipt.status === "rejected_linter") {
      return NextResponse.json(
        { success: false, receipt, error: receipt.error },
        { status: 422 }
      );
    }

    // Advance lead stage if leadId is provided
    if (leadId) {
      const store = LeadStore.getInstance();
      const existing = store.getLeadById(leadId);
      store.updateLead(leadId, {
        stage: "contacted",
        signalData: {
          ...(existing?.signalData || {}),
          lastOutbound: {
            timestamp: receipt.timestamp,
            senderEmail: receipt.fromEmail,
            subject: receipt.subject,
            status: receipt.status,
            messageId: receipt.messageId
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      receipt
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
