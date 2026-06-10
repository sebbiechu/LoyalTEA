"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RedemptionLog, { RedemptionEntry } from "@/components/RedemptionLog";

export default function ReportsPage() {
  const router = useRouter();
  const [redemptions, setRedemptions] = useState<RedemptionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((res) => {
      if (!res.ok) { router.replace("/login"); return; }
      res.json().then((d) => {
        if (d.user?.role !== "manager") router.replace("/card");
      });
    });
  }, [router]);

  useEffect(() => {
    loadRedemptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  async function loadRedemptions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate + "T23:59:59");
      const res = await fetch(`/api/reports/redemptions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRedemptions(data.redemptions ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate + "T23:59:59");
      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `loyaltea-redemptions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-brand-green text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-white/70 hover:text-white">
            ← Back
          </Link>
          <div className="font-bold text-lg">Redemption Reports</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 border border-brand-green/10 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-brand-green-dark mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40 text-brand-green-dark"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-brand-green-dark mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40 text-brand-green-dark"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setFromDate(""); setToDate(""); }}
                className="px-4 py-2.5 rounded-lg border border-brand-green/30 text-brand-green font-medium text-sm hover:bg-brand-cream-dark transition-colors whitespace-nowrap"
              >
                Clear
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2.5 rounded-lg bg-brand-green text-white font-medium text-sm hover:bg-brand-green-dark transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {exporting ? "Exporting…" : "Export CSV"}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-brand-green/60">
            {loading ? "Loading…" : `${redemptions.length} redemption${redemptions.length === 1 ? "" : "s"} found`}
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <RedemptionLog redemptions={redemptions} />
        )}
      </main>
    </div>
  );
}
