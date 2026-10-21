import { NextRequest, NextResponse } from "next/server";
import { normaliseCode } from "@/lib/code";
import { DRINK_IDS, STAMPS_FOR_REWARD } from "@/lib/config";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

async function withRecent(code: string, state: unknown) {
  const { data } = await db()
    .from("card_events")
    .select("kind, drink, created_at")
    .eq("card_code", code)
    .order("created_at", { ascending: false })
    .limit(5);
  return NextResponse.json({ ...(state as object), target: STAMPS_FOR_REWARD, recent: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireRole("staff");
  if ("error" in auth) return auth.error;
  const code = normaliseCode((await params).code);
  if (!code) return NextResponse.json({ error: "That isn't a valid LoyalTEA code" }, { status: 400 });
  const { data, error } = await db().rpc("card_state", { p_code: code, p_target: STAMPS_FOR_REWARD });
  if (error) return NextResponse.json({ error: "Could not load card" }, { status: 500 });
  return withRecent(code, data);
}

const MESSAGES: Record<string, string> = {
  NOT_ENOUGH_STAMPS: "This card doesn't have a free drink yet",
  NOTHING_TO_UNDO: "Nothing to undo (only actions from the last 10 minutes)",
};

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole("staff");
  if ("error" in auth) return auth.error;
  const code = normaliseCode((await params).code);
  if (!code) return NextResponse.json({ error: "That isn't a valid LoyalTEA code" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const drink = DRINK_IDS.includes(body.drink) ? body.drink : "Other";

  const call =
    action === "stamp" ? db().rpc("add_stamp", { p_code: code, p_drink: drink, p_target: STAMPS_FOR_REWARD })
    : action === "redeem" ? db().rpc("redeem_reward", { p_code: code, p_drink: drink, p_target: STAMPS_FOR_REWARD })
    : action === "undo" ? db().rpc("undo_last", { p_code: code, p_target: STAMPS_FOR_REWARD })
    : null;
  if (!call) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const { data, error } = await call;
  if (error) {
    const key = Object.keys(MESSAGES).find((k) => error.message?.includes(k));
    if (key) return NextResponse.json({ error: MESSAGES[key] }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 500 });
  }
  return withRecent(code, data);
}
