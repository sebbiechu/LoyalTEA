import { createServiceClient } from "./supabase";

export const STAMPS_PER_CARD = 9;

export type StampRecord = {
  id: string;
  user_id: string;
  drink_type: string;
  reusable_cup: boolean;
  is_redemption: boolean;
  stamped_by: string;
  created_at: string;
};

export type StampWithManager = StampRecord & {
  manager_name?: string;
};

/**
 * Get stamps since the last redemption (current cycle).
 * Returns stamps in ascending order (oldest first).
 */
export async function getCurrentCycleStamps(
  userId: string
): Promise<StampRecord[]> {
  const db = createServiceClient();

  // Find the last redemption
  const { data: lastRedemption } = await db
    .from("stamps")
    .select("created_at")
    .eq("user_id", userId)
    .eq("is_redemption", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let query = db
    .from("stamps")
    .select("*")
    .eq("user_id", userId)
    .eq("is_redemption", false)
    .order("created_at", { ascending: true });

  if (lastRedemption) {
    query = query.gt("created_at", lastRedemption.created_at);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCurrentStampCount(userId: string): Promise<number> {
  const stamps = await getCurrentCycleStamps(userId);
  return stamps.length;
}

export type AddStampParams = {
  userId: string;
  drinkType: string;
  reusableCup: boolean;
  managerId: string;
};

export async function addStamp(params: AddStampParams): Promise<StampRecord> {
  const db = createServiceClient();
  const currentCount = await getCurrentStampCount(params.userId);

  if (currentCount >= STAMPS_PER_CARD) {
    throw new Error("Card is full — please redeem before adding more stamps");
  }

  const { data, error } = await db
    .from("stamps")
    .insert({
      user_id: params.userId,
      drink_type: params.drinkType,
      reusable_cup: params.reusableCup,
      is_redemption: false,
      stamped_by: params.managerId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function redeemReward(params: {
  userId: string;
  drinkType: string;
  reusableCup: boolean;
  managerId: string;
}): Promise<StampRecord> {
  const db = createServiceClient();
  const currentCount = await getCurrentStampCount(params.userId);

  if (currentCount < STAMPS_PER_CARD) {
    throw new Error(
      `Not enough stamps to redeem. Has ${currentCount}/${STAMPS_PER_CARD}`
    );
  }

  const { data, error } = await db
    .from("stamps")
    .insert({
      user_id: params.userId,
      drink_type: params.drinkType,
      reusable_cup: params.reusableCup,
      is_redemption: true,
      stamped_by: params.managerId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecentStamps(
  userId: string,
  limit = 10
): Promise<StampWithManager[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("stamps")
    .select(
      `
      *,
      manager:stamped_by(full_name)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((s: StampRecord & { manager: { full_name: string } | null }) => ({
    ...s,
    manager_name: s.manager?.full_name,
  }));
}

export async function getUserByQr(userId: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("users")
    .select("id, username, full_name, role")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function getDrinkTypes() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("drink_types")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data ?? [];
}

export async function getTodayStats() {
  const db = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [stampsRes, redemptionsRes] = await Promise.all([
    db
      .from("stamps")
      .select("id, drink_type, reusable_cup")
      .eq("is_redemption", false)
      .gte("created_at", todayIso),
    db
      .from("stamps")
      .select("id, drink_type")
      .eq("is_redemption", true)
      .gte("created_at", todayIso),
  ]);

  const stamps = stampsRes.data ?? [];
  const redemptions = redemptionsRes.data ?? [];

  // Drink popularity
  const drinkCounts: Record<string, number> = {};
  for (const s of stamps) {
    drinkCounts[s.drink_type] = (drinkCounts[s.drink_type] ?? 0) + 1;
  }

  const reusableCupCount = stamps.filter((s) => s.reusable_cup).length;
  const reusableCupPercent =
    stamps.length > 0
      ? Math.round((reusableCupCount / stamps.length) * 100)
      : 0;

  return {
    totalStampsToday: stamps.length,
    totalRedemptionsToday: redemptions.length,
    drinkCounts,
    reusableCupPercent,
  };
}

export async function getRedemptionLog(params: {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const db = createServiceClient();

  let query = db
    .from("stamps")
    .select(
      `
      id,
      drink_type,
      reusable_cup,
      created_at,
      user:user_id(full_name, username),
      manager:stamped_by(full_name)
    `
    )
    .eq("is_redemption", true)
    .order("created_at", { ascending: false });

  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, (params.offset + (params.limit ?? 50)) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
