"use client";

export type DrinkType = {
  id: string;
  name: string;
  emoji: string;
};

interface DrinkSelectorProps {
  drinks: DrinkType[];
  selected: string | null;
  onSelect: (drinkId: string) => void;
}

export default function DrinkSelector({ drinks, selected, onSelect }: DrinkSelectorProps) {
  if (drinks.length === 0) {
    return (
      <p className="text-sm text-brand-green/60 text-center py-4">
        No drink types available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {drinks.map((drink) => (
        <button
          key={drink.id}
          onClick={() => onSelect(drink.id)}
          className={`
            flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all
            ${selected === drink.id
              ? "border-brand-green bg-brand-green text-white shadow-md"
              : "border-brand-green/20 bg-white text-brand-green-dark hover:border-brand-green hover:bg-brand-cream"
            }
          `}
        >
          <span className="text-3xl">{drink.emoji}</span>
          <span className="text-sm font-medium">{drink.name}</span>
        </button>
      ))}
    </div>
  );
}
