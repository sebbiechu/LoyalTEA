import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  getCurrentCycleStamps,
  getRecentStamps,
  STAMPS_PER_CARD,
} from "@/lib/stamps";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [cycleStamps, recentStamps] = await Promise.all([
      getCurrentCycleStamps(session.id),
      getRecentStamps(session.id, 10),
    ]);

    return NextResponse.json({
      stampCount: cycleStamps.length,
      stampsRequired: STAMPS_PER_CARD,
      canRedeem: cycleStamps.length >= STAMPS_PER_CARD,
      recentStamps,
    });
  } catch (err) {
    console.error("Error fetching stamps:", err);
    return NextResponse.json({ error: "Failed to fetch stamps" }, { status: 500 });
  }
}
