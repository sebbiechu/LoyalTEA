export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { addStamp, redeemReward } from "@/lib/stamps";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "manager") {
    return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }

  try {
    const { userId, drinkType, reusableCup, action } = await req.json();

    if (!userId || !drinkType) {
      return NextResponse.json(
        { error: "userId and drinkType are required" },
        { status: 400 }
      );
    }

    if (action === "redeem") {
      const stamp = await redeemReward({
        userId,
        drinkType,
        reusableCup: Boolean(reusableCup),
        managerId: session.id,
      });
      return NextResponse.json({ success: true, stamp });
    } else {
      const stamp = await addStamp({
        userId,
        drinkType,
        reusableCup: Boolean(reusableCup),
        managerId: session.id,
      });
      return NextResponse.json({ success: true, stamp });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process stamp";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
