export const STAMPS_FOR_REWARD = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_STAMPS_FOR_REWARD) || 8,
);

export const DRINKS = [
  { id: "Tea", emoji: "🍵" },
  { id: "Coffee", emoji: "☕" },
  { id: "Latte", emoji: "🥛" },
  { id: "Hot chocolate", emoji: "🍫" },
  { id: "Iced drink", emoji: "🧊" },
  { id: "Other", emoji: "🥤" },
] as const;

export const DRINK_IDS: string[] = DRINKS.map((d) => d.id);

export type CardState = {
  code: string;
  exists: boolean;
  balance: number;
  total_stamps: number;
  total_redeemed: number;
  last_event_at: string | null;
};
