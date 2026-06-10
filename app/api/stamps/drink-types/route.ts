import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDrinkTypes } from "@/lib/stamps";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drinkTypes = await getDrinkTypes();
    return NextResponse.json({ drinkTypes });
  } catch (err) {
    console.error("Error fetching drink types:", err);
    return NextResponse.json({ error: "Failed to fetch drink types" }, { status: 500 });
  }
}
