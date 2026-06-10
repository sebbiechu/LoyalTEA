"use client";

const TOTAL_STAMPS = 9;

interface StampCardProps {
  stampCount: number;
  canRedeem: boolean;
}

export default function StampCard({ stampCount, canRedeem }: StampCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-brand-green/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-brand-green-dark">Your Stamp Card</h2>
          <p className="text-sm text-brand-green/60">
            {stampCount} / {TOTAL_STAMPS} stamps
          </p>
        </div>
        {canRedeem && (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full animate-pulse">
            🎉 Free Drink!
          </span>
        )}
      </div>

      {/* Stamp Grid — 3×3 */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: TOTAL_STAMPS }).map((_, i) => {
          const filled = i < stampCount;
          return (
            <div
              key={i}
              className={`
                aspect-square flex items-center justify-center rounded-xl text-2xl transition-all
                ${filled
                  ? "bg-brand-green text-white shadow-sm shadow-brand-green/30"
                  : "bg-brand-cream-dark border-2 border-dashed border-brand-green/30 text-brand-green/20"
                }
              `}
            >
              {filled ? "☕" : "○"}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="h-2 bg-brand-cream-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-700"
            style={{ width: `${(stampCount / TOTAL_STAMPS) * 100}%` }}
          />
        </div>
        <p className="text-xs text-brand-green/50 mt-1.5 text-right">
          {canRedeem
            ? "Card complete — show this to the manager!"
            : `${TOTAL_STAMPS - stampCount} more stamp${TOTAL_STAMPS - stampCount === 1 ? "" : "s"} until a free drink`}
        </p>
      </div>
    </div>
  );
}
