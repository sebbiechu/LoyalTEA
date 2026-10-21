import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";

/**
 * Database access. Two interchangeable backends:
 *  - DATABASE_URL set              -> direct PostgreSQL (self-hosted, Docker, Azure, etc.)
 *  - SUPABASE_URL + service key    -> Supabase (hosted Postgres)
 * All stamp logic lives in SQL functions (database/schema.sql), so both behave identically.
 */

export type EventRow = { kind: "stamp" | "redeem"; drink: string | null; created_at: string; card_code?: string };

export class DbError extends Error {}

type Fn = "card_state" | "add_stamp" | "redeem_reward" | "undo_last" | "report_summary";

interface Store {
  call<T>(fn: Fn, args: Record<string, unknown>): Promise<T>;
  recentEvents(code: string, limit: number): Promise<EventRow[]>;
  eventsSince(since: Date, offset: number, limit: number): Promise<Required<EventRow>[]>;
  pinFailuresSince(since: Date): Promise<number>;
  recordPinFailure(): Promise<void>;
  ping(): Promise<void>;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string));

// ---------------------------------------------------------------------------
// Direct PostgreSQL
// ---------------------------------------------------------------------------
class PgStore implements Store {
  constructor(private pool: Pool) {}

  async call<T>(fn: Fn, args: Record<string, unknown>): Promise<T> {
    const keys = Object.keys(args);
    // Function and argument names come from fixed code paths, never from user input.
    const sql = `select ${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`;
    try {
      const { rows } = await this.pool.query(sql, keys.map((k) => args[k]));
      return rows[0].r as T;
    } catch (e) {
      throw new DbError((e as Error).message);
    }
  }

  async recentEvents(code: string, limit: number) {
    const { rows } = await this.pool.query(
      "select kind, drink, created_at from card_events where card_code = $1 order by created_at desc, id desc limit $2",
      [code, limit],
    );
    return rows.map((r) => ({ ...r, created_at: iso(r.created_at) }));
  }

  async eventsSince(since: Date, offset: number, limit: number) {
    const { rows } = await this.pool.query(
      "select created_at, kind, drink, card_code from card_events where created_at >= $1 order by created_at, id offset $2 limit $3",
      [since, offset, limit],
    );
    return rows.map((r) => ({ ...r, created_at: iso(r.created_at) }));
  }

  async pinFailuresSince(since: Date) {
    const { rows } = await this.pool.query("select count(*)::int as n from pin_failures where at >= $1", [since]);
    return rows[0].n as number;
  }

  async recordPinFailure() {
    await this.pool.query("insert into pin_failures default values");
    await this.pool.query("delete from pin_failures where at < now() - interval '1 day'");
  }

  async ping() {
    await this.pool.query("select 1 from cards limit 1");
  }
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
class SupabaseStore implements Store {
  constructor(private sb: SupabaseClient) {}

  async call<T>(fn: Fn, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.sb.rpc(fn, args);
    if (error) throw new DbError(error.message);
    return data as T;
  }

  async recentEvents(code: string, limit: number) {
    const { data, error } = await this.sb
      .from("card_events")
      .select("kind, drink, created_at")
      .eq("card_code", code)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new DbError(error.message);
    return (data ?? []) as EventRow[];
  }

  async eventsSince(since: Date, offset: number, limit: number) {
    const { data, error } = await this.sb
      .from("card_events")
      .select("created_at, kind, drink, card_code")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw new DbError(error.message);
    return (data ?? []) as Required<EventRow>[];
  }

  async pinFailuresSince(since: Date) {
    const { count, error } = await this.sb
      .from("pin_failures")
      .select("id", { count: "exact", head: true })
      .gte("at", since.toISOString());
    if (error) throw new DbError(error.message);
    return count ?? 0;
  }

  async recordPinFailure() {
    await this.sb.from("pin_failures").insert({});
    await this.sb.from("pin_failures").delete().lt("at", new Date(Date.now() - 86_400_000).toISOString());
  }

  async ping() {
    const { error } = await this.sb.from("cards").select("code", { head: true, count: "exact" });
    if (error) throw new DbError(error.message);
  }
}

// ---------------------------------------------------------------------------

const g = globalThis as unknown as { __loyalteaStore?: Store };

export function db(): Store {
  if (g.__loyalteaStore) return g.__loyalteaStore;

  const url = process.env.DATABASE_URL;
  if (url) {
    const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_ALLOW_SELF_SIGNED !== "true" } : undefined;
    g.__loyalteaStore = new PgStore(new Pool({ connectionString: url, ssl, max: 10, idleTimeoutMillis: 30_000 }));
    return g.__loyalteaStore;
  }

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    g.__loyalteaStore = new SupabaseStore(
      createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    );
    return g.__loyalteaStore;
  }

  throw new Error("Set DATABASE_URL (PostgreSQL) or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
}
