"use client";
import { useState } from "react";

export function PinPad({ title, hint, onSuccess }: { title: string; hint?: string; onSuccess: (role: "staff" | "manager") => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(value = pin) {
    if (value.length < 4 || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wrong PIN");
      onSuccess(data.role);
    } catch (e) {
      setError((e as Error).message);
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  const press = (d: string) => setPin((p) => (p.length < 12 ? p + d : p));

  return (
    <div className="card center" style={{ maxWidth: 400, margin: "24px auto" }}>
      <h2>{title}</h2>
      {hint && <p className="muted small" style={{ margin: "6px 0 0" }}>{hint}</p>}
      <div className="pin-dots" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(6, pin.length) }, (_, i) => <i key={i} className={i < pin.length ? "on" : ""} />)}
      </div>
      <input
        className="sr" type="password" inputMode="numeric" autoComplete="off" aria-label="PIN" value={pin} autoFocus
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
        <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete">⌫</button>
        <button onClick={() => press("0")}>0</button>
        <button onClick={() => submit()} disabled={busy || pin.length < 4} aria-label="Sign in" style={{ background: "var(--pink)", color: "#fff" }}>→</button>
      </div>
      {error && <p style={{ color: "#b00020", fontWeight: 700, marginBottom: 0 }}>{error}</p>}
    </div>
  );
}
