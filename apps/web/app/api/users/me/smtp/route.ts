import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, AUTH_COOKIE_NAME } from "@/lib/auth";
import { UserStore } from "@arcon/database";
import { testSmtpConnection } from "@arcon/outbound-email";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const store = UserStore.getInstance();
    const dbUser = store.getUserById(session.id) || store.getUserByEmail(session.email);
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const smtp = store.getUserSmtp(dbUser.id);
    return NextResponse.json({
      success: true,
      configured: Boolean(smtp?.pass),
      user: smtp?.user || dbUser.email,
      host: smtp?.host || "smtp.zoho.in",
      port: smtp?.port || 465,
      fromName: smtp?.fromName || dbUser.fullName
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const store = UserStore.getInstance();
    const dbUser = store.getUserById(session.id) || store.getUserByEmail(session.email);
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const appPassword = (body.appPassword || "").trim().replace(/\s+/g, "");
    const host = (body.host || "smtp.zoho.in").trim();
    const port = parseInt(body.port || "465", 10);
    const secure = port === 465;

    if (!appPassword) {
      return NextResponse.json(
        { success: false, error: "Please enter your Zoho App Password." },
        { status: 400 }
      );
    }

    // 1. Live handshake test with Zoho SMTP server
    const testResult = await testSmtpConnection({
      host,
      port,
      secure,
      user: dbUser.email,
      pass: appPassword,
      fromEmail: dbUser.email,
      fromName: dbUser.fullName
    });

    if (!testResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Zoho SMTP connection failed: ${testResult.error}. Verify your App Password under Zoho Security -> App Passwords.`
        },
        { status: 422 }
      );
    }

    // 2. Save verified credentials in user profile
    store.setUserSmtp(dbUser.id, {
      host,
      port,
      secure,
      user: dbUser.email,
      pass: appPassword,
      fromName: dbUser.fullName
    });

    return NextResponse.json({
      success: true,
      message: `Zoho SMTP connected and verified successfully for ${dbUser.email}!`
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const store = UserStore.getInstance();
    const dbUser = store.getUserById(session.id) || store.getUserByEmail(session.email);
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    store.setUserSmtp(dbUser.id, {
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      user: dbUser.email,
      pass: "",
      fromName: dbUser.fullName
    });

    return NextResponse.json({ success: true, message: "SMTP configuration removed." });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
