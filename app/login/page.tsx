"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      if (data.user.role === "manager") {
        router.push("/dashboard");
      } else {
        router.push("/card");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-brand-cream">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍵</div>
          <h1 className="text-3xl font-bold text-brand-green">LoyalTEA</h1>
          <p className="text-sm text-brand-green/70 mt-1">Office Canteen Loyalty Card</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-brand-green-dark mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-brand-green-dark mb-1"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40 text-brand-green-dark placeholder:text-brand-green/40"
                placeholder="your.name"
              />
            </div>

            <div>
              <label
                htmlFor="pin"
                className="block text-sm font-medium text-brand-green-dark mb-1"
              >
                PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                maxLength={8}
                className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40 text-brand-green-dark tracking-widest placeholder:text-brand-green/40 placeholder:tracking-normal"
                placeholder="••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-green text-white font-semibold text-sm hover:bg-brand-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center">
            <div>
              <Link href="/forgot-pin" className="text-sm text-brand-green hover:underline">
                Forgot your PIN?
              </Link>
            </div>
            <div className="text-sm text-brand-green/50">
              New here?{" "}
              <Link href="/register" className="text-brand-green font-medium hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
