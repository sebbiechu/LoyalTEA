export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getCurrentStampCount, STAMPS_PER_CARD } from "@/lib/stamps";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "manager") return NextResponse.json({ error: "Managers only" }, { status: 403 });

  const username = new URL(req.url).searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  const db = createServiceClient();
  const { data: user, error } = await db
    .from("users")
    .select("id, username, full_name, role")
    .eq("username", username.trim().toLowerCase())
    .single();

  if (error || !user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const stampCount = await getCurrentStampCount(user.id);
  return NextResponse.json({ ...user, stampCount, canRedeem: stampCount >= STAMPS_PER_CARD });
}
