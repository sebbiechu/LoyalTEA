// Public: a colleague's phone asks "how many stamps are on my card?"
// Read-only. Nothing a customer does can write to the database.
import { NextRequest, NextResponse } from "next/server";
import { normaliseCode } from "@/lib/code";
import { STAMPS_FOR_REWARD, type CardState } from "@/lib/config";
import { db } from "@/lib/db";
import { secureCookies } from "@/lib/cookies";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = normaliseCode((await params).code);
  if (!code) return NextResponse.json({ error: "Invalid card code" }, { status: 400 });

  let s: CardState;
  try {
    s = await db().call<CardState>("card_state", { p_code: code, p_target: STAMPS_FOR_REWARD });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load card" }, { status: 500 });
  }
  const res = NextResponse.json(
    { code, balance: s.balance, total_stamps: s.total_stamps, total_redeemed: s.total_redeemed, last_event_at: s.last_event_at, target: STAMPS_FOR_REWARD },
    { headers: { "Cache-Control": "no-store" } },
  );
  // Server-set backup of the card code. Lasts longer than script-set storage on iOS Safari.
  res.cookies.set("lt_card", code, {
    httpOnly: false,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return res;
}
