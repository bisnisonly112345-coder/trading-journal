"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScreenshotUpload from "@/components/ScreenshotUpload";
import { addTrade } from "@/lib/db";
import { idr, num, pct } from "@/lib/format";
import { entryCalc, pnlNominalFromAvg, pnlPctFromAvg, totalAssets, totalCapital } from "@/lib/stats";
import type { TradeEntry } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

const cellInput =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

const cellCls = (v: string) => (v ? `${cellInput} font-bold text-zinc-900` : cellInput);

interface EntryDraft {
  date: string;
  time: string;
  price: string;
  capital: string;
}

const emptyEntry = (): EntryDraft => ({ date: "", time: "", price: "", capital: "" });

export default function NewTrade() {
  const router = useRouter();
  const [asset, setAsset] = useState("");
  const [market, setMarket] = useState("Spot");
  const [position, setPosition] = useState<"Long" | "Short">("Long");
  const [entries, setEntries] = useState<EntryDraft[]>([emptyEntry()]);
  const [markPrice] = useState("");
  const [leverage, setLeverage] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [entryNote, setEntryNote] = useState("");
  const [setup, setSetup] = useState("");

  const isFutures = market === "Futures";

  const validEntries: TradeEntry[] = entries
    .filter((e) => e.date && Number(e.price) > 0 && Number(e.capital) > 0)
    .map((e) => ({
      date: new Date(`${e.date}T${e.time || "00:00"}`).toISOString(),
      price: Number(e.price),
      capital: Number(e.capital),
    }));

  const rows = entryCalc(validEntries);
  const avg = rows.length ? rows[rows.length - 1].avg : null;
  const totalModal = totalCapital(validEntries);
  const totalAset = totalAssets(validEntries);
  const lastValidPrice = validEntries.length ? validEntries[validEntries.length - 1].price : null;
  const markNum = markPrice ? Number(markPrice) : lastValidPrice;
  const plPct = pnlPctFromAvg(avg, markNum);
  const plNom = pnlNominalFromAvg(avg, markNum, totalAset);

  const setEntry = (i: number, patch: Partial<EntryDraft>) =>
    setEntries((prev) => prev.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEntries.length) {
      alert("Isi minimal satu entry (tanggal, harga, modal).");
      return;
    }
    const err = addTrade({
      asset: asset.trim(),
      market,
      position: isFutures ? position : null,
      entries: validEntries,
      entry_date: validEntries[0].date,
      leverage: leverage ? Number(leverage) : null,
      mark_price: markNum,
      entry_screenshot: screenshot,
      exit_date: null,
      exit_price: null,
      pnl: null,
      pnl_percent: null,
      exit_screenshot: null,
      entry_note: entryNote || null,
      exit_note: null,
      setup: setup || null,
    });
    if (err) {
      alert(err);
      return;
    }
    router.push("/journal");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Tambah Trade</h1>
      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-zinc-900">
            Informasi Trade
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <Label label="Aset">
              <input
                className={inputCls}
                value={asset}
                onChange={(e) => setAsset(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                required
              />
            </Label>
            <Label label="Market">
              <select
                className={inputCls}
                value={market}
                onChange={(e) => setMarket(e.target.value)}
              >
                {["Spot", "Futures"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Label>
            {isFutures ? (
              <>
                <Label label="Posisi">
                  <select
                    className={inputCls}
                    value={position}
                    onChange={(e) => setPosition(e.target.value as "Long" | "Short")}
                  >
                    <option>Long</option>
                    <option>Short</option>
                  </select>
                </Label>
                <Label label="Leverage">
                  <input
                    className={inputCls}
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    placeholder="10"
                  />
                </Label>
              </>
            ) : null}
          </div>
        </fieldset>

<fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-zinc-900">
            Daftar Entry
            <span className="ml-2 font-normal text-zinc-500">
              — tambah beberapa entry untuk average down
            </span>
          </legend>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-600">
                  <th className="px-3 py-2">#</th>
                  <th className="px-2 py-2">Tanggal</th>
                  <th className="px-2 py-2">Jam</th>
                  <th className="px-2 py-2">Harga</th>
                  <th className="px-2 py-2">Modal</th>
                  <th className="w-9 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((en, i) => (
                  <tr key={i} className="border-b border-zinc-100 last:border-0">
                    <td className="px-3 py-2 align-top text-xs font-semibold text-zinc-600">
                      {i + 1}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className={cellCls(en.date)}
                        value={en.date}
                        onChange={(e) => setEntry(i, { date: e.target.value })}
                        required
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="time"
                        className={cellCls(en.time)}
                        value={en.time}
                        onChange={(e) => setEntry(i, { time: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={cellCls(en.price)}
                        value={en.price}
                        onChange={(e) => setEntry(i, { price: e.target.value })}
                        placeholder="1000"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={cellCls(en.capital)}
                        value={en.capital}
                        onChange={(e) => setEntry(i, { capital: e.target.value })}
                        placeholder="1000000"
                      />
                    </td>
                    <td className="px-2 py-2 text-center align-top">
                      {entries.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Hapus entry ${i + 1}`}
                          onClick={() =>
                            setEntries((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="mt-1.5 text-zinc-300 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>

        <CalcPreview
          rows={rows}
          totalModal={totalModal}
          totalAset={totalAset}
          avg={avg}
          plPct={plPct}
          plNom={plNom}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-zinc-900">
            Screenshot Entry
          </legend>
          <ScreenshotUpload value={screenshot} onChange={setScreenshot} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-zinc-900">Catatan</legend>
          <Label label="Alasan Entry">
            <textarea
              className={inputCls}
              rows={2}
              value={entryNote}
              onChange={(e) => setEntryNote(e.target.value)}
              placeholder="Breakout resistance"
            />
          </Label>
          <Label label="Setup">
            <input
              className={inputCls}
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              placeholder="Breakout resistance"
            />
          </Label>
          <p className="text-xs text-zinc-500">
            Field kosong disimpan sebagai NULL, bukan 0. Jumlah entry tidak
            dibatasi — tambah entry saat drawdown untuk menurunkan harga
            rata-rata.
          </p>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Simpan Trade (OPEN)
        </button>
      </form>
    </div>
  );
}

function CalcPreview({
  rows,
  totalModal,
  totalAset,
  avg,
  plPct,
  plNom,
}: {
  rows: { price: number; capital: number; assets: number; avg: number | null }[];
  totalModal: number;
  totalAset: number;
  avg: number | null;
  plPct: number | null;
  plNom: number | null;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-3">
      <legend className="text-sm font-semibold text-zinc-900">
        Kalkulator Average Down
      </legend>
      {!rows.length ? (
        <p className="text-sm text-zinc-500">
          Isi harga &amp; modal entry untuk melihat hasil kalkulasi.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-zinc-600">
                  <th className="py-1 pr-2">Entry</th>
                  <th className="py-1 pr-2">Harga</th>
                  <th className="py-1 pr-2">Modal</th>
                  <th className="py-1 pr-2">Jumlah Aset</th>
                  <th className="py-1">Avg Setelah</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-100">
                    <td className="py-1 pr-2 font-semibold text-zinc-900">{i + 1}</td>
                    <td className="py-1 pr-2 font-semibold text-zinc-900">{num(r.price)}</td>
                    <td className="py-1 pr-2 font-semibold text-zinc-900">{idr(r.capital)}</td>
                    <td className="py-1 pr-2 font-semibold text-zinc-900">{num(r.assets)}</td>
                    <td className="py-1 font-semibold text-zinc-900">{num(r.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <SummaryRow k="Total Modal" v={idr(totalModal)} />
            <SummaryRow k="Total Aset" v={num(totalAset)} />
            <SummaryRow k="Harga Rata-rata" v={num(avg)} />
          </dl>
          <div
            className={`rounded-lg p-3 text-sm font-semibold ${
              (plPct ?? 0) >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            P/L: {pct(plPct)} · {idr(plNom)}
          </div>
        </>
      )}
    </fieldset>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-600">{k}</dt>
      <dd className="font-medium text-zinc-900">{v}</dd>
    </div>
  );
}

function Label({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-zinc-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}