export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { createSession, SESSION_COOKIE_NAME, SessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { full_name, username, pin } = await req.json();
    if (!full_name || !username || !pin) return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    if (String(pin).length < 4) return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });

    const db = createServiceClient();

    // Check username not already taken
    const { data: existing } = await db.from("users").select("id").eq("username", username.trim().toLowerCase()).single();
    if (existing) return NextResponse.json({ error: "Username already taken — try a different one" }, { status: 409 });

    const pin_hash = await bcrypt.hash(String(pin), 10);
    const { data: user, error } = await db
      .from("users")
      .insert({ full_name: full_name.trim(), username: username.trim().toLowerCase(), pin_hash, role: "colleague" })
      .select("id, username, full_name, role")
      .single();

    if (error) throw error;

    const sessionUser: SessionUser = { id: user.id, username: user.username, full_name: user.full_name, role: "colleague" };
    const token = await createSession(sessionUser);
    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set(SESSION_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
