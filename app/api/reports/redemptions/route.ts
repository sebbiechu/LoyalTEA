export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRedemptionLog } from "@/lib/stamps";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "manager") {
    return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "100");
  const offset = Number(searchParams.get("offset") ?? "0");

  try {
    const redemptions = await getRedemptionLog({ from, to, limit, offset });
    return NextResponse.json({ redemptions });
  } catch (err) {
    console.error("Error fetching redemptions:", err);
    return NextResponse.json({ error: "Failed to fetch redemptions" }, { status: 500 });
  }
}
