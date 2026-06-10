"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DrinkSelector, { DrinkType } from "@/components/DrinkSelector";

type ScannedUser = {
  id: string;
  username: string;
  full_name: string;
  role: string;
  stampCount: number;
  canRedeem: boolean;
};

type ScanStep = "scanning" | "confirm" | "done";

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);
  const [scanStep, setScanStep] = useState<ScanStep>("scanning");
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [drinkTypes, setDrinkTypes] = useState<DrinkType[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [reusableCup, setReusableCup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [scannerReady, setScannerReady] = useState(false);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/me").then((res) => {
      if (!res.ok) { router.replace("/login"); return; }
      res.json().then((d) => {
        if (d.user?.role !== "manager") router.replace("/card");
      });
    });
  }, [router]);

  // Load drink types
  useEffect(() => {
    fetch("/api/stamps/drink-types")
      .then((r) => r.json())
      .then((d) => setDrinkTypes(d.drinkTypes ?? []));
  }, []);

  // Start QR scanner
  useEffect(() => {
    if (scanStep !== "scanning") return;

    let scanner: { start: (id: string, config: unknown, callback: (text: string) => void, errCb: () => void) => Promise<void>; stop: () => Promise<void> } | null = null;

    async function startScanner() {
      if (!scannerRef.current) return;
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
          },
          false
        ) as unknown as typeof scanner;

        html5QrRef.current = scanner;
        setScannerReady(true);

        // Html5QrcodeScanner renders itself — use render instead of start
        const { Html5QrcodeScanner: Scanner } = await import("html5-qrcode");
        const qrScanner = new Scanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        qrScanner.render(
          async (decodedText: string) => {
            await qrScanner.clear();
            await handleScan(decodedText);
          },
          () => { /* scan error — ignore */ }
        );
        html5QrRef.current = qrScanner;
      } catch (err) {
        console.error("Scanner init error:", err);
        setError("Unable to start QR scanner. Please allow camera access.");
      }
    }

    startScanner();

    return () => {
      if (html5QrRef.current) {
        (html5QrRef.current as { clear?: () => Promise<void> }).clear?.().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStep]);

  async function handleScan(userId: string) {
    setError("");
    try {
      const res = await fetch(`/api/stamps/user/${userId}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "User not found");
        setScanStep("scanning");
        return;
      }
      const data = await res.json();
      setScannedUser(data);
      setScanStep("confirm");
    } catch {
      setError("Failed to look up user");
    }
  }

  async function handleAction(action: "stamp" | "redeem") {
    if (!scannedUser || !selectedDrink) {
      setError("Please select a drink type");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stamps/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: scannedUser.id,
          drinkType: drinkTypes.find((d) => d.id === selectedDrink)?.name ?? selectedDrink,
          reusableCup,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to process");
        return;
      }

      setResultMessage(
        action === "redeem"
          ? `🎉 Free drink redeemed for ${scannedUser.full_name}!`
          : `☕ Stamp added for ${scannedUser.full_name}!`
      );
      setScanStep("done");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setScannedUser(null);
    setSelectedDrink(null);
    setReusableCup(false);
    setError("");
    setResultMessage("");
    setScannerReady(false);
    setScanStep("scanning");
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-brand-green text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-white/70 hover:text-white">
            ← Back
          </Link>
          <div className="font-bold text-lg">Scan QR Code</div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Scanning step */}
        {scanStep === "scanning" && (
          <div className="space-y-4">
            <p className="text-sm text-brand-green/60 text-center">
              Point the camera at a colleague&apos;s QR code
            </p>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}
            <div
              ref={scannerRef}
              id="qr-reader"
              className="rounded-2xl overflow-hidden bg-white border border-brand-green/10"
            />
          </div>
        )}

        {/* Confirm step */}
        {scanStep === "confirm" && scannedUser && (
          <div className="space-y-5">
            {/* User Card */}
            <div className="bg-white rounded-2xl p-5 border border-brand-green/10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-green/10 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <div className="font-bold text-brand-green-dark text-lg">
                    {scannedUser.full_name}
                  </div>
                  <div className="text-sm text-brand-green/60">@{scannedUser.username}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 bg-brand-cream rounded-xl px-4 py-2.5">
                <span className="text-2xl">☕</span>
                <div>
                  <span className="font-bold text-brand-green-dark">
                    {scannedUser.stampCount} / 9
                  </span>
                  <span className="text-sm text-brand-green/60 ml-2">stamps this cycle</span>
                </div>
                {scannedUser.canRedeem && (
                  <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                    READY TO REDEEM
                  </span>
                )}
              </div>
            </div>

            {/* Drink Selector */}
            <div>
              <h3 className="font-semibold text-brand-green-dark mb-3">Select Drink</h3>
              <DrinkSelector
                drinks={drinkTypes}
                selected={selectedDrink}
                onSelect={setSelectedDrink}
              />
            </div>

            {/* Reusable Cup */}
            <label className="flex items-center gap-3 cursor-pointer bg-white rounded-xl p-4 border border-brand-green/10">
              <input
                type="checkbox"
                checked={reusableCup}
                onChange={(e) => setReusableCup(e.target.checked)}
                className="w-5 h-5 rounded border-brand-green/30 accent-brand-green"
              />
              <div>
                <div className="text-sm font-medium text-brand-green-dark">
                  ♻️ Reusable cup
                </div>
                <div className="text-xs text-brand-green/50">Tick if they brought their own cup</div>
              </div>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleAction("stamp")}
                disabled={loading || !selectedDrink || scannedUser.canRedeem}
                className="w-full py-3.5 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing…" : "Add Stamp"}
              </button>

              {scannedUser.canRedeem && (
                <button
                  onClick={() => handleAction("redeem")}
                  disabled={loading || !selectedDrink}
                  className="w-full py-3.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing…" : "🎉 Redeem Free Drink"}
                </button>
              )}

              <button
                onClick={reset}
                className="w-full py-3 rounded-xl border border-brand-green/30 text-brand-green font-medium hover:bg-brand-cream-dark transition-colors"
              >
                Cancel — Scan Again
              </button>
            </div>
          </div>
        )}

        {/* Done step */}
        {scanStep === "done" && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl mb-2">✅</div>
            <div>
              <h3 className="text-xl font-bold text-brand-green-dark">{resultMessage}</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full py-3.5 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark transition-colors"
              >
                Scan Another
              </button>
              <Link
                href="/dashboard"
                className="block w-full py-3 rounded-xl border border-brand-green/30 text-brand-green font-medium text-center hover:bg-brand-cream-dark transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
