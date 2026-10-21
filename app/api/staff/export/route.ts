import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const rows: { created_at: string; kind: string; drink: string | null; card_code: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from("card_events")
      .select("created_at, kind, drink, card_code")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "short", timeStyle: "short" });
  const csv = [
    "date_time,action,drink,card",
    ...rows.map((r) => [fmt.format(new Date(r.created_at)), r.kind, r.drink ?? "", r.card_code.slice(-4)].join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="loyaltea-last-${days}-days.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
