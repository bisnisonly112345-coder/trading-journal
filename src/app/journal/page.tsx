"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { deleteTrades, useDB } from "@/lib/db";
import { idr, num, pct, dateTime, holdingHuman } from "@/lib/format";
import {
  avgPrice,
  closedPnl,
  closedPnlPct,
  pnlNominalFromAvg,
  totalAssets,
  totalCapital,
} from "@/lib/stats";
import type { TradeStatus } from "@/lib/types";

type Filter = "ALL" | TradeStatus;
type Market = "SPOT" | "FUTURES";

export default function Journal() {
  const data = useDB();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [market, setMarket] = useState<Market>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tj_market_tab") : null;
    return saved === "FUTURES" ? "FUTURES" : "SPOT";
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visibleTrades = data.trades
    .filter((t) => filter === "ALL" || t.status === filter)
    .filter((t) => t.market.toLowerCase() === market.toLowerCase());
  const trades = visibleTrades
    .slice()
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

  const tabs: { key: Filter; label: string }[] = [
    { key: "ALL", label: "Semua" },
    { key: "OPEN", label: "Open Trade" },
    { key: "CLOSED", label: "Closed Trade" },
  ];
  const marketTabs: { key: Market; label: string }[] = [
    { key: "SPOT", label: "Spot" },
    { key: "FUTURES", label: "Futures" },
  ];

  const openTrade = (id: string) => {
    router.push(`/journal/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trade Journal</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setDeleteMode((v) => !v);
              setSelected(new Set());
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              deleteMode
                ? "bg-zinc-900 text-white"
                : "bg-rose-100 text-rose-700 hover:bg-rose-200"
            }`}
          >
            {deleteMode ? "Selesai" : "Hapus"}
          </button>
          <Link
            href="/journal/new"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah Trade
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === t.key
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {marketTabs.map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setMarket(m.key);
              localStorage.setItem("tj_market_tab", m.key);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              market === m.key
                ? "bg-blue-600 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {!trades.length ? (
        <Card>
          <p className="text-sm text-zinc-500">Belum ada trade {filter === "ALL" ? "" : filter.toLowerCase()}.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                {deleteMode ? (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === trades.length && trades.length > 0}
                      onChange={(e) => {
                        setSelected(
                          e.target.checked
                            ? new Set(trades.map((t) => t.id))
                            : new Set()
                        );
                      }}
                      className="h-4 w-4"
                    />
                  </th>
                ) : null}
                <th className="px-4 py-3 font-medium">Aset</th>
                <th className="px-4 py-3 font-medium">Posisi</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 text-right font-medium">Harga</th>
                <th className="px-4 py-3 text-right font-medium">Modal</th>
                <th className="px-4 py-3 text-right font-medium">P/L</th>
                <th className="px-4 py-3 text-right font-medium">ROI</th>
                {market === "SPOT" ? (
                  <>
                    <th className="px-4 py-3 text-right font-medium">ROI Tertinggi</th>
                    <th className="px-4 py-3 text-right font-medium">ROI Terendah</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const n = t.entries.length;
                const avg = avgPrice(t.entries);
                const totalAset = totalAssets(t.entries);
                const pnl = closedPnl(t);
                const pnlPercent = closedPnlPct(t);
                const cap = totalCapital(t.entries);
                const roi = pnl !== null && cap > 0 ? (pnl / cap) * 100 : null;
                const roiMax =
                  market === "SPOT" &&
                  t.status === "CLOSED" &&
                  t.highest_price !== null &&
                  cap > 0
                    ? (pnlNominalFromAvg(avg, t.highest_price, totalAset) ?? 0) / cap * 100
                    : null;
                const roiMin =
                  market === "SPOT" &&
                  t.status === "CLOSED" &&
                  t.lowest_price !== null &&
                  cap > 0
                    ? (pnlNominalFromAvg(avg, t.lowest_price, totalAset) ?? 0) / cap * 100
                    : null;
                return t.entries.map((en, i) => (
                  <tr
                    key={`${t.id}-${i}`}
                    onClick={() => {
                      if (!deleteMode) openTrade(t.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !deleteMode) openTrade(t.id);
                    }}
                    role="link"
                    tabIndex={0}
                    className={`cursor-pointer border-b border-zinc-100 last:border-b-0 ${
                      i === 0 ? "bg-white" : "bg-zinc-50/60"
                    } hover:bg-zinc-100 ${selected.has(t.id) ? "bg-blue-50" : ""}`}
                  >
                    {i === 0 && deleteMode ? (
                      <td rowSpan={n} className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(t.id);
                            else next.delete(t.id);
                            setSelected(next);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4"
                        />
                      </td>
                    ) : null}
                    {i === 0 ? (
                      <>
                        <td
                          rowSpan={n}
                          className="px-4 py-3 align-top"
                        >
                          <Link
                            href={`/journal/${t.id}`}
                            onClick={(e) => {
                              if (deleteMode) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            className="font-bold text-zinc-900 uppercase"
                          >
                            {t.asset}
                          </Link>
                        </td>
                        <td rowSpan={n} className="px-4 py-3 align-top text-zinc-600">
                          {t.position ? t.position : "—"}
                        </td>
                        <td rowSpan={n} className="px-4 py-3 align-top">
                          <span
                            className={
                              t.status === "OPEN"
                                ? "rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700"
                                : "rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600"
                            }
                          >
                            {t.status}
                          </span>
                          {t.status === "OPEN" ? (
                            <>
                              <div className="mt-1 text-xs text-zinc-500">
                                Holding: {holdingHuman(now - new Date(t.entry_date).getTime())}
                              </div>
                              <Link
                                href={`/journal/${t.id}`}
                                onClick={(e) => {
                                  if (deleteMode) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                }}
                                className="mt-1.5 inline-block rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                + Tambah Entri
                              </Link>
                            </>
                          ) : (
                            <div className="mt-1 text-xs text-zinc-500">
                              Exit: {dateTime(t.exit_date)}
                            </div>
                          )}
                        </td>
                      </>
                    ) : null}
                    <td className="px-4 py-3 text-zinc-600">
                      <span className="text-zinc-400">{i > 0 ? `x${i + 1}` : "x1"}</span>{" "}
                      {dateTime(en.date)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                      {num(en.price)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                      {idr(en.capital)}
                    </td>
                    {i === 0 ? (
                      <>
                        <td
                          rowSpan={n}
                          className={`px-4 py-3 text-right align-top font-semibold ${
                            t.status !== "CLOSED" || pnl === null
                              ? "text-zinc-500"
                              : pnl >= 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                          }`}
                        >
                          {t.status !== "CLOSED" || pnl === null
                            ? "—"
                            : `${idr(pnl)} (${pct(pnlPercent)})`}
                        </td>
                        <td
                          rowSpan={n}
                          className={`px-4 py-3 text-right align-top font-semibold ${
                            t.status !== "CLOSED" || roi === null
                              ? "text-zinc-400"
                              : roi >= 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                          }`}
                        >
                          {t.status !== "CLOSED" || roi === null ? "—" : pct(roi)}
                        </td>
                        {market === "SPOT" ? (
                          <>
                            <td
                              rowSpan={n}
                              className={`px-4 py-3 text-right align-top font-semibold ${
                                roiMax === null
                                  ? "text-zinc-400"
                                  : roiMax >= 0
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                              }`}
                            >
                              {roiMax === null ? "—" : pct(roiMax)}
                            </td>
                            <td
                              rowSpan={n}
                              className={`px-4 py-3 text-right align-top font-semibold ${
                                roiMin === null
                                  ? "text-zinc-400"
                                  : roiMin >= 0
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                              }`}
                            >
                              {roiMin === null ? "—" : pct(roiMin)}
                            </td>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </Card>
      )}

      {selected.size > 0 ? (
        <div className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-sm text-zinc-700">{selected.size} dipilih</span>
          <button
            onClick={() => {
              if (confirm(`Hapus ${selected.size} trade? Item akan masuk Sampah.`)) {
                deleteTrades([...selected]);
                setDeleteMode(false);
                setSelected(new Set());
              }
            }}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Hapus ({selected.size})
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Batal
          </button>
        </div>
      ) : null}
    </div>
  );
}