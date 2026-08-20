"use client";

import { useEffect, useReducer } from "react";
import { availableEquity } from "./stats";
import type { CashFlow, Trade, TradeEntry } from "./types";

// Local-first persistence layer. Mirrors the Supabase schema (trades, cash_flows)
// minus user_id/RLS, which only apply once Supabase Auth is wired in.
// ponytail: localStorage, swap bodies of load/save to supabase-js later.

const TRADES_KEY = "tj_trades";
const CASH_KEY = "tj_cashflows";
const TRASH_KEY = "tj_trash";
const TRASH_DAYS = 7;

export interface TrashItem {
  kind: "trade" | "cashflow";
  data: Trade | CashFlow;
  deleted_at: string;
}

let tradesCache: Trade[] | null = null;
let cashCache: CashFlow[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    alert(
      "Penyimpanan browser penuh. Hapus beberapa screenshot atau data lama, lalu coba lagi."
    );
  }
}

// Migrasi: trade lama (sebelum fitur avg down) dibungkus jadi entries[0].
function migrate(raw: unknown[]): Trade[] {
  return (raw as Record<string, unknown>[]).map((t) => {
    const entries: TradeEntry[] = Array.isArray(t.entries)
      ? (t.entries as TradeEntry[])
      : t.entry_price != null && t.capital != null
        ? [{ date: t.entry_date as string, price: t.entry_price as number, capital: t.capital as number }]
        : [];
    return {
      id: t.id as string,
      asset: t.asset as string,
      market: (t.market as string) ?? "Spot",
      position: (t.position as Trade["position"]) ?? null,
      entries,
      entry_date: (t.entry_date as string) ?? entries[0]?.date ?? "",
      leverage: (t.leverage as number | null) ?? null,
      mark_price: (t.mark_price as number | null) ?? null,
      entry_screenshot: (t.entry_screenshot as string | null) ?? null,
      exit_date: (t.exit_date as string | null) ?? null,
      exit_price: (t.exit_price as number | null) ?? null,
      lowest_price: (t.lowest_price as number | null) ?? null,
      highest_price: (t.highest_price as number | null) ?? null,
      pnl: (t.pnl as number | null) ?? null,
      pnl_manual: (t.pnl_manual as number | null) ?? null,
      pnl_percent: (t.pnl_percent as number | null) ?? null,
      exit_screenshot: (t.exit_screenshot as string | null) ?? null,
      entry_note: (t.entry_note as string | null) ?? null,
      exit_note: (t.exit_note as string | null) ?? null,
      setup: (t.setup as string | null) ?? null,
      status: (t.status as Trade["status"]) ?? "OPEN",
      created_at: (t.created_at as string) ?? "",
      updated_at: (t.updated_at as string) ?? "",
    };
  });
}

export function getTrades(): Trade[] {
  if (typeof window === "undefined") return [];
  if (!tradesCache) {
    const raw = window.localStorage.getItem(TRADES_KEY);
    if (raw === null) {
      tradesCache = seedTrades();
      save(TRADES_KEY, tradesCache);
    } else {
      tradesCache = migrate(load<Trade[]>(TRADES_KEY, []));
    }
  }
  return tradesCache;
}

export function getCashFlows(): CashFlow[] {
  if (typeof window === "undefined") return [];
  if (!cashCache) {
    const raw = window.localStorage.getItem(CASH_KEY);
    if (raw === null) {
      cashCache = seedCashFlows();
      save(CASH_KEY, cashCache);
    } else {
      cashCache = load<CashFlow[]>(CASH_KEY, []);
    }
  }
  return cashCache;
}

function now() {
  return new Date().toISOString();
}

export type AddTradeInput = Omit<
  Trade,
  | "id"
  | "status"
  | "created_at"
  | "updated_at"
  | "lowest_price"
  | "highest_price"
  | "pnl_manual"
>;

export function addTrade(input: AddTradeInput): string | null {
  const market = input.market === "Futures" ? "Futures" : "Spot";
  const available = availableEquity(getTrades(), getCashFlows(), market);
  if (available <= 0) {
    return `Dana tidak cukup di market ${market} (equity 0). Tambahkan deposit dulu.`;
  }
  const modal = input.entries.reduce((s, e) => s + e.capital, 0);
  if (modal > available) {
    return `Modal trade (Rp ${modal.toLocaleString("id-ID")}) melebihi dana tersedia (Rp ${available.toLocaleString("id-ID")}).`;
  }
  const trades = getTrades();
  trades.push({
    ...input,
    lowest_price: null,
    highest_price: null,
    pnl_manual: null,
    id: crypto.randomUUID(),
    status: "OPEN",
    created_at: now(),
    updated_at: now(),
  });
  save(TRADES_KEY, trades);
  emit();
  return null;
}

