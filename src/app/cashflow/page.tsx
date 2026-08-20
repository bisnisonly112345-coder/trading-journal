"use client";

import { useState } from "react";
import { Card, SectionTitle, StatCard } from "@/components/ui";
import { addCashFlow, deleteCashFlow, useDB } from "@/lib/db";
import { dateTime, idr } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import type { CashFlowType } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default function CashFlow() {
  const data = useDB();
  const [market, setMarket] = useState<"ALL" | "Spot" | "Futures">("ALL");
  const [type, setType] = useState<CashFlowType>("DEPOSIT");
  const [flowMarket, setFlowMarket] = useState<"Spot" | "Futures">("Spot");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const filtered = data.cashFlows.filter(
    (c) => market === "ALL" || c.market === market
  );
  const stats = computeStats(data.trades, filtered);
  const flows = filtered
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;
    const err = addCashFlow({
      type,
      market: flowMarket,
      amount: Number(amount),
      date: new Date(date).toISOString(),
      note: note || null,
    });
    if (err) {
      alert(err);
      return;
    }
    setAmount("");
    setNote("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Cash Flow</h1>

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

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Dana Masuk" value={idr(stats.totalDeposit)} />
        <StatCard label="Total Dana Keluar" value={idr(stats.totalWithdraw)} />
      </div>

      <Card>
        <SectionTitle>Tambah Dana</SectionTitle>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Market">
            <div className="flex gap-2">
              {(["Spot", "Futures"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFlowMarket(m)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    flowMarket === m
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Jenis">
            <div className="flex gap-2">
              {(["DEPOSIT", "WITHDRAW"] as CashFlowType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    type === t
                      ? t === "DEPOSIT"
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {t === "DEPOSIT" ? "Deposit" : "Withdraw"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Tanggal">
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Jumlah (Rp)">
            <input
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000"
              required
            />
          </Field>
          <Field label="Catatan">
            <input
              className={inputCls}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Modal awal"
            />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Simpan
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionTitle>Riwayat</SectionTitle>
        {!flows.length ? (
          <p className="text-sm text-zinc-500">Belum ada transaksi.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {flows.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span
                    className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                      f.type === "DEPOSIT"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {f.type === "DEPOSIT" ? "Deposit" : "Withdraw"}
                  </span>
                  <span className="text-zinc-600">{dateTime(f.date)}</span>
                  {f.note ? <span className="ml-2 text-zinc-500">{f.note}</span> : null}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      f.type === "DEPOSIT" ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"
                    }
                  >
                    {f.type === "DEPOSIT" ? "+" : "-"}
                    {idr(f.amount)}
                  </span>
                  <button
                    onClick={() => deleteCashFlow(f.id)}
                    className="text-xs text-zinc-500 hover:text-rose-600"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-zinc-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}