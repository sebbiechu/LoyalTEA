"use client";

import { format } from "date-fns";

export type RedemptionEntry = {
  id: string;
  drink_type: string;
  reusable_cup: boolean;
  created_at: string;
  user: { full_name: string; username: string } | null;
  manager: { full_name: string } | null;
};

interface RedemptionLogProps {
  redemptions: RedemptionEntry[];
}

export default function RedemptionLog({ redemptions }: RedemptionLogProps) {
  if (redemptions.length === 0) {
    return (
      <div className="text-center py-10 text-brand-green/50">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-sm">No redemptions yet for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-green/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-green/10 text-brand-green-dark text-left">
            <th className="px-4 py-3 font-semibold">Colleague</th>
            <th className="px-4 py-3 font-semibold">Drink</th>
            <th className="px-4 py-3 font-semibold hidden sm:table-cell">Reusable Cup</th>
            <th className="px-4 py-3 font-semibold hidden md:table-cell">Manager</th>
            <th className="px-4 py-3 font-semibold">Date & Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-green/5">
          {redemptions.map((r) => (
            <tr key={r.id} className="bg-white hover:bg-brand-cream/60 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-brand-green-dark">
                  {r.user?.full_name ?? "Unknown"}
                </div>
                <div className="text-xs text-brand-green/50">@{r.user?.username ?? "—"}</div>
              </td>
              <td className="px-4 py-3 text-brand-green-dark capitalize">{r.drink_type}</td>
              <td className="px-4 py-3 hidden sm:table-cell">
                {r.reusable_cup ? (
                  <span className="text-green-600">♻️ Yes</span>
                ) : (
                  <span className="text-brand-green/40">No</span>
                )}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-brand-green/70">
                {r.manager?.full_name ?? "—"}
              </td>
              <td className="px-4 py-3 text-brand-green/70 whitespace-nowrap">
                {format(new Date(r.created_at), "d MMM yy, HH:mm")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
