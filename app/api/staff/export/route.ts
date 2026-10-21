import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = [];
  try {
    for (let offset = 0; ; offset += 1000) {
      const page = await db().eventsSince(since, offset, 1000);
      rows.push(...page);
      if (page.length < 1000) break;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
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