export function addEntry(id: string, entry: TradeEntry): string | null {
  const trades = getTrades();
  const t = trades.find((x) => x.id === id);
  if (!t) return "Trade tidak ditemukan.";
  const market = t.market === "Futures" ? "Futures" : "Spot";
  const available = availableEquity(trades, getCashFlows(), market);
  if (entry.capital > available) {
    return `Modal entry (Rp ${entry.capital.toLocaleString("id-ID")}) melebihi dana tersedia (Rp ${available.toLocaleString("id-ID")}).`;
  }
  t.entries.push(entry);
  if (!t.entry_date) t.entry_date = entry.date;
  // ponytail: harga saat ini default ke harga entry terbaru, bisa diubah manual di detail
  t.mark_price = entry.price;
  t.updated_at = now();
  save(TRADES_KEY, trades);
  emit();
  return null;
}

export function setMarkPrice(id: string, price: number | null) {
  const trades = getTrades();
  const t = trades.find((x) => x.id === id);
  if (!t) return;
  t.mark_price = price;
  t.updated_at = now();
  save(TRADES_KEY, trades);
  emit();
}

export function closeTrade(
  id: string,
  updates: {
    exit_date: string;
    exit_price: number | null;
    lowest_price: number | null;
    highest_price: number | null;
    pnl: number | null;
    pnl_manual: number | null;
    pnl_percent: number | null;
    exit_screenshot: string | null;
    exit_note: string | null;
  }
): string | null {
  const trades = getTrades();
  const t = trades.find((x) => x.id === id);
  if (!t) return "Trade tidak ditemukan.";
  if (updates.exit_price === null && updates.pnl_manual === null) {
    return "Isi Harga Exit atau P/L sebelum menutup trade.";
  }
  Object.assign(t, updates, { status: "CLOSED" as const, updated_at: now() });
  save(TRADES_KEY, trades);
  emit();
  return null;
}

export function deleteTrade(id: string) {
  moveToTrash("trade", getTrades().find((t) => t.id === id));
  save(TRADES_KEY, getTrades().filter((t) => t.id !== id));
  tradesCache = migrate(load<Trade[]>(TRADES_KEY, []));
  emit();
}

export function deleteTrades(ids: string[]) {
  const trades = getTrades();
  const set = new Set(ids);
  const items = getTrash();
  for (const t of trades) {
    if (set.has(t.id)) items.push({ kind: "trade", data: t, deleted_at: now() });
  }
  save(TRASH_KEY, items);
  save(TRADES_KEY, trades.filter((t) => !set.has(t.id)));
  tradesCache = migrate(load<Trade[]>(TRADES_KEY, []));
  emit();
}

export function addCashFlow(
  input: Omit<CashFlow, "id" | "created_at">
): string | null {
  if (input.type === "WITHDRAW" && input.market) {
    const available = availableEquity(getTrades(), getCashFlows(), input.market);
    if (input.amount > available) {
      return `Withdraw melebihi dana tersedia di market ${input.market} (Rp ${available.toLocaleString("id-ID")}).`;
    }
  }
  const flows = getCashFlows();
  flows.push({ ...input, id: crypto.randomUUID(), created_at: now() });
  save(CASH_KEY, flows);
  emit();
  return null;
}

export function deleteCashFlow(id: string) {
  moveToTrash("cashflow", getCashFlows().find((c) => c.id === id));
  save(CASH_KEY, getCashFlows().filter((c) => c.id !== id));
  cashCache = load<CashFlow[]>(CASH_KEY, []);
  emit();
}

export function getTrash(): TrashItem[] {
  if (typeof window === "undefined") return [];
  const items = load<TrashItem[]>(TRASH_KEY, []);
  const cutoff = Date.now() - TRASH_DAYS * 86400000;
  const kept = items.filter((i) => new Date(i.deleted_at).getTime() > cutoff);
  if (kept.length !== items.length) save(TRASH_KEY, kept);
  return kept;
}

