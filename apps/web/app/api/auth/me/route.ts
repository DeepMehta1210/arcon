import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, AUTH_COOKIE_NAME } from "../../../../lib/auth";
import { UserStore } from "@arcon/database";

export async function GET(request: Request) {
  try {
    const store = UserStore.getInstance();

    // 1. Check for Cloudflare Zero Trust header (if ever enabled)
    const cfEmail = request.headers.get("cf-access-authenticated-user-email");
    if (cfEmail) {
      const dbUser = store.getUserByEmail(cfEmail);
      const user = dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.fullName,
            role: dbUser.role,
          }
        : {
            id: `user-${Date.now()}`,
            email: cfEmail.trim().toLowerCase(),
            name: cfEmail.split("@")[0],
            role: "admin" as const,
          };
      return NextResponse.json({ authenticated: true, user });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Refresh role and status from database if user exists
    const dbUser = store.getUserById(session.id) || store.getUserByEmail(session.email);
    if (dbUser) {
      if (dbUser.status !== "active") {
        return NextResponse.json({ authenticated: false, user: null, error: "Account suspended" });
      }
      return NextResponse.json({
        authenticated: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.fullName,
          role: dbUser.role,
          smtpConfigured: Boolean(dbUser.smtpConfig?.pass),
          smtpUser: dbUser.smtpConfig?.user || dbUser.email,
        },
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        ...session,
        smtpConfigured: false
      }
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
