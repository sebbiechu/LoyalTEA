"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StampCard from "@/components/StampCard";
import StampHistory, { StampHistoryItem } from "@/components/StampHistory";
import QRModal from "@/components/QRModal";

type StampData = {
  stampCount: number;
  stampsRequired: number;
  canRedeem: boolean;
  recentStamps: StampHistoryItem[];
};

type User = {
  id: string;
  username: string;
  full_name: string;
  role: string;
};

export default function CardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stampData, setStampData] = useState<StampData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  async function fetchStamps() {
    const res = await fetch("/api/stamps/me");
    if (res.status === 401) { router.replace("/login"); return; }
    if (!res.ok) return;
    setStampData(await res.json());
  }

  useEffect(() => {
    async function load() {
      try {
        const [stampsRes, sessionRes] = await Promise.all([
          fetch("/api/stamps/me"),
          fetch("/api/auth/me"),
        ]);
        if (stampsRes.status === 401) { router.replace("/login"); return; }
        if (stampsRes.ok) setStampData(await stampsRes.json());
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setUser(sessionData.user);
          if (sessionData.user?.role === "manager") router.replace("/dashboard");
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();

    // Poll every 5 seconds so new stamps appear automatically
    const interval = setInterval(fetchStamps, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-brand-green text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🍵</span>
              <span className="font-bold text-lg">LoyalTEA</span>
            </div>
            {user && (
              <p className="text-sm text-white/70 mt-0.5">
                Hi, {user.full_name.split(" ")[0]}!
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stamp Card */}
        {stampData && (
          <StampCard
            stampCount={stampData.stampCount}
            canRedeem={stampData.canRedeem}
          />
        )}

        {/* Show QR Button */}
        {user && (
          <button
            onClick={() => setShowQR(true)}
            className="w-full py-4 rounded-2xl bg-brand-green text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors shadow-md shadow-brand-green/20"
          >
            <span className="text-xl">📱</span>
            Show My QR Code
          </button>
        )}

        {/* Recent History */}
        <div>
          <h3 className="text-base font-bold text-brand-green-dark mb-3">Recent Activity</h3>
          {stampData && <StampHistory stamps={stampData.recentStamps} />}
        </div>
      </main>

      {/* QR Modal */}
      {showQR && user && (
        <QRModal
          userId={user.id}
          userName={user.full_name}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}
