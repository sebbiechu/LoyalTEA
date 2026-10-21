// Health check for load balancers / monitoring. Reveals nothing beyond up or down.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db().ping();
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "database unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
