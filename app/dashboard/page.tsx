"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stats = {
  totalStampsToday: number;
  totalRedemptionsToday: number;
  drinkCounts: Record<string, number>;
  reusableCupPercent: number;
};

type User = {
  id: string;
  full_name: string;
  role: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sessionRes, statsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/reports/stats"),
        ]);

        if (sessionRes.status === 401 || !sessionRes.ok) {
          router.replace("/login");
          return;
        }

        const sessionData = await sessionRes.json();
        if (sessionData.user?.role !== "manager") {
          router.replace("/card");
          return;
        }
        setUser(sessionData.user);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
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

  const topDrink = stats
    ? Object.entries(stats.drinkCounts).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="bg-brand-green text-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🍵</span>
              <span className="font-bold text-lg">LoyalTEA — Manager</span>
            </div>
            {user && (
              <p className="text-sm text-white/70 mt-0.5">
                Welcome, {user.full_name}
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

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Today's Stats */}
        <section>
          <h2 className="text-lg font-bold text-brand-green-dark mb-3">Today&apos;s Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Stamps Today"
              value={stats?.totalStampsToday ?? 0}
              icon="☕"
            />
            <StatCard
              label="Redemptions"
              value={stats?.totalRedemptionsToday ?? 0}
              icon="🎉"
            />
            <StatCard
              label="Popular Drink"
              value={topDrink ? topDrink[0] : "—"}
              icon="🏆"
              small
            />
            <StatCard
              label="Reusable Cups"
              value={stats ? `${stats.reusableCupPercent}%` : "—"}
              icon="♻️"
              small
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-bold text-brand-green-dark mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/dashboard/scan"
              className="flex items-center gap-4 p-5 bg-brand-green text-white rounded-2xl hover:bg-brand-green-dark transition-colors shadow-md shadow-brand-green/20"
            >
              <span className="text-3xl">📷</span>
              <div>
                <div className="font-bold text-base">Scan QR Code</div>
                <div className="text-sm text-white/70">Add stamp or redeem reward</div>
              </div>
            </Link>

            <Link
              href="/dashboard/reports"
              className="flex items-center gap-4 p-5 bg-white text-brand-green-dark rounded-2xl hover:bg-brand-cream transition-colors shadow-sm border border-brand-green/10"
            >
              <span className="text-3xl">📊</span>
              <div>
                <div className="font-bold text-base">Reports</div>
                <div className="text-sm text-brand-green/60">View & export redemption log</div>
              </div>
            </Link>
          </div>
        </section>

        {/* Drink Breakdown */}
        {stats && Object.keys(stats.drinkCounts).length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-brand-green-dark mb-3">Today&apos;s Drink Mix</h2>
            <div className="bg-white rounded-2xl p-5 border border-brand-green/10">
              <div className="space-y-2">
                {Object.entries(stats.drinkCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([drink, count]) => (
                    <div key={drink} className="flex items-center gap-3">
                      <span className="text-sm text-brand-green-dark capitalize w-28 flex-shrink-0">
                        {drink}
                      </span>
                      <div className="flex-1 h-2 bg-brand-cream-dark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-green rounded-full"
                          style={{
                            width: `${((count / stats.totalStampsToday) * 100).toFixed(0)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-brand-green w-6 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  small = false,
}: {
  label: string;
  value: number | string;
  icon: string;
  small?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-brand-green/10 shadow-sm">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`font-bold text-brand-green-dark ${small ? "text-base" : "text-2xl"}`}>
        {value}
      </div>
      <div className="text-xs text-brand-green/50 mt-1">{label}</div>
    </div>
  );
}
