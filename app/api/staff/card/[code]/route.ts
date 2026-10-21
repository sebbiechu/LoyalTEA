import { NextRequest, NextResponse } from "next/server";
import { normaliseCode } from "@/lib/code";
import { DRINK_IDS, STAMPS_FOR_REWARD, type CardState } from "@/lib/config";
import { requireRole } from "@/lib/session";
import { db, DbError } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

async function withRecent(code: string, state: CardState) {
  const recent = await db().recentEvents(code, 5);
  return NextResponse.json({ ...state, target: STAMPS_FOR_REWARD, recent }, { headers: { "Cache-Control": "no-store" } });
}

const MESSAGES: Record<string, string> = {
  NOT_ENOUGH_STAMPS: "This card doesn't have a free drink yet",
  NOTHING_TO_UNDO: "Nothing to undo (only actions from the last 10 minutes)",
};

function fail(e: unknown) {
  const msg = e instanceof DbError ? e.message : "";
  const key = Object.keys(MESSAGES).find((k) => msg.includes(k));
  if (key) return NextResponse.json({ error: MESSAGES[key] }, { status: 409 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong, try again" }, { status: 500 });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireRole("staff");
  if ("error" in auth) return auth.error;
  const code = normaliseCode((await params).code);
  if (!code) return NextResponse.json({ error: "That isn't a valid LoyalTEA code" }, { status: 400 });
  try {
    return await withRecent(code, await db().call<CardState>("card_state", { p_code: code, p_target: STAMPS_FOR_REWARD }));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole("staff");
  if ("error" in auth) return auth.error;
  const code = normaliseCode((await params).code);
  if (!code) return NextResponse.json({ error: "That isn't a valid LoyalTEA code" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const drink = DRINK_IDS.includes(body.drink) ? body.drink : "Other";

  try {
    let state: CardState;
    if (action === "stamp") state = await db().call("add_stamp", { p_code: code, p_drink: drink, p_target: STAMPS_FOR_REWARD });
    else if (action === "redeem") state = await db().call("redeem_reward", { p_code: code, p_drink: drink, p_target: STAMPS_FOR_REWARD });
    else if (action === "undo") state = await db().call("undo_last", { p_code: code, p_target: STAMPS_FOR_REWARD });
    else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return await withRecent(code, state);
  } catch (e) {
    return fail(e);
  }
}
