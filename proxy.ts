// Optional office-network lock. If ALLOWED_IPS is set, only requests from those
// addresses/ranges reach the app; everyone else gets a friendly "office Wi-Fi only" page.
//
//   ALLOWED_IPS=203.0.113.10,198.51.100.0/24,10.0.0.0/8
//
// Use the address(es) the server SEES for office traffic: the office's public IP if
// hosted in the cloud, or the internal Wi-Fi range if hosted on the office network.
// This is a second layer: the main control should be the firewall / network itself.
import { NextRequest, NextResponse } from "next/server";
import { clientIp, matches } from "@/lib/ip";

const BLOCKED_PAGE = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>LoyalTEA</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#ec008c;color:#fff;
font-family:system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:24px}
.c{max-width:360px}img{width:200px;height:auto}h1{font-size:24px;margin:24px 0 8px}p{margin:0;opacity:.9;line-height:1.5}</style>
</head><body><div class="c"><img src="/logo-white.png" alt="LoyalTEA">
<h1>Office Wi-Fi only</h1><p>LoyalTEA works when you're connected to the office Wi-Fi. Connect and try again. Your stamps are safe.</p>
</div></body></html>`;

export function proxy(req: NextRequest) {
  const rules = (process.env.ALLOWED_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (rules.length === 0) return NextResponse.next();

  const path = req.nextUrl.pathname;
  // Monitoring and the logo for the blocked page stay reachable.
  if (path === "/api/health" || path === "/logo-white.png") return NextResponse.next();

  const ip = clientIp(req.headers.get("x-forwarded-for"));
  if (ip && rules.some((r) => matches(ip, r))) return NextResponse.next();

  if (path.startsWith("/api/"))
    return NextResponse.json({ error: "LoyalTEA only works on the office Wi-Fi" }, { status: 403 });
  return new NextResponse(BLOCKED_PAGE, { status: 403, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
