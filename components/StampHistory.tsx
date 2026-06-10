"use client";

import { format } from "date-fns";

export type StampHistoryItem = {
  id: string;
  drink_type: string;
  reusable_cup: boolean;
  is_redemption: boolean;
  created_at: string;
  manager_name?: string;
};

interface StampHistoryProps {
  stamps: StampHistoryItem[];
}

const drinkEmoji: Record<string, string> = {
  coffee: "☕",
  tea: "🍵",
  mocha: "🧋",
  "iced coffee": "🧊",
  "hot chocolate": "🍫",
  other: "☕",
};

function getDrinkEmoji(drinkType: string): string {
  return drinkEmoji[drinkType.toLowerCase()] ?? "☕";
}

export default function StampHistory({ stamps }: StampHistoryProps) {
  if (stamps.length === 0) {
    return (
      <div className="text-center py-8 text-brand-green/50">
        <div className="text-4xl mb-2">🍵</div>
        <p className="text-sm">No stamps yet — visit the canteen!</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {stamps.map((stamp) => (
        <li
          key={stamp.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-brand-green/10"
        >
          <span className="text-2xl flex-shrink-0">
            {stamp.is_redemption ? "🎉" : getDrinkEmoji(stamp.drink_type)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-green-dark truncate">
              {stamp.is_redemption ? "Free Drink Redeemed!" : stamp.drink_type}
              {stamp.reusable_cup && !stamp.is_redemption && (
                <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  ♻️ Reusable cup
                </span>
              )}
            </p>
            <p className="text-xs text-brand-green/50 mt-0.5">
              {format(new Date(stamp.created_at), "d MMM yyyy, HH:mm")}
              {stamp.manager_name && ` · by ${stamp.manager_name}`}
            </p>
          </div>
          {stamp.is_redemption ? (
            <span className="flex-shrink-0 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              Redeemed
            </span>
          ) : (
            <span className="flex-shrink-0 text-xs font-semibold text-brand-green bg-brand-green/10 px-2 py-1 rounded-full">
              Stamp
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