export function moveToTrash(kind: TrashItem["kind"], data: Trade | CashFlow | undefined) {
  if (!data) return;
  const items = getTrash();
  items.push({ kind, data, deleted_at: now() });
  save(TRASH_KEY, items);
}

export function restoreFromTrash(index: number) {
  const items = getTrash();
  const item = items[index];
  if (!item) return;
  if (item.kind === "trade") {
    const trades = getTrades();
    trades.push(item.data as Trade);
    save(TRADES_KEY, trades);
    tradesCache = migrate(load<Trade[]>(TRADES_KEY, []));
  } else {
    const flows = getCashFlows();
    flows.push(item.data as CashFlow);
    save(CASH_KEY, flows);
    cashCache = load<CashFlow[]>(CASH_KEY, []);
  }
  items.splice(index, 1);
  save(TRASH_KEY, items);
  emit();
}

export function emptyTrash() {
  save(TRASH_KEY, []);
  emit();
}

export function useTrash() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribe(force), []);
  return getTrash();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useDB() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribe(force), []);
  return { trades: getTrades(), cashFlows: getCashFlows() };
}

function seedCashFlows(): CashFlow[] {
  const d = (s: string) => new Date(s).toISOString();
  return [
    { id: "cf-1", type: "DEPOSIT", market: "Spot", amount: 5000000, date: d("2026-08-01T09:00"), note: "Modal awal", created_at: d("2026-08-01T09:00") },
    { id: "cf-2", type: "DEPOSIT", market: "Futures", amount: 2000000, date: d("2026-08-10T09:00"), note: "Tambahan modal", created_at: d("2026-08-10T09:00") },
    { id: "cf-3", type: "WITHDRAW", market: "Spot", amount: 1000000, date: d("2026-08-15T09:00"), note: "Tarik profit", created_at: d("2026-08-15T09:00") },
  ];
}

