import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { secureCookies } from "@/lib/cookies";

export type Role = "staff" | "manager";
export const SESSION_COOKIE = "lt_staff";

const MAX_AGE: Record<Role, number> = {
  staff: 60 * 60 * 24 * 30, // till device stays signed in for 30 days
  manager: 60 * 60 * 12,
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(s);
}

/** Short fingerprint of the current PIN: changing the PIN invalidates old sessions. */
function pinVersion(role: Role): string {
  const pin = role === "manager" ? process.env.MANAGER_PIN : process.env.STAFF_PIN;
  return createHash("sha256").update(`${role}:${pin ?? ""}`).digest("hex").slice(0, 12);
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function roleForPin(pin: string): Role | null {
  const staff = process.env.STAFF_PIN;
  const manager = process.env.MANAGER_PIN;
  if (manager && safeEqual(pin, manager)) return "manager";
  if (staff && safeEqual(pin, staff)) return "staff";
  return null;
}

export async function setSession(res: NextResponse, role: Role) {
  const token = await new SignJWT({ role, pv: pinVersion(role) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE[role]}s`)
    .sign(secret());
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE[role],
  });
}

export async function getRole(): Promise<Role | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role as Role;
    if (role !== "staff" && role !== "manager") return null;
    if (payload.pv !== pinVersion(role)) return null;
    return role;
  } catch {
    return null;
  }
}

/** Returns an error response if the caller isn't signed in with at least `min` role. */
export async function requireRole(min: Role): Promise<{ role: Role } | { error: NextResponse }> {
  const role = await getRole();
  if (!role) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (min === "manager" && role !== "manager")
    return { error: NextResponse.json({ error: "Manager PIN required" }, { status: 403 }) };
  return { role };
}
