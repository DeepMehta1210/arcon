import { NextResponse } from "next/server";
import { signSession, getAdminPassword, TEAM_USERS, AUTH_COOKIE_NAME } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your email and password" },
        { status: 400 }
      );
    }

    const expectedPassword = getAdminPassword();
    if (password !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" },
        { status: 401 }
      );
    }

    // Match team user or fallback to standard user
    const matchedUser = TEAM_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    ) || {
      id: `user-${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: email.split("@")[0],
      role: "admin" as const,
    };

    const token = await signSession(matchedUser);

    const response = NextResponse.json({
      success: true,
      user: matchedUser,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
