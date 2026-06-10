"use client";

import { useEffect, useState } from "react";

interface QRModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export default function QRModal({ userId, userName, onClose }: QRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function generateQR() {
      try {
        // Dynamically import qrcode to avoid SSR issues
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(userId, {
          width: 280,
          margin: 2,
          color: {
            dark: "#2D6A4F",
            light: "#FEFAE0",
          },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setError("Failed to generate QR code");
      }
    }
    generateQR();
    return () => { cancelled = true; };
  }, [userId]);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={handleBackdrop}
    >
      <div className="bg-brand-cream rounded-2xl shadow-2xl p-8 max-w-xs w-full text-center">
        <h3 className="text-xl font-bold text-brand-green mb-1">Your QR Code</h3>
        <p className="text-sm text-brand-green/60 mb-6">{userName}</p>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {!qrDataUrl && !error && (
          <div className="flex items-center justify-center h-[280px]">
            <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {qrDataUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Your QR Code"
              width={280}
              height={280}
              className="rounded-xl"
            />
          </div>
        )}

        <p className="text-xs text-brand-green/50 mt-4 mb-6">
          Show this to the canteen manager to earn your stamp
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
