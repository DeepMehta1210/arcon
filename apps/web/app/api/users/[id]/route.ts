import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, AUTH_COOKIE_NAME } from "../../../../lib/auth";
import { UserStore } from "@arcon/database";

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const store = UserStore.getInstance();
    const success = store.deleteUser(id, admin.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "User not found or cannot be deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User successfully deleted",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}
