export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getTodayStats } from "@/lib/stamps";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "manager") {
    return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }

  try {
    const stats = await getTodayStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
