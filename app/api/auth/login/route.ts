import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { createSession, SESSION_COOKIE_NAME, SessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return NextResponse.json(
        { error: "Username and PIN are required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();
    const { data: user, error } = await db
      .from("users")
      .select("id, username, full_name, pin_hash, role")
      .eq("username", username.trim().toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid username or PIN" },
        { status: 401 }
      );
    }

    const pinMatch = await bcrypt.compare(String(pin), user.pin_hash);
    if (!pinMatch) {
      return NextResponse.json(
        { error: "Invalid username or PIN" },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role as "colleague" | "manager",
    };

    const token = await createSession(sessionUser);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
