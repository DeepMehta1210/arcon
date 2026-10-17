import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, AUTH_COOKIE_NAME } from "@/lib/auth";
import { LeadStore } from "@arcon/database";
import { importLeadsFromCsvContent } from "@arcon/scrapers";

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required to import CSV leads" },
        { status: 403 }
      );
    }

    let csvContent = "";
    let fileName = "admin_upload.csv";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided in form data" },
          { status: 400 }
        );
      }
      csvContent = await file.text();
      fileName = file.name || fileName;
    } else {
      const body = await request.json();
      csvContent = body.csvContent || "";
      fileName = body.fileName || fileName;
    }

    if (!csvContent || !csvContent.trim()) {
      return NextResponse.json(
        { success: false, error: "CSV content is empty" },
        { status: 400 }
      );
    }

    const rawLeads = importLeadsFromCsvContent(csvContent, fileName);

    if (rawLeads.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid lead rows found in the CSV. Please ensure headers (company/name, email, etc.) are present." },
        { status: 400 }
      );
    }

    const store = LeadStore.getInstance();
    const res = store.addLeads(rawLeads);

    return NextResponse.json({
      success: true,
      fileName,
      totalParsed: rawLeads.length,
      added: res.added,
      stats: store.getStats()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
