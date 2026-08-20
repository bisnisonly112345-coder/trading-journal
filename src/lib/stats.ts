import type { CashFlow, EquityPoint, Trade, TradeEntry } from "./types";

// Rumus average down persis kalkulator_avg_down_ai_agent.json:
//   jumlah_aset = modal / harga ; total_aset = SUM(jumlah_aset)
//   harga_rata_rata = total_modal / total_aset
//   P/L% = (harga_sekarang / harga_rata_rata - 1) * 100
//   P/L nominal = (harga_sekarang - harga_rata_rata) * total_aset

export function totalAssets(entries: TradeEntry[]): number {
  return entries.reduce(
    (s, e) => s + (e.price > 0 ? e.capital / e.price : 0),
    0
  );
}

export function totalCapital(entries: TradeEntry[]): number {
  return entries.reduce((s, e) => s + e.capital, 0);
}

export function availableEquity(
  trades: Trade[],
  cashFlows: CashFlow[],
  market: "Spot" | "Futures"
): number {
  const depo = cashFlows
    .filter((c) => c.market === market && c.type === "DEPOSIT")
    .reduce((s, c) => s + c.amount, 0);
  const withdraw = cashFlows
    .filter((c) => c.market === market && c.type === "WITHDRAW")
    .reduce((s, c) => s + c.amount, 0);
  const m = market.toLowerCase();
  const pnl = trades
    .filter((t) => t.market.toLowerCase() === m && t.status === "CLOSED")
    .reduce((s, t) => s + (closedPnl(t) ?? 0), 0);
  const locked = trades
    .filter((t) => t.market.toLowerCase() === m && t.status === "OPEN")
    .reduce((s, t) => s + totalCapital(t.entries), 0);
  return depo - withdraw + pnl - locked;
}

export function avgPrice(entries: TradeEntry[]): number | null {
  const cap = totalCapital(entries);
  const aset = totalAssets(entries);
  return cap > 0 && aset > 0 ? cap / aset : null;
}

export function pnlPctFromAvg(
  avg: number | null,
  mark: number | null
): number | null {
  return avg && mark ? (mark / avg - 1) * 100 : null;
}

export function pnlNominalFromAvg(
  avg: number | null,
  mark: number | null,
  assets: number
): number | null {
  return avg && mark ? (mark - avg) * assets : null;
}

// Arah Short: harga naik = rugi, harga turun = untung.
function dir(t: Trade): number {
  return t.market.toLowerCase() === "futures" && t.position === "Short" ? -1 : 1;
}

// Sumber kebenaran P/L trade CLOSED:
//  - pnl_manual diutamakan (angka net dari exchange/platform, sudah termasuk fee/pajak/leverage)
//  - kalau kosong, hitung live dari avg + exit_price (arah Short dibalik)
//  - legacy (exit_price null) fallback ke pnl tersimpan
export function closedPnl(t: Trade): number | null {
  if (t.status !== "CLOSED") return null;
  if (t.pnl_manual !== null && t.pnl_manual !== undefined) return t.pnl_manual;
  const avg = avgPrice(t.entries);
  const px = t.exit_price;
  if (avg !== null && px !== null) {
    return (pnlNominalFromAvg(avg, px, totalAssets(t.entries)) ?? 0) * dir(t);
  }
  return t.pnl ?? null;
}

export function closedPnlPct(t: Trade): number | null {
  if (t.status !== "CLOSED") return null;
  if (t.pnl_manual !== null && t.pnl_manual !== undefined) {
    const cap = totalCapital(t.entries);
    return cap > 0 ? (t.pnl_manual / cap) * 100 : null;
  }
  const avg = avgPrice(t.entries);
  const px = t.exit_price;
  if (avg !== null && px !== null) {
    return (pnlPctFromAvg(avg, px) ?? 0) * dir(t);
  }
  return t.pnl_percent ?? null;
}

export interface EntryCalcRow {
  price: number;
  capital: number;
  assets: number;
  avg: number | null;
}

