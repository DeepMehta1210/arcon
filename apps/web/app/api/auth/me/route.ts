import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, AUTH_COOKIE_NAME, TEAM_USERS } from "../../../../lib/auth";

export async function GET(request: Request) {
  try {
    // 1. Check for Cloudflare Zero Trust header
    const cfEmail = request.headers.get("cf-access-authenticated-user-email");
    if (cfEmail) {
      const matched = TEAM_USERS.find(
        (u) => u.email.toLowerCase() === cfEmail.trim().toLowerCase()
      ) || {
        id: `user-${Date.now()}`,
        email: cfEmail.trim().toLowerCase(),
        name: cfEmail.split("@")[0],
        role: "admin" as const,
      };
      return NextResponse.json({ authenticated: true, user: matched });
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

    return NextResponse.json({ authenticated: true, user: session });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
