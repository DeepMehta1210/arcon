import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, AUTH_COOKIE_NAME } from "@/lib/auth";
import { dispatchColdEmail } from "@arcon/outbound-email";
import { LeadStore, UserStore } from "@arcon/database";

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

    // 1. Identify logged in user and their personal Zoho SMTP credentials
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;

    const userStore = UserStore.getInstance();
    const dbUser = session ? (userStore.getUserById(session.id) || userStore.getUserByEmail(session.email)) : null;
    const userSmtp = dbUser ? userStore.getUserSmtp(dbUser.id) : null;

    // 2. Resolve credentials (Priority: Per-user SMTP -> Global Env -> Fallback)
    const effectiveUser = userSmtp?.user || process.env.SMTP_USER || process.env.ZOHO_USER || senderEmail || dbUser?.email || "deep@3dices.com";
    const effectivePass = userSmtp?.pass || process.env.SMTP_PASS || process.env.ZOHO_PASSWORD || "";
    const effectiveHost = userSmtp?.host || process.env.SMTP_HOST || (effectivePass ? "smtp.zoho.in" : "");
    const effectivePort = userSmtp?.port || parseInt(process.env.SMTP_PORT || "465", 10);
    const effectiveSecure = effectivePort === 465;
    const fromName = userSmtp?.fromName || senderName || dbUser?.fullName || process.env.SMTP_FROM_NAME || "Deep Mehta";

    const hasLiveSmtp = Boolean(effectiveHost && effectivePass);

    const receipt = await dispatchColdEmail({
      toEmail,
      toName,
      subject,
      body: emailBody,
      enforceSte100: false,
      smtpConfig: hasLiveSmtp ? {
        host: effectiveHost,
        port: effectivePort,
        secure: effectiveSecure,
        user: effectiveUser,
        pass: effectivePass,
        fromEmail: effectiveUser,
        fromName
      } : undefined
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
            messageId: receipt.messageId,
            isLiveSmtp: hasLiveSmtp
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      receipt,
      isLiveSmtp: hasLiveSmtp,
      sender: effectiveUser
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
