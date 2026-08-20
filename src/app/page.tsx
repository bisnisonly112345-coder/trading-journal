"use client";

import Link from "next/link";
import { useState } from "react";
import EquityChart from "@/components/EquityChart";
import { Card, SectionTitle, StatCard } from "@/components/ui";
import { useDB } from "@/lib/db";
import { idr, pct, holdingHuman, shortDate } from "@/lib/format";
import { computeStats, closedPnl, equityCurve, maxDrawdown } from "@/lib/stats";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const firstOfMonth = () => {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
};
const todayIso = () => iso(new Date());

export default function Dashboard() {
  const data = useDB();
  const { trades, cashFlows } = data;
  const [market, setMarket] = useState<"ALL" | "Spot" | "Futures">("ALL");

  const ftrades = trades.filter(
    (t) => market === "ALL" || t.market.toLowerCase() === market.toLowerCase()
  );
  const fflows = cashFlows.filter(
    (c) => market === "ALL" || c.market === market
  );
  const stats = computeStats(ftrades, fflows);
  const curve = equityCurve(ftrades, fflows);
  const dd = maxDrawdown(curve);

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayIso());

  const visible = curve.filter((p) => {
    const d = p.date.slice(0, 10);
    return d >= from && d <= to;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="flex gap-2">
        {(["ALL", "Spot", "Futures"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              market === m
                ? "bg-blue-600 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {m === "ALL" ? "Semua" : m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Dana Masuk" value={idr(stats.totalDeposit)} />
        <StatCard label="Dana Keluar" value={idr(stats.totalWithdraw)} />
        <StatCard label="Equity" value={idr(stats.equity)} />
        <StatCard
          label="Net P/L"
          value={idr(stats.netPnl)}
          tone={stats.netPnl >= 0 ? "profit" : "loss"}
        />
        <StatCard
          label="ROI"
          value={pct(stats.roi)}
          tone={(stats.roi ?? 0) >= 0 ? "profit" : "loss"}
        />
        <StatCard
          label="Maximum Drawdown"
          value={dd ? pct(dd.percent) : "—"}
          tone="loss"
        />
        <StatCard
          label="Recovery"
          value={stats.netPnl < 0 ? idr(stats.netPnl) : "Rp 0"}
          tone={stats.netPnl < 0 ? "loss" : "profit"}
          sub={stats.netPnl < 0 ? "Rugi belum tertutup" : "Tidak ada dana perlu recovery"}
        />
      </div>

      <Card>
        <SectionTitle>Equity Curve</SectionTitle>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1 text-zinc-600">
            Dari
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1 text-zinc-600">
            Sampai
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1"
            />
          </label>
          <button
            onClick={() => {
              setFrom(firstOfMonth());
              setTo(todayIso());
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
          >
            Bulan ini
          </button>
        </div>
        <EquityChart points={visible} />
        <p className="mt-1 text-xs text-zinc-500">
          Secara otomatis menampilkan 1 bulan terakhir dan refresh setiap tanggal 1.
          Data lama tetap tersimpan, tidak dihapus.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <SectionTitle>Statistik Trading</SectionTitle>
          <dl className="space-y-2 text-sm">
            <Row k="Total Trade" v={String(stats.total)} />
            <Row k="Win" v={String(stats.win)} />
            <Row k="Loss" v={String(stats.loss)} />
            <Row k="Win Rate" v={pct(stats.winRate)} />
            <Row k="Best Trade" v={stats.best ? idr(closedPnl(stats.best)) : "—"} />
            <Row k="Worst Trade" v={stats.worst ? idr(closedPnl(stats.worst)) : "—"} />
            <Row k="Avg Holding Time" v={stats.avgHoldingMs !== null ? holdingHuman(stats.avgHoldingMs) : "—"} />
          </dl>
        </Card>

        <Card className="sm:col-span-2">
          <SectionTitle>Trade Terbaru</SectionTitle>
          <ul className="divide-y divide-zinc-100">
            {ftrades.slice(-5).reverse().map((t) => (
              <li key={t.id}>
                <Link
                  href={`/journal/${t.id}`}
                  className="flex items-center justify-between py-2 text-sm hover:bg-zinc-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-black uppercase">{t.asset}</span>
                    <span className="inline-flex items-center justify-center rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
                      {t.market}{t.position ? ` · ${t.position}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-zinc-600">
                    {shortDate(t.entry_date)}
                    <span
                      className={
                        t.status === "OPEN"
                          ? "rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700"
                          : "rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600"
                      }
                    >
                      {t.status}
                    </span>
                    <span
                      className={closedPnl(t) === null ? "" : (closedPnl(t) ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}
                    >
                      {closedPnl(t) === null ? "—" : idr(closedPnl(t))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {!ftrades.length ? (
              <li className="py-2 text-sm text-zinc-500">Belum ada trade.</li>
            ) : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-600">{k}</dt>
      <dd className="font-medium text-zinc-900">{v}</dd>
    </div>
  );
}