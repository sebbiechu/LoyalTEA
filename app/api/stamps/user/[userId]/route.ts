export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getUserByQr, getCurrentStampCount, STAMPS_PER_CARD } from "@/lib/stamps";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "manager") {
    return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }

  const { userId } = params;

  try {
    const user = await getUserByQr(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stampCount = await getCurrentStampCount(userId);

    return NextResponse.json({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      stampCount,
      canRedeem: stampCount >= STAMPS_PER_CARD,
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
