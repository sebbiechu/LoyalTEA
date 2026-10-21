import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const { data, error } = await db().rpc("report_summary", { p_days: days });
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
  return NextResponse.json({ days, ...data }, { headers: { "Cache-Control": "no-store" } });
}
