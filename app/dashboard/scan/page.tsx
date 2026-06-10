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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [scanStep, setScanStep] = useState<ScanStep>("scanning");
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [drinkTypes, setDrinkTypes] = useState<DrinkType[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [reusableCup, setReusableCup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((res) => {
      if (!res.ok) { router.replace("/login"); return; }
      res.json().then((d) => {
        if (d.user?.role !== "manager") router.replace("/card");
      });
    });
  }, [router]);

  useEffect(() => {
    fetch("/api/stamps/drink-types")
      .then((r) => r.json())
      .then((d) => setDrinkTypes(d.drinkTypes ?? []));
  }, []);

  // Start camera using native browser APIs (works on iOS Safari)
  useEffect(() => {
    if (scanStep !== "scanning") return;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanFrame();
        }
      } catch {
        setCameraError("Camera access denied. Please allow camera access in your browser settings, or use the manual lookup below.");
      }
    }

    async function scanFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      // Use BarcodeDetector if available (Chrome/Android), fallback to jsQR
      if ("BarcodeDetector" in window) {
        try {
          // @ts-expect-error BarcodeDetector not in all TS types
          const detector = new BarcodeDetector({ formats: ["qr_code"] });
          const codes = await detector.detect(canvas);
          if (codes.length > 0) {
            stopCamera();
            await handleScan(codes[0].rawValue);
            return;
          }
        } catch { /* continue */ }
      } else {
        // Use jsQR as fallback
        const { default: jsQR } = await import("jsqr");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          stopCamera();
          await handleScan(code.data);
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    }

    startCamera();

    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStep]);

  function stopCamera() {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function handleScan(userId: string) {
    setError("");
    try {
      const res = await fetch(`/api/stamps/user/${encodeURIComponent(userId)}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "User not found");
        setScanStep("scanning");
        return;
      }
      setScannedUser(await res.json());
      setScanStep("confirm");
    } catch {
      setError("Failed to look up user");
    }
  }

  async function handleAction(action: "stamp" | "redeem") {
    if (!scannedUser || !selectedDrink) { setError("Please select a drink type"); return; }
    setLoading(true); setError("");
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
      if (!res.ok) { setError(data.error ?? "Failed to process"); return; }
      setResultMessage(action === "redeem" ? `🎉 Free drink redeemed for ${scannedUser.full_name}!` : `☕ Stamp added for ${scannedUser.full_name}!`);
      setScanStep("done");
    } catch { setError("Something went wrong"); } finally { setLoading(false); }
  }

  function reset() {
    setScannedUser(null); setSelectedDrink(null); setReusableCup(false);
    setError(""); setResultMessage(""); setCameraError("");
    setScanStep("scanning");
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-brand-green text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-white/70 hover:text-white">← Back</Link>
          <div className="font-bold text-lg">Scan QR Code</div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {scanStep === "scanning" && (
          <div className="space-y-4">
            <p className="text-sm text-brand-green/60 text-center">Point the camera at a colleague&apos;s QR code</p>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>}

            {!cameraError ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-2 border-white/70 rounded-2xl" />
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-amber-800">{cameraError}</p>
              </div>
            )}

            {/* Manual lookup fallback */}
            <ManualLookup onFound={(user) => { setScannedUser(user); setScanStep("confirm"); }} />
          </div>
        )}

        {scanStep === "confirm" && scannedUser && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-brand-green/10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-green/10 flex items-center justify-center text-2xl">👤</div>
                <div>
                  <div className="font-bold text-brand-green-dark text-lg">{scannedUser.full_name}</div>
                  <div className="text-sm text-brand-green/60">@{scannedUser.username}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 bg-brand-cream rounded-xl px-4 py-2.5">
                <span className="text-2xl">☕</span>
                <span className="font-bold text-brand-green-dark">{scannedUser.stampCount} / 9</span>
                <span className="text-sm text-brand-green/60 ml-1">stamps</span>
                {scannedUser.canRedeem && <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">READY TO REDEEM</span>}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-brand-green-dark mb-3">Select Drink</h3>
              <DrinkSelector drinks={drinkTypes} selected={selectedDrink} onSelect={setSelectedDrink} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer bg-white rounded-xl p-4 border border-brand-green/10">
              <input type="checkbox" checked={reusableCup} onChange={(e) => setReusableCup(e.target.checked)} className="w-5 h-5 rounded border-brand-green/30 accent-brand-green" />
              <div>
                <div className="text-sm font-medium text-brand-green-dark">♻️ Reusable cup</div>
                <div className="text-xs text-brand-green/50">Tick if they brought their own cup</div>
              </div>
            </label>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="space-y-3">
              <button onClick={() => handleAction("stamp")} disabled={loading || !selectedDrink || scannedUser.canRedeem} className="w-full py-3.5 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark disabled:opacity-50">
                {loading ? "Processing…" : "Add Stamp"}
              </button>
              {scannedUser.canRedeem && (
                <button onClick={() => handleAction("redeem")} disabled={loading || !selectedDrink} className="w-full py-3.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50">
                  {loading ? "Processing…" : "🎉 Redeem Free Drink"}
                </button>
              )}
              <button onClick={reset} className="w-full py-3 rounded-xl border border-brand-green/30 text-brand-green font-medium">Cancel — Scan Again</button>
            </div>
          </div>
        )}

        {scanStep === "done" && (
          <div className="text-center py-8 space-y-6">
            <div className="text-6xl">✅</div>
            <h3 className="text-xl font-bold text-brand-green-dark">{resultMessage}</h3>
            <div className="space-y-3">
              <button onClick={reset} className="w-full py-3.5 rounded-xl bg-brand-green text-white font-semibold">Scan Another</button>
              <Link href="/dashboard" className="block w-full py-3 rounded-xl border border-brand-green/30 text-brand-green font-medium text-center">Back to Dashboard</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ManualLookup({ onFound }: { onFound: (user: ScannedUser) => void }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      // Look up by username via a search
      const res = await fetch(`/api/stamps/lookup?username=${encodeURIComponent(username.trim().toLowerCase())}`);
      if (!res.ok) { setError((await res.json()).error ?? "User not found"); return; }
      onFound(await res.json());
    } catch { setError("Something went wrong"); } finally { setLoading(false); }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full py-3 rounded-xl border border-brand-green/30 text-brand-green font-medium text-sm">
      Can&apos;t scan? Look up by username instead
    </button>
  );

  return (
    <div className="bg-white rounded-2xl p-5 border border-brand-green/10">
      <h3 className="font-semibold mb-3 text-brand-green-dark">Look up by username</h3>
      <form onSubmit={handleLookup} className="space-y-3">
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jane.smith" required className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-brand-green text-white font-semibold disabled:opacity-50">{loading ? "Looking up…" : "Find Colleague"}</button>
      </form>
    </div>
  );
}
