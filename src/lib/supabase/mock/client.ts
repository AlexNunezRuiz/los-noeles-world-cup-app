/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
// MOCK SUPABASE CLIENT — used when NEXT_PUBLIC_MOCK=true
// Implements the subset of the supabase-js API the app uses:
//   .from(table) query builder, .auth.*, .channel()/.removeChannel()
// Backed by an in-memory DB (see ./data). Data is NOT persisted:
// it resets on every server restart / page reload.
// ============================================================

import { createDb, MOCK_USER, UUID_TABLES, type Db, type Row } from "./data";

// One in-memory DB per runtime (server module / browser tab).
const db: Db = createDb();

// ---- realtime pub/sub -----------------------------------------
type Listener = { table: string; event: string; cb: (payload: any) => void };
const listeners: Listener[] = [];

function emit(table: string, eventType: string, newRow: Row | null, oldRow: Row | null) {
  for (const l of listeners) {
    if (l.table !== table) continue;
    if (l.event !== "*" && l.event !== eventType) continue;
    try {
      l.cb({ eventType, new: newRow ?? {}, old: oldRow ?? {}, table, schema: "public" });
    } catch {
      /* listener errors must not break a mutation */
    }
  }
}

// ---- id helpers -----------------------------------------------
let serialCounter = 100_000;
const nextSerial = () => serialCounter++;
const nextUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
const nowIso = () => new Date().toISOString();

function withDefaults(table: string, raw: Row): Row {
  const id = raw.id ?? (UUID_TABLES.has(table) ? nextUuid() : nextSerial());
  const defaults: Row = { created_at: nowIso(), updated_at: nowIso() };
  if (table === "chat_messages") defaults.is_deleted = false;
  return { ...defaults, ...raw, id };
}

