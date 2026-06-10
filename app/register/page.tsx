"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function suggestUsername(fullName: string) {
  return fullName.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleNameChange(val: string) {
    setFullName(val);
    setUsername(suggestUsername(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pin.length < 4) { setError("PIN must be at least 4 digits."); return; }
    if (pin !== confirmPin) { setError("PINs do not match."); return; }
    if (!username.trim()) { setError("Username is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), username: username.trim().toLowerCase(), pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
      router.push("/card");
    } catch { setError("Something went wrong."); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-brand-cream">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍵</div>
          <h1 className="text-3xl font-bold text-brand-green">LoyalTEA</h1>
          <p className="text-sm text-brand-green/70 mt-1">Office Canteen Loyalty Card</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-brand-green-dark mb-6">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-green-dark mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40 text-brand-green-dark"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-green-dark mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ""))}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40 text-brand-green-dark"
                placeholder="jane.smith"
              />
              <p className="text-xs text-brand-green/50 mt-1">This is what you'll use to log in</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-green-dark mb-1">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                required
                maxLength={8}
                className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40 text-brand-green-dark tracking-widest"
                placeholder="4–6 digits"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-green-dark mb-1">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                required
                maxLength={8}
                className="w-full px-4 py-2.5 rounded-lg border border-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green bg-brand-cream/40 text-brand-green-dark tracking-widest"
                placeholder="Repeat your PIN"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-green text-white font-semibold text-sm hover:bg-brand-green-dark transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
          <div className="mt-5 text-center">
            <Link href="/login" className="text-sm text-brand-green hover:underline">Already have an account? Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
