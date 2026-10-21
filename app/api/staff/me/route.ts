import { NextResponse } from "next/server";
import { getRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ role: await getRole() }, { headers: { "Cache-Control": "no-store" } });
}