function seedTrades(): Trade[] {
  const d = (s: string) => new Date(s).toISOString();
  const base = {
    market: "Spot" as string,
    position: null as Trade["position"],
    leverage: null as number | null,
    mark_price: null as number | null,
    entry_screenshot: null as string | null,
    exit_screenshot: null as string | null,
    exit_note: null as string | null,
    pnl_manual: null as number | null,
    lowest_price: null as number | null,
    highest_price: null as number | null,
  };
  return [
    {
      ...base,
      id: "t-1",
      asset: "BTCUSDT",
      entries: [{ date: d("2026-08-17T14:30"), price: 115000, capital: 100 }],
      entry_date: d("2026-08-17T14:30"),
      entry_note: "Breakout resistance",
      setup: "Breakout resistance",
      exit_date: null,
      exit_price: null,
      pnl: null,
      pnl_percent: null,
      status: "OPEN",
      created_at: d("2026-08-17T14:30"),
      updated_at: d("2026-08-17T14:30"),
    },
    {
      ...base,
      id: "t-2",
      asset: "BTCUSDT",
      market: "Futures",
      position: "Long",
      leverage: 10,
      entries: [{ date: d("2026-08-01T09:15"), price: 95000, capital: 3000000 }],
      entry_date: d("2026-08-01T09:15"),
      entry_note: "Tren naik",
      setup: "Breakout resistance",
      exit_date: d("2026-08-03T21:40"),
      exit_price: 98000,
      pnl: 94737,
      pnl_percent: 3.16,
      exit_note: "Target tercapai",
      status: "CLOSED",
      created_at: d("2026-08-01T09:15"),
      updated_at: d("2026-08-03T21:40"),
    },
    {
      ...base,
      id: "t-3",
      asset: "ETHUSDT",
      entries: [{ date: d("2026-08-05T13:00"), price: 3200, capital: 2000000 }],
      entry_date: d("2026-08-05T13:00"),
      entry_note: "Posisi kuat",
      setup: "Trend continuation",
      exit_date: d("2026-08-08T16:20"),
      exit_price: 3350,
      pnl: 93750,
      pnl_percent: 4.69,
      exit_note: "Target tercapai",
      status: "CLOSED",
      created_at: d("2026-08-05T13:00"),
      updated_at: d("2026-08-08T16:20"),
    },
    {
      ...base,
      id: "t-4",
      asset: "SOLUSDT",
      entries: [{ date: d("2026-08-06T10:00"), price: 150, capital: 1500000 }],
      entry_date: d("2026-08-06T10:00"),
      entry_note: "Momentum naik",
      setup: "Trend continuation",
      exit_date: d("2026-08-09T22:15"),
      exit_price: 138,
      pnl: -120000,
      pnl_percent: -8,
      exit_note: "SL kena",
      status: "CLOSED",
      created_at: d("2026-08-06T10:00"),
      updated_at: d("2026-08-09T22:15"),
    },
    {
      ...base,
      id: "t-5",
      asset: "XRPUSDT",
      entries: [{ date: d("2026-08-11T08:00"), price: 0.6, capital: 1000000 }],
      entry_date: d("2026-08-11T08:00"),
      entry_note: "Uji support",
      setup: "Support bounce",
      exit_date: d("2026-08-14T19:00"),
      exit_price: null,
      pnl: null,
      pnl_percent: null,
      status: "CLOSED",
      created_at: d("2026-08-11T08:00"),
      updated_at: d("2026-08-14T19:00"),
    },
    {
      ...base,
      id: "t-6",
      asset: "BTCUSDT",
      market: "Futures",
      position: "Short",
      leverage: 5,
      entries: [{ date: d("2026-08-15T20:45"), price: 118000, capital: 500000 }],
      entry_date: d("2026-08-15T20:45"),
      entry_note: "Rejection area",
      setup: "Resistance rejection",
      exit_date: null,
      exit_price: null,
      pnl: null,
      pnl_percent: null,
      status: "OPEN",
      created_at: d("2026-08-15T20:45"),
      updated_at: d("2026-08-15T20:45"),
    },
    {
      // Contoh DCA: 3 entry modal sama, harga turun → avg turun. Persis data JSON.
      ...base,
      id: "t-7",
      asset: "ADAUSDT",
      market: "Futures",
      position: "Long",
      leverage: 5,
      mark_price: 600,
      entries: [
        { date: d("2026-08-10T09:00"), price: 1000, capital: 1000000 },
        { date: d("2026-08-12T09:00"), price: 800, capital: 1000000 },
        { date: d("2026-08-14T09:00"), price: 600, capital: 1000000 },
      ],
      entry_date: d("2026-08-10T09:00"),
      entry_note: "DCA: entry di tiap penurunan",
      setup: "Average down",
      exit_date: null,
      exit_price: null,
      pnl: null,
      pnl_percent: null,
      status: "OPEN",
      created_at: d("2026-08-10T09:00"),
      updated_at: d("2026-08-14T09:00"),
    },
    {
      // Contoh DCA Spot: posisi null (badge disembunyikan), avg 2297 → profit saat harga kembali ke 2350.
      ...base,
      id: "t-8",
      asset: "ETHUSDT",
      entries: [
        { date: d("2026-08-16T09:00"), price: 2400, capital: 2000000 },
        { date: d("2026-08-17T09:00"), price: 2300, capital: 2000000 },
        { date: d("2026-08-18T09:00"), price: 2200, capital: 2000000 },
      ],
      entry_date: d("2026-08-16T09:00"),
      mark_price: 2350,
      entry_note: "DCA saat harga turun, tunggu pullback ke avg",
      setup: "Average down",
      exit_date: null,
      exit_price: null,
      pnl: null,
      pnl_percent: null,
      status: "OPEN",
      created_at: d("2026-08-16T09:00"),
      updated_at: d("2026-08-18T09:00"),
    },
    {
      // Contoh DCA Short: nambah entry saat harga naik melawan → avg naik, P/L profit saat harga tetap di atas avg.
      ...base,
      id: "t-9",
      asset: "BTCUSDT",
      market: "Futures",
      position: "Short",
      leverage: 5,
      mark_price: 110000,
      entries: [
        { date: d("2026-08-16T14:00"), price: 105000, capital: 1000000 },
        { date: d("2026-08-17T14:00"), price: 108000, capital: 1000000 },
        { date: d("2026-08-18T14:00"), price: 111000, capital: 1000000 },
      ],
      entry_date: d("2026-08-16T14:00"),
      entry_note: "DCA short: entry lanjutan saat harga naik",
      setup: "Average down",
      exit_date: null,
      exit_price: null,
      pnl: null,
      pnl_percent: null,
      status: "OPEN",
      created_at: d("2026-08-16T14:00"),
      updated_at: d("2026-08-18T14:00"),
    },
  ];
}