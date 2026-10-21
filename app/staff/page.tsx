"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCode, normaliseCode } from "@/lib/code";
import { DRINKS } from "@/lib/config";
import { PinPad } from "@/components/PinPad";
import { Scanner } from "@/components/Scanner";
import { StampGrid } from "@/components/StampGrid";

type Role = "staff" | "manager";
type Recent = { kind: "stamp" | "redeem"; drink: string | null; created_at: string };
type Card = { code: string; balance: number; target: number; total_stamps: number; total_redeemed: number; recent: Recent[] };

const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

export default function StaffPage() {
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  const [card, setCard] = useState<Card | null>(null);
  const [drink, setDrink] = useState<string>("Tea");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastScan = useRef({ code: "", at: 0 });

  useEffect(() => {
    fetch("/api/staff/me", { cache: "no-store" }).then((r) => r.json()).then((d) => setRole(d.role ?? null)).catch(() => setRole(null));
    try { const d = localStorage.getItem("loyaltea.lastDrink"); if (d) setDrink(d); } catch {}
  }, []);

  const say = useCallback((text: string, error = false) => {
    setToast({ text, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const handle401 = (res: Response) => {
    if (res.status === 401) { setRole(null); setCard(null); return true; }
    return false;
  };

  const open = useCallback(async (raw: string) => {
    const code = normaliseCode(raw);
    if (!code) { say("That isn't a LoyalTEA code", true); return; }
    const now = Date.now();
    if (lastScan.current.code === code && now - lastScan.current.at < 2500) return;
    lastScan.current = { code, at: now };
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/card/${code}`, { cache: "no-store" });
      if (handle401(res)) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCard(data);
      setManual("");
      navigator.vibrate?.(30);
    } catch (e) {
      say((e as Error).message || "Couldn't open card", true);
    } finally {
      setBusy(false);
    }
  }, [say]);

  async function act(action: "stamp" | "redeem" | "undo") {
    if (!card || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/staff/card/${card.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, drink }),
      });
      if (handle401(res)) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCard(data);
      const freeNow = Math.floor(data.balance / data.target);
      if (action === "stamp") say(freeNow > 0 ? `Stamped. Free drink now available!` : `Stamped (${data.balance % data.target}/${data.target})`);
      if (action === "redeem") say("Free drink redeemed 🎉");
      if (action === "undo") say("Last action undone");
    } catch (e) {
      say((e as Error).message || "Something went wrong", true);
    } finally {
      setBusy(false);
    }
  }

  function pickDrink(id: string) {
    setDrink(id);
    try { localStorage.setItem("loyaltea.lastDrink", id); } catch {}
  }

  async function signOut() {
    await fetch("/api/staff/logout", { method: "POST" });
    setRole(null);
    setCard(null);
  }

  if (role === undefined) return <main className="shell" />;

  const rewards = card ? Math.floor(card.balance / card.target) : 0;

  return (
    <main>
      <header className="topbar">
        <img src="/logo-white.png" alt="LoyalTEA" width={1200} height={565} />
        <strong>Till</strong>
        <span className="spacer" />
        {role === "manager" && <Link href="/staff/reports" className="pill">Reports</Link>}
        {role && <button onClick={signOut}>Sign out</button>}
      </header>

      {!role ? (
        <div className="shell">
          <PinPad title="Canteen staff" hint="Enter the staff PIN to open the till." onSuccess={setRole} />
        </div>
      ) : (
        <div className="shell wide till">
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Scan a card</h2>
            <Scanner onScan={open} paused={!!card || busy} />
            <form
              style={{ marginTop: 14 }} className="row"
              onSubmit={(e) => { e.preventDefault(); open(manual); }}
            >
              <label className="sr" htmlFor="manual">Card code</label>
              <input id="manual" className="input" placeholder="Or type code" value={manual} autoComplete="off" onChange={(e) => setManual(e.target.value)} />
              <button className="btn dark" style={{ flex: "0 0 auto" }} disabled={busy}>Open</button>
            </form>
          </section>

          {card ? (
            <section className="card panel">
              <div className="stamp-head">
                <div>
                  <p className="muted small" style={{ margin: 0 }}>Card</p>
                  <div className="code" style={{ textAlign: "left", marginTop: 0, fontSize: 18 }}>{formatCode(card.code)}</div>
                </div>
                <div className="stamp-count">{rewards > 0 ? card.target : card.balance % card.target}<span> / {card.target}</span></div>
              </div>
              <StampGrid balance={card.balance} target={card.target} />
              {card.total_stamps === 0 && <div className="banner ok small">New card. First stamp starts it.</div>}
              {rewards > 0 && <div className="banner reward"><span className="big">🎁</span>{rewards > 1 ? `${rewards} free drinks available` : "Free drink available"}</div>}

              <p className="small muted" style={{ margin: "18px 0 8px", fontWeight: 700 }}>Drink</p>
              <div className="chips" role="group" aria-label="Drink">
                {DRINKS.map((d) => (
                  <button key={d.id} className="chip" aria-pressed={drink === d.id} onClick={() => pickDrink(d.id)}>{d.emoji} {d.id}</button>
                ))}
              </div>

              <div className="stack" style={{ marginTop: 18 }}>
                {rewards > 0 && (
                  <button className="btn huge dark block" onClick={() => act("redeem")} disabled={busy}>🎁 Redeem free drink</button>
                )}
                <button className={`btn huge block${rewards > 0 ? " soft" : ""}`} onClick={() => act("stamp")} disabled={busy}>+1 Stamp</button>
                <div className="row">
                  <button className="btn ghost" onClick={() => act("undo")} disabled={busy || card.recent.length === 0}>Undo last</button>
                  <button className="btn ghost" onClick={() => setCard(null)}>Next customer</button>
                </div>
              </div>

              {card.recent.length > 0 && (
                <>
                  <p className="small muted" style={{ margin: "18px 0 0", fontWeight: 700 }}>Recent on this card</p>
                  <ul className="recent">
                    {card.recent.map((r, i) => (
                      <li key={i}>
                        <span>{r.kind === "redeem" ? "🎁 Free drink" : `+1 ${r.drink ?? ""}`}</span>
                        <span className="muted">{time.format(new Date(r.created_at))}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          ) : (
            <section className="card center muted">
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: "8px 0 4px" }}>Ready for the next customer</p>
              <p className="small" style={{ margin: 0 }}>Ask them to open LoyalTEA and hold up their QR code.</p>
            </section>
          )}
        </div>
      )}

      {toast && <div className={`toast${toast.error ? " error" : ""}`} role="status">{toast.text}</div>}
    </main>
  );
}
