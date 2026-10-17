import { NextResponse } from "next/server";
import { signSession, AUTH_COOKIE_NAME } from "../../../../lib/auth";
import { UserStore } from "@arcon/database";

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

    const store = UserStore.getInstance();
    const verifiedUser = store.verifyCredentials(email, password);

    if (!verifiedUser) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const sessionPayload = {
      id: verifiedUser.id,
      email: verifiedUser.email,
      name: verifiedUser.fullName,
      role: verifiedUser.role,
    };

    const token = await signSession(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
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
