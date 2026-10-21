"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PinPad } from "@/components/PinPad";

type Report = {
  days: number;
  stamps: number;
  redemptions: number;
  active_cards: number;
  new_cards: number;
  total_cards: number;
  daily: { day: string; stamps: number; redemptions: number }[];
  drinks: { drink: string; count: number }[];
  hours: { hour: number; count: number }[];
};

const RANGES = [7, 30, 90];
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<Report | null>(null);
  const [needPin, setNeedPin] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/staff/reports?days=${days}`, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) { setNeedPin(true); return; }
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not load report"); return; }
    setNeedPin(false);
    setReport(data);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (needPin) {
    return (
      <main>
        <header className="topbar">
          <img src="/logo-white.png" alt="LoyalTEA" width={1200} height={565} />
          <strong>Reports</strong>
          <span className="spacer" />
          <Link href="/staff">Till</Link>
        </header>
        <div className="shell">
          <PinPad title="Manager PIN" hint="Reports need the manager PIN." onSuccess={(r) => (r === "manager" ? load() : setError("That's the staff PIN. Reports need the manager PIN."))} />
          {error && <p className="center" style={{ color: "#b00020", fontWeight: 700 }}>{error}</p>}
        </div>
      </main>
    );
  }

  const maxDay = Math.max(1, ...(report?.daily.map((d) => d.stamps + d.redemptions) ?? [1]));
  const maxDrink = Math.max(1, ...(report?.drinks.map((d) => d.count) ?? [1]));
  const hours = Array.from({ length: 24 }, (_, h) => report?.hours.find((x) => x.hour === h)?.count ?? 0);
  // Always show at least 07:00 to 18:00, widened if there was activity outside it
  const used = hours.findIndex((n) => n > 0);
  const firstHour = used === -1 ? -1 : Math.min(7, used);
  const lastHour = Math.max(18, 23 - [...hours].reverse().findIndex((n) => n > 0));
  const hourRange = firstHour === -1 ? [] : hours.slice(firstHour, lastHour + 1).map((n, i) => ({ h: firstHour + i, n }));
  const maxHour = Math.max(1, ...hours);
  const peak = hourRange.reduce((a, b) => (b.n > a.n ? b : a), { h: -1, n: 0 });

  return (
    <main>
      <header className="topbar">
        <img src="/logo-white.png" alt="LoyalTEA" width={1200} height={565} />
        <strong>Reports</strong>
        <span className="spacer" />
        <Link href="/staff">Till</Link>
      </header>

      <div className="shell wide" style={{ paddingTop: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div className="tabs" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button key={r} aria-pressed={days === r} onClick={() => setDays(r)}>{r} days</button>
            ))}
          </div>
          <a className="btn dark" href={`/api/staff/export?days=${days}`}>Download CSV</a>
        </div>

        {error && <div className="banner warn">{error}</div>}

        {report && (
          <>
            <div className="kpis">
              <div className="kpi"><b>{report.stamps}</b><span>Stamps given</span></div>
              <div className="kpi"><b>{report.redemptions}</b><span>Free drinks redeemed</span></div>
              <div className="kpi"><b>{report.active_cards}</b><span>Cards used</span></div>
              <div className="kpi"><b>{report.new_cards}</b><span>New cards ({report.total_cards} total)</span></div>
            </div>

            <section className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <h2>Daily activity</h2>
                <div className="legend">
                  <span><i style={{ background: "var(--pink)" }} />Stamps</span>
                  <span><i style={{ background: "var(--ink)" }} />Free drinks</span>
                </div>
              </div>
              <div className="bars" role="img" aria-label={`Daily stamps and free drinks over the last ${report.days} days`}>
                {report.daily.map((d) => (
                  <div className="col" key={d.day} title={`${dayFmt.format(new Date(d.day))}: ${d.stamps} stamps, ${d.redemptions} free`}>
                    {d.redemptions > 0 && <div className="r" style={{ height: `${(d.redemptions / maxDay) * 100}%` }} />}
                    <div className="s" style={{ height: `${(d.stamps / maxDay) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="axis">
                <span>{report.daily[0] && dayFmt.format(new Date(report.daily[0].day))}</span>
                <span>Today</span>
              </div>
            </section>

            <div className="grid2">
              <section className="card">
                <h2 style={{ marginBottom: 8 }}>Drinks stamped</h2>
                {report.drinks.length === 0 && <p className="muted">No stamps yet in this period.</p>}
                {report.drinks.map((d) => (
                  <div className="hbar" key={d.drink}>
                    <span>{d.drink}</span>
                    <div className="track"><div className="fill" style={{ width: `${(d.count / maxDrink) * 100}%` }} /></div>
                    <span className="n">{d.count}</span>
                  </div>
                ))}
              </section>

              <section className="card">
                <h2 style={{ marginBottom: 4 }}>Busiest times</h2>
                {peak.h >= 0 ? (
                  <>
                    <p className="muted small" style={{ margin: "0 0 4px" }}>Peak hour: {String(peak.h).padStart(2, "0")}:00 to {String(peak.h + 1).padStart(2, "0")}:00</p>
                    <div className="bars" style={{ height: 140 }}>
                      {hourRange.map(({ h, n }) => (
                        <div className="col" key={h} title={`${h}:00 · ${n}`}>
                          <div className="s" style={{ height: `${(n / maxHour) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                    <div className="axis"><span>{String(firstHour).padStart(2, "0")}:00</span><span>{lastHour}:00</span></div>
                  </>
                ) : <p className="muted">No activity yet in this period.</p>}
              </section>
            </div>

            <p className="footer">
              Reports contain no names or personal details. Cards are random codes; the CSV shows only the last 4 characters of each.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
