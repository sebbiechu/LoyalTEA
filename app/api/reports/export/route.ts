export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRedemptionLog } from "@/lib/stamps";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "manager") {
    return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const redemptions = await getRedemptionLog({ from, to, limit: 5000 });

    // Build CSV
    const headers = ["Date", "Time", "Colleague Name", "Username", "Drink", "Reusable Cup", "Manager"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = redemptions.map((r: any) => {
      const date = new Date(r.created_at);
      return [
        format(date, "yyyy-MM-dd"),
        format(date, "HH:mm:ss"),
        r.user?.full_name ?? "",
        r.user?.username ?? "",
        r.drink_type,
        r.reusable_cup ? "Yes" : "No",
        r.manager?.full_name ?? "",
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="loyaltea-redemptions-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