function compare(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

// ---- query builder --------------------------------------------
type Op = "select" | "insert" | "upsert" | "update" | "delete";

class MockQuery implements PromiseLike<any> {
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private limitN: number | null = null;
  private op: Op = "select";
  private payload: Row | Row[] | null = null;
  private onConflict: string | null = null;
  private returnSelect = false;
  private singleRow = false;
  private maybeSingleRow = false;
  private headOnly = false;
  private wantCount = false;

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.headOnly = true;
    if (this.op !== "select") this.returnSelect = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = rows;
    this.onConflict = opts?.onConflict ?? null;
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  neq(col: string, val: any) {
    this.filters.push((r) => r[col] !== val);
    return this;
  }
  in(col: string, vals: any[]) {
    this.filters.push((r) => vals.includes(r[col]));
    return this;
  }
  gt(col: string, val: any) {
    this.filters.push((r) => r[col] > val);
    return this;
  }
  gte(col: string, val: any) {
    this.filters.push((r) => r[col] >= val);
    return this;
  }
  lt(col: string, val: any) {
    this.filters.push((r) => r[col] < val);
    return this;
  }
  lte(col: string, val: any) {
    this.filters.push((r) => r[col] <= val);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.limitN = to - from + 1;
    return this;
  }
  single() {
    this.singleRow = true;
    return this;
  }
  maybeSingle() {
    this.maybeSingleRow = true;
    return this;
  }

  private rows(): Row[] {
    return db[this.table] ?? (db[this.table] = []);
  }

  private exec(): Promise<{ data: any; error: any; count: number | null }> {
    const result = this.run();
    return Promise.resolve(result);
  }

  private run(): { data: any; error: any; count: number | null } {
    const table = this.rows();

    if (this.op === "select") {
      let rows = table.filter((r) => this.filters.every((f) => f(r)));
      for (const o of [...this.orders].reverse()) {
        rows = rows
          .slice()
          .sort((a, b) => compare(a[o.col], b[o.col]) * (o.asc ? 1 : -1));
      }
      const count = rows.length;
      if (this.limitN != null) rows = rows.slice(0, this.limitN);
      if (this.headOnly) return { data: null, count, error: null };
      if (this.singleRow || this.maybeSingleRow) {
        if (rows.length === 0) {
          return {
            data: null,
            count: this.wantCount ? count : null,
            error: this.maybeSingleRow
              ? null
              : { message: "No rows found", code: "PGRST116", details: "", hint: "" },
          };
        }
        return { data: { ...rows[0] }, count: this.wantCount ? count : null, error: null };
      }
      return {
        data: rows.map((r) => ({ ...r })),
        count: this.wantCount ? count : null,
        error: null,
      };
    }

    if (this.op === "insert" || this.op === "upsert") {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const affected: Row[] = [];
      for (const raw of incoming) {
        if (this.op === "upsert" && this.onConflict) {
          const keys = this.onConflict.split(",").map((k) => k.trim());
          const idx = table.findIndex((r) => keys.every((k) => r[k] === raw[k]));
          if (idx >= 0) {
            const merged = { ...table[idx], ...raw, updated_at: nowIso() };
            table[idx] = merged;
            affected.push(merged);
            emit(this.table, "UPDATE", merged, null);
            continue;
          }
        }
        const row = withDefaults(this.table, raw);
        table.push(row);
        affected.push(row);
        emit(this.table, "INSERT", row, null);
      }
      const data = this.returnSelect
        ? this.singleRow
          ? affected[0] ?? null
          : affected.map((r) => ({ ...r }))
        : null;
      return { data, count: null, error: null };
    }

    if (this.op === "update") {
      const updated: Row[] = [];
      for (const r of table) {
        if (this.filters.every((f) => f(r))) {
          Object.assign(r, this.payload, { updated_at: nowIso() });
          updated.push(r);
          emit(this.table, "UPDATE", { ...r }, null);
        }
      }
      const data = this.returnSelect
        ? this.singleRow
          ? updated[0] ?? null
          : updated.map((r) => ({ ...r }))
        : null;
      return { data, count: null, error: null };
    }

    // delete
    const kept: Row[] = [];
    const removed: Row[] = [];
    for (const r of table) (this.filters.every((f) => f(r)) ? removed : kept).push(r);
    db[this.table] = kept;
    for (const r of removed) emit(this.table, "DELETE", null, r);
    return { data: null, count: null, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
  catch<T = never>(onrejected?: ((reason: any) => T | PromiseLike<T>) | null) {
    return this.exec().catch(onrejected);
  }
  finally(onfinally?: (() => void) | null) {
    return this.exec().finally(onfinally);
  }
}

// ---- realtime channel -----------------------------------------
function makeChannel(_name: string) {
  const owned: Listener[] = [];
  const channel: any = {
    on(_type: string, filter: { event?: string; table: string }, cb: (p: any) => void) {
      const listener: Listener = {
        table: filter.table,
        event: filter.event ?? "*",
        cb,
      };
      listeners.push(listener);
      owned.push(listener);
      return channel;
    },
    subscribe(cb?: (status: string) => void) {
      cb?.("SUBSCRIBED");
      return channel;
    },
    unsubscribe() {
      for (const l of owned) {
        const i = listeners.indexOf(l);
        if (i >= 0) listeners.splice(i, 1);
      }
      return Promise.resolve("ok");
    },
    _owned: owned,
  };
  return channel;
}

// ---- the client -----------------------------------------------
export function createMockClient(): any {
  return {
    from(table: string) {
      return new MockQuery(table);
    },
    auth: {
      async getUser() {
        return { data: { user: MOCK_USER }, error: null };
      },
      async getSession() {
        return {
          data: {
            session: {
              user: MOCK_USER,
              access_token: "mock-access-token",
              refresh_token: "mock-refresh-token",
              expires_in: 3600,
              token_type: "bearer",
            },
          },
          error: null,
        };
      },
      async signInWithPassword() {
        return { data: { user: MOCK_USER, session: {} }, error: null };
      },
      async signUp() {
        return { data: { user: MOCK_USER, session: {} }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async exchangeCodeForSession() {
        return { data: { user: MOCK_USER, session: {} }, error: null };
      },
      onAuthStateChange(_cb: any) {
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
    channel(name: string) {
      return makeChannel(name);
    },
    removeChannel(channel: any) {
      channel?.unsubscribe?.();
      return Promise.resolve("ok");
    },
    removeAllChannels() {
      listeners.length = 0;
      return Promise.resolve("ok");
    },
  };
}
