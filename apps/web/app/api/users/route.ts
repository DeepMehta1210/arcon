import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, AUTH_COOKIE_NAME } from "../../../lib/auth";
import { UserStore, UserRole } from "@arcon/database";

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const store = UserStore.getInstance();
    const users = store.getAllUsers();

    return NextResponse.json({
      success: true,
      users,
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
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, fullName, password, role } = body;

    if (!email || !fullName || !password || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: email, fullName, password, and role" },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ["admin", "sales", "viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const store = UserStore.getInstance();
    const newUser = store.createUser({
      email,
      fullName,
      password,
      role,
    });

    return NextResponse.json({
      success: true,
      user: newUser,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
