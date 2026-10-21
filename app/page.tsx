"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCode, generateCode, normaliseCode } from "@/lib/code";
import { STAMPS_FOR_REWARD } from "@/lib/config";
import { StampGrid } from "@/components/StampGrid";
import { QrCode } from "@/components/QrCode";

const STORE_KEY = "loyaltea.card";
const SAVED_KEY = "loyaltea.backupSaved";

type Card = { balance: number; total_stamps: number; total_redeemed: number; target: number };

function readStored(): string | null {
  try {
    const ls = normaliseCode(localStorage.getItem(STORE_KEY));
    if (ls) return ls;
  } catch {}
  const m = document.cookie.match(/(?:^|;\s*)lt_card=([^;]+)/);
  return normaliseCode(m?.[1]);
}

function store(code: string) {
  try { localStorage.setItem(STORE_KEY, code); } catch {}
  document.cookie = `lt_card=${code}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`;
}

export default function CardPage() {
  const [code, setCode] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [offline, setOffline] = useState(false);
  const [event, setEvent] = useState<"stamp" | "redeem" | null>(null);
  const [popIndex, setPopIndex] = useState<number | null>(null);
  const [backupSaved, setBackupSaved] = useState(true);
  const prev = useRef<Card | null>(null);
  const restoreRef = useRef<HTMLDialogElement>(null);
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreError, setRestoreError] = useState("");

  // Load or create this phone's card. Nothing is sent anywhere until staff stamp it.
  useEffect(() => {
    let c = readStored();
    if (!c) c = generateCode();
    store(c);
    setCode(c);
    try { setBackupSaved(localStorage.getItem(SAVED_KEY) === c); } catch { setBackupSaved(false); }
  }, []);

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const res = await fetch(`/api/card/${code}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const next: Card = await res.json();
      const p = prev.current;
      if (p) {
        if (next.total_redeemed > p.total_redeemed) {
          setEvent("redeem");
        } else if (next.total_stamps > p.total_stamps) {
          setEvent("stamp");
          setPopIndex(next.balance >= next.target ? next.target - 1 : (next.balance % next.target) - 1);
        }
      }
      prev.current = next;
      setCard(next);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [code]);

  // Poll while the page is on screen, so the stamp appears the moment staff add it.
  useEffect(() => {
    if (!code) return;
    refresh();
    const tick = () => document.visibilityState === "visible" && refresh();
    const id = setInterval(tick, 4000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [code, refresh]);

  useEffect(() => {
    if (!event) return;
    if ("vibrate" in navigator) navigator.vibrate?.(event === "redeem" ? [60, 60, 60] : 40);
    const t = setTimeout(() => { setEvent(null); setPopIndex(null); }, 6000);
    return () => clearTimeout(t);
  }, [event]);

  function confirmBackup() {
    if (!code) return;
    try { localStorage.setItem(SAVED_KEY, code); } catch {}
    setBackupSaved(true);
  }

  function restore() {
    const c = normaliseCode(restoreInput);
    if (!c) { setRestoreError("That code doesn't look right. Check each character."); return; }
    if (c === code) { restoreRef.current?.close(); return; }
    if (card && card.balance > 0 && !confirm(`This phone's current card has ${card.balance} stamp(s). Switching will hide it unless you've saved its code. Continue?`)) return;
    store(c);
    try { localStorage.setItem(SAVED_KEY, c); } catch {}
    prev.current = null;
    setCard(null);
    setCode(c);
    setBackupSaved(true);
    setRestoreInput("");
    setRestoreError("");
    restoreRef.current?.close();
  }

  const target = card?.target ?? STAMPS_FOR_REWARD;
  const balance = card?.balance ?? 0;
  const rewards = Math.floor(balance / target);
  const progress = rewards > 0 ? target : balance % target;
  const toGo = target - (balance % target);

  return (
    <main>
      <header className="hero">
        <img src="/logo-white.png" alt="LoyalTEA" width={1200} height={565} />
        <p>Your canteen stamp card</p>
      </header>

      <div className="shell lift">
        <section className="card" aria-live="polite">
          <div className="stamp-head">
            <h2>Stamps</h2>
            <div className="stamp-count">{progress}<span> / {target}</span></div>
          </div>
          <StampGrid balance={balance} target={target} popIndex={popIndex} />

          {event === "stamp" && <div className="banner ok"><span className="big">✓</span> Stamp added. Enjoy your drink!</div>}
          {event === "redeem" && <div className="banner ok"><span className="big">🎉</span> Free drink redeemed. Enjoy!</div>}
          {!event && rewards > 0 && (
            <div className="banner reward"><span className="big">🎁</span>
              <span>{rewards > 1 ? `${rewards} free drinks ready!` : "Free drink ready!"} Show this card at the till.</span>
            </div>
          )}
          {!event && rewards === 0 && (
            <p className="muted small center" style={{ margin: "16px 0 0" }}>
              {balance === 0 ? `Buy a drink and show the code below to get your first stamp.` : `${toGo} more ${toGo === 1 ? "drink" : "drinks"} until a free one.`}
            </p>
          )}
          {offline && <div className="banner warn small">Can't reach LoyalTEA right now. Your stamps are safe; staff can still scan you.</div>}
        </section>

        <section className="card center">
          <h2>Show this at the till</h2>
          <p className="muted small" style={{ margin: "4px 0 8px" }}>Staff scan it to add your stamp.</p>
          {code ? <QrCode value={code} label={`Card code ${formatCode(code)}`} /> : <div style={{ height: 240 }} />}
          {code && <div className="code">{formatCode(code)}</div>}
        </section>

        {code && !backupSaved && (
          <section className="card" style={{ border: "2px solid var(--pink)" }}>
            <h2>Save your backup code</h2>
            <p className="muted" style={{ margin: "6px 0 14px" }}>
              There's no account, so this code <b>is</b> your card. Screenshot this page or note the code. If you change phone or clear your browser, enter it under <i>Use a different card</i>.
            </p>
            <button className="btn block" onClick={confirmBackup}>I've saved it</button>
          </section>
        )}

        <section className="card small">
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>Keep it handy</h3>
          <p className="muted" style={{ margin: 0 }}>
            Add LoyalTEA to your home screen so it opens like an app. iPhone: Share, then <i>Add to Home Screen</i>. Android: menu, then <i>Install app</i>.
          </p>
        </section>

        <div className="center">
          <button className="btn link" onClick={() => restoreRef.current?.showModal()}>Use a different card</button>
          <span className="muted"> · </span>
          <Link className="btn link" href="/privacy">Privacy</Link>
        </div>
        <p className="footer">No sign-up. No names. No email. Just stamps.</p>
      </div>

      <dialog ref={restoreRef} onClose={() => setRestoreError("")}>
        <h2>Use a different card</h2>
        <p className="muted small">Enter the 12-character backup code from your old phone or screenshot.</p>
        <label className="sr" htmlFor="restore">Backup code</label>
        <input
          id="restore" className="input" placeholder="XXXX-XXXX-XXXX" autoComplete="off" autoCapitalize="characters"
          value={restoreInput} onChange={(e) => setRestoreInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && restore()}
        />
        {restoreError && <p className="small" style={{ color: "#b00020", fontWeight: 700 }}>{restoreError}</p>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => restoreRef.current?.close()}>Cancel</button>
          <button className="btn" onClick={restore}>Switch card</button>
        </div>
      </dialog>
    </main>
  );
}
