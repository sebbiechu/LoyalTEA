"use client";
import { useEffect, useRef, useState } from "react";

/** Rear-camera QR scanner. Calls onScan with the raw text; pauses while `paused`. */
export function Scanner({ onScan, paused }: { onScan: (text: string) => void; paused: boolean }) {
  const [status, setStatus] = useState<"starting" | "running" | "denied" | "unavailable">("starting");
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const cb = useRef(onScan);
  const pausedRef = useRef(paused);
  cb.current = onScan;
  pausedRef.current = paused;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (cancelled) return;
      const s = new Html5Qrcode("lt-scanner", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scannerRef.current = s;
      try {
        await s.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: (w, h) => { const m = Math.floor(Math.min(w, h) * 0.7); return { width: m, height: m }; } },
          (text) => { if (!pausedRef.current) cb.current(text); },
          () => {},
        );
        if (!cancelled) setStatus("running");
      } catch (e) {
        if (!cancelled) setStatus(String(e).match(/NotAllowed|Permission/i) ? "denied" : "unavailable");
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s?.isScanning) s.stop().then(() => s.clear()).catch(() => {});
    };
  }, []);

  return (
    <div className="scanner">
      <div id="lt-scanner" style={{ width: "100%", height: "100%" }} />
      {status !== "running" && (
        <div className="msg">
          {status === "starting" && "Starting camera…"}
          {status === "denied" && "Camera access was blocked. Allow the camera for this site in your browser settings, or type the code below."}
          {status === "unavailable" && "No camera available. Type the customer's code below instead."}
        </div>
      )}
      {status === "running" && paused && <div className="msg" style={{ background: "rgba(0,0,0,.55)", fontWeight: 700 }}>Card open →</div>}
    </div>
  );
}
