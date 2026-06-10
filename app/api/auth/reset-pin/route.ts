import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { username, full_name, new_pin } = await req.json();

    if (!username || !full_name || !new_pin) {
      return NextResponse.json(
        { error: "Username, full name, and new PIN are required" },
        { status: 400 }
      );
    }

    if (String(new_pin).length < 4) {
      return NextResponse.json(
        { error: "PIN must be at least 4 digits" },
        { status: 400 }
      );
    }

    const db = createServiceClient();
    const { data: user, error } = await db
      .from("users")
      .select("id, full_name")
      .eq("username", username.trim().toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "No account found with that username" },
        { status: 404 }
      );
    }

    // Compare full names (case-insensitive)
    const nameMismatch =
      user.full_name.trim().toLowerCase() !==
      full_name.trim().toLowerCase();

    if (nameMismatch) {
      return NextResponse.json(
        { error: "Name does not match our records" },
        { status: 401 }
      );
    }

    const pin_hash = await bcrypt.hash(String(new_pin), 10);

    const { error: updateError } = await db
      .from("users")
      .update({ pin_hash })
      .eq("id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset PIN error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
