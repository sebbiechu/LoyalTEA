import { NextRequest, NextResponse } from "next/server";
import { roleForPin, setSession } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const WINDOW_MIN = 15;
const MAX_FAILURES = 15; // across everyone, per 15 minutes

export async function POST(req: NextRequest) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  if (typeof pin !== "string" || !/^\d{4,12}$/.test(pin))
    return NextResponse.json({ error: "Enter your PIN" }, { status: 400 });

  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await db().from("pin_failures").select("id", { count: "exact", head: true }).gte("at", since);
  if ((count ?? 0) >= MAX_FAILURES)
    return NextResponse.json({ error: `Too many wrong PINs. Try again in ${WINDOW_MIN} minutes.` }, { status: 429 });

  const role = roleForPin(pin);
  if (!role) {
    await db().from("pin_failures").insert({});
    await db().from("pin_failures").delete().lt("at", new Date(Date.now() - 86_400_000).toISOString());
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }

  const res = NextResponse.json({ role });
  await setSession(res, role);
  return res;
}
