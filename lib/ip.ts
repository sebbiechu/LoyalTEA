// IP helpers for the optional office-network lock (see proxy.ts).

export function ipv4ToInt(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const part of p) {
    const v = Number(part);
    if (!/^\d+$/.test(part) || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

export function matches(ip: string, rule: string): boolean {
  const clean = ip.replace(/^::ffff:/, "");
  if (!rule.includes("/")) return clean === rule;
  const [base, bitsStr] = rule.split("/");
  const bits = Number(bitsStr);
  const a = ipv4ToInt(clean), b = ipv4ToInt(base);
  if (a === null || b === null || !(bits >= 0 && bits <= 32)) return false;
  const size = 2 ** (32 - bits);
  return Math.floor(a / size) === Math.floor(b / size);
}

/** "1.2.3.4:51234" -> "1.2.3.4", "[::ffff:1.2.3.4]:443" -> "::ffff:1.2.3.4" */
export function stripPort(raw: string): string {
  const s = raw.trim();
  const bracketed = s.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) return bracketed[1];
  const v4WithPort = s.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4WithPort) return v4WithPort[1];
  return s;
}

/**
 * The visitor's address as seen by the web server in front of the app (IIS, nginx, Vercel).
 * Uses the LAST X-Forwarded-For entry: that is the one our own proxy added. Earlier entries
 * (and X-Real-IP, which IIS passes through untouched) can be typed in by the visitor, so
 * trusting them would let someone outside the office fake an office address.
 */
export function clientIp(xff: string | null): string {
  const parts = (xff ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? stripPort(parts[parts.length - 1]) : "";
}