export function entryCalc(entries: TradeEntry[]): EntryCalcRow[] {
  const rows: EntryCalcRow[] = [];
  let cap = 0;
  let aset = 0;
  for (const e of entries) {
    cap += e.capital;
    aset += e.price > 0 ? e.capital / e.price : 0;
    rows.push({
      price: e.price,
      capital: e.capital,
      assets: aset,
      avg: cap > 0 && aset > 0 ? cap / aset : null,
    });
  }
  return rows;
}

export interface Stats {
  total: number;
  win: number;
  loss: number;
  winRate: number | null;
  best: Trade | null;
  worst: Trade | null;
  avgHoldingMs: number | null;
  netPnl: number;
  totalDeposit: number;
  totalWithdraw: number;
  equity: number;
  roi: number | null;
}

export function withPnl(trades: Trade[]): Trade[] {
  return trades.filter((t) => t.status === "CLOSED" && closedPnl(t) !== null);
}

export function computeStats(
  trades: Trade[],
  cashFlows: CashFlow[]
): Stats {
  const closed = trades.filter((t) => t.status === "CLOSED");
  const win = closed.filter((t) => (closedPnl(t) ?? 0) > 0).length;
  const loss = closed.filter((t) => (closedPnl(t) ?? 0) < 0).length;
  const winRate =
    win + loss > 0 ? (win / (win + loss)) * 100 : null;
  const pnlTrades = withPnl(trades);
  const netPnl = pnlTrades.reduce((s, t) => s + (closedPnl(t) ?? 0), 0);
  const best = pnlTrades.length
    ? pnlTrades.reduce((a, b) => ((closedPnl(a) ?? 0) >= (closedPnl(b) ?? 0) ? a : b))
    : null;
  const worst = pnlTrades.length
    ? pnlTrades.reduce((a, b) => ((closedPnl(a) ?? 0) <= (closedPnl(b) ?? 0) ? a : b))
    : null;
  const withTimes = closed.filter((t) => t.exit_date);
  const avgHoldingMs = withTimes.length
    ? withTimes.reduce((s, t) => s + (new Date(t.exit_date!).getTime() - new Date(t.entry_date).getTime()), 0) /
      withTimes.length
    : null;

  const totalDeposit = cashFlows
    .filter((c) => c.type === "DEPOSIT")
    .reduce((s, c) => s + c.amount, 0);
  const totalWithdraw = cashFlows
    .filter((c) => c.type === "WITHDRAW")
    .reduce((s, c) => s + c.amount, 0);
  const equity = totalDeposit - totalWithdraw + netPnl;
  const roi = totalDeposit > 0 ? (netPnl / totalDeposit) * 100 : null;

  return {
    total: trades.length,
    win,
    loss,
    winRate,
    best,
    worst,
    avgHoldingMs,
    netPnl,
    totalDeposit,
    totalWithdraw,
    equity,
    roi,
  };
}

export function equityCurve(
  trades: Trade[],
  cashFlows: CashFlow[]
): EquityPoint[] {
  type Ev = { date: string; delta: number };
  const events: Ev[] = cashFlows.map((c) => ({
    date: c.date,
    delta: c.type === "DEPOSIT" ? c.amount : -c.amount,
  }));
  for (const t of withPnl(trades)) {
    if (!t.exit_date) continue;
    events.push({ date: t.exit_date, delta: closedPnl(t)! });
  }
  if (!events.length) return [];
  events.sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  return events.map((e) => {
    running += e.delta;
    return { date: e.date, equity: running };
  });
}

export function maxDrawdown(points: EquityPoint[]): {
  percent: number;
  abs: number;
} | null {
  if (!points.length) return null;
  let peak = points[0].equity;
  let worst = 0;
  let worstAbs = 0;
  for (const p of points) {
    if (p.equity > peak) peak = p.equity;
    if (peak !== 0) {
      const dd = (p.equity - peak) / peak;
      if (dd < worst) {
        worst = dd;
        worstAbs = p.equity - peak;
      }
    }
  }
  return { percent: worst * 100, abs: worstAbs };
}