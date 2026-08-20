"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ScreenshotUpload from "@/components/ScreenshotUpload";
import { Badge, Card } from "@/components/ui";
import { addEntry, closeTrade, deleteTrade, setMarkPrice, useDB } from "@/lib/db";
import { dateTime, holdingHuman, holdingMs, idr, num, pct } from "@/lib/format";
import { entryCalc, closedPnl, closedPnlPct, pnlNominalFromAvg, pnlPctFromAvg, totalAssets, totalCapital } from "@/lib/stats";
import type { Trade } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const trade = useDB().trades.find((t) => t.id === id);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  const [dcDate, setDcDate] = useState("");
  const [dcTime, setDcTime] = useState("");
  const [dcPrice, setDcPrice] = useState("");
  const [dcCap, setDcCap] = useState("");

  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [pnlManual, setPnlManual] = useState("");
  const [lowestPrice, setLowestPrice] = useState("");
  const [highestPrice, setHighestPrice] = useState("");
  const [exitShot, setExitShot] = useState<string | null>(null);
  const [exitNote, setExitNote] = useState("");

  const [lightbox, setLightbox] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);
  if (!trade) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">Trade tidak ditemukan.</p>
        <Link href="/journal" className="text-sm text-blue-600">
          Kembali ke Trade Journal
        </Link>
      </Card>
    );
  }

  const isOpen = trade.status === "OPEN";
  const lastEntryPrice = trade.entries.length
    ? trade.entries[trade.entries.length - 1].price
    : null;
  const rows = entryCalc(trade.entries);
  const avg = rows.length ? rows[rows.length - 1].avg : null;
  const totalModal = totalCapital(trade.entries);
  const totalAset = totalAssets(trade.entries);
  const firstEntryPrice = trade.entries.length ? trade.entries[0].price : null;
  const drawdownPct =
    firstEntryPrice !== null && trade.lowest_price !== null
      ? ((trade.lowest_price - firstEntryPrice) / firstEntryPrice) * 100
      : null;

  const spotRoiMax =
    !trade.position && trade.highest_price !== null && totalModal > 0
      ? ((pnlNominalFromAvg(avg, trade.highest_price, totalAset) ?? 0) / totalModal) * 100
      : null;
  const spotRoiMin =
    !trade.position && trade.lowest_price !== null && totalModal > 0
      ? ((pnlNominalFromAvg(avg, trade.lowest_price, totalAset) ?? 0) / totalModal) * 100
      : null;

  const mfe =
    isOpen || !avg || !trade.position
      ? null
      : trade.position === "Long"
        ? trade.highest_price
          ? ((trade.highest_price - avg) / avg) * 100
          : null
        : trade.lowest_price
          ? ((avg - trade.lowest_price) / avg) * 100
          : null;
  const mae =
    isOpen || !avg || !trade.position
      ? null
      : trade.position === "Long"
        ? trade.lowest_price
          ? ((trade.lowest_price - avg) / avg) * 100
          : null
        : trade.highest_price
          ? ((avg - trade.highest_price) / avg) * 100
          : null;

  const submitClose = (e: React.FormEvent) => {
    e.preventDefault();
    const exit = new Date(`${exitDate}T${exitTime || "00:00"}`);
    const exitPx = exitPrice ? Number(exitPrice) : null;
    const manual = pnlManual ? Number(pnlManual) : null;
    const err = closeTrade(trade.id, {
      exit_date: exit.toISOString(),
      exit_price: exitPx,
      lowest_price: lowestPrice ? Number(lowestPrice) : null,
      highest_price: highestPrice ? Number(highestPrice) : null,
      pnl: manual,
      pnl_manual: manual,
      pnl_percent: manual !== null && totalModal > 0 ? (manual / totalModal) * 100 : null,
      exit_screenshot: exitShot,
      exit_note: exitNote || null,
    });
    if (err) {
      alert(err);
      return;
    }
    router.refresh();
  };

  const submitDca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dcPrice || !dcCap || !dcDate) return;
    const err = addEntry(trade.id, {
      date: new Date(`${dcDate}T${dcTime || "00:00"}`).toISOString(),
      price: Number(dcPrice),
      capital: Number(dcCap),
    });
    if (err) {
      alert(err);
      return;
    }
    setDcDate("");
    setDcTime("");
    setDcPrice("");
    setDcCap("");
  };

  const onDelete = () => {
    if (confirm("Hapus trade ini? Item akan masuk Sampah.")) {
      deleteTrade(trade.id);
      router.push("/journal");
    }
  };

  return (
    <>
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/journal" className="text-sm text-blue-600">
          ← Trade Journal
        </Link>
        <button onClick={onDelete} className="text-sm text-rose-600">
          Hapus Trade
        </button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">{trade.asset}</h1>
        {trade.position ? (
          <Badge tone={trade.position === "Long" ? "blue" : "zinc"}>
            {trade.position}
          </Badge>
        ) : null}
        <Badge tone={isOpen ? "blue" : "zinc"}>{trade.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Entri ({trade.entries.length}x)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-zinc-600">
                  <th className="py-1 pr-2">Tanggal</th>
                  <th className="py-1 pr-2">Harga</th>
                  <th className="py-1 pr-2">Modal</th>
                  <th className="py-1">Avg</th>
                </tr>
              </thead>
              <tbody>
                {trade.entries.map((en, i) => (
                  <tr key={i} className="border-t border-zinc-100">
                    <td className="py-1 pr-2 font-semibold text-zinc-900">{dateTime(en.date)}</td>
                    <td className="py-1 pr-2 font-semibold text-zinc-900">{num(en.price)}</td>
                    <td className="py-1 pr-2 font-semibold text-zinc-900">{idr(en.capital)}</td>
                    <td className="py-1 font-semibold text-zinc-900">{num(rows[i]?.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Row k="Total Modal" v={idr(totalModal)} />
            <Row k="Total Aset" v={num(totalAset)} />
            <Row k="Harga Rata-rata" v={num(avg)} />
            <Row k="Market" v={trade.market} />
            <Row k="Leverage" v={trade.leverage === null ? "—" : `${trade.leverage}x`} />
          </dl>
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-zinc-600">Screenshot Entry</div>
            {trade.entry_screenshot ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={trade.entry_screenshot}
                alt="Entry screenshot"
                onClick={() => {
                  setZoom(1);
                  setLightbox(trade.entry_screenshot);
                }}
                className="max-h-48 cursor-zoom-in rounded-lg border border-zinc-200 object-contain transition hover:opacity-90"
              />
            ) : (
              <p className="text-sm text-zinc-500">Belum ada screenshot.</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
            Exit
          </h2>
          {isOpen ? (
            <p className="text-sm text-zinc-600">
              Masih OPEN —{" "}
              <span className="font-medium text-sky-700">
                Holding: {holdingHuman(holdingMs(trade.entry_date, null, now))}
              </span>
            </p>
          ) : (
            <dl className="space-y-1.5 text-sm">
              <Row k="Tanggal/Jam" v={dateTime(trade.exit_date)} />
              <Row k="Harga" v={num(trade.exit_price)} />
              <Row k="Holding Time" v={holdingHuman(holdingMs(trade.entry_date, trade.exit_date))} />
              {trade.position ? (
                <>
                  <Row k="Lowest Price" v={trade.lowest_price === null ? "—" : num(trade.lowest_price)} />
                  <Row k="Highest Price" v={trade.highest_price === null ? "—" : num(trade.highest_price)} />
                </>
              ) : (
                <>
                  <Row k="Terendah" v={trade.lowest_price === null ? "—" : num(trade.lowest_price)} />
                  <Row k="Tertinggi" v={trade.highest_price === null ? "—" : num(trade.highest_price)} />
                  <Row k="ROI Tertinggi" v={spotRoiMax === null ? "—" : pct(spotRoiMax)} tone={(spotRoiMax ?? 0) >= 0 ? "profit" : "loss"} />
                  <Row k="ROI Terendah" v={spotRoiMin === null ? "—" : pct(spotRoiMin)} tone={(spotRoiMin ?? 0) <= 0 ? "loss" : "profit"} />
                </>
              )}
              <Row k="P/L" v={idr(closedPnl(trade))} tone={(closedPnl(trade) ?? 0) >= 0 ? "profit" : "loss"} />
              <Row k="P/L %" v={pct(closedPnlPct(trade))} tone={(closedPnlPct(trade) ?? 0) >= 0 ? "profit" : "loss"} />
              {trade.pnl_manual !== null ? (
                <Row k="P/L Manual" v={idr(trade.pnl_manual)} tone={(trade.pnl_manual ?? 0) >= 0 ? "profit" : "loss"} />
              ) : null}
              <Row k="Drawdown" v={pct(drawdownPct)} tone={(drawdownPct ?? 0) <= 0 ? "loss" : "profit"} />
              {trade.position ? (
                <>
                  <Row k="MFE" v={mfe === null ? "—" : pct(mfe)} tone={(mfe ?? 0) >= 0 ? "profit" : "loss"} />
                  <Row k="MAE" v={mae === null ? "—" : pct(mae)} tone={(mae ?? 0) <= 0 ? "loss" : "profit"} />
                </>
              ) : null}
            </dl>
          )}
          {!isOpen && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-medium text-zinc-600">Screenshot Exit</div>
              {trade.exit_screenshot ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={trade.exit_screenshot}
                  alt="Exit screenshot"
                  onClick={() => {
                    setZoom(1);
                    setLightbox(trade.exit_screenshot);
                  }}
                  className="max-h-48 cursor-zoom-in rounded-lg border border-zinc-200 object-contain transition hover:opacity-90"
                />
              ) : (
                <p className="text-sm text-zinc-500">Belum ada screenshot.</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {isOpen ? (
        <MarkPanel
          key={trade.id}
          tradeId={trade.id}
          trade={trade}
          markPrice={trade.mark_price}
          avg={avg}
          totalAset={totalAset}
          lastEntryPrice={lastEntryPrice}
        />
      ) : null}

      {isOpen ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">
            Tambah Entry (DCA / Average Down)
          </h2>
          <form onSubmit={submitDca} className="grid grid-cols-2 gap-3">
            <Field label="Tanggal">
              <input
                type="date"
                className={inputCls}
                value={dcDate}
                onChange={(e) => setDcDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Jam">
              <input
                type="time"
                className={inputCls}
                value={dcTime}
                onChange={(e) => setDcTime(e.target.value)}
              />
            </Field>
            <Field label="Harga">
              <input
                className={inputCls}
                value={dcPrice}
                onChange={(e) => setDcPrice(e.target.value)}
                placeholder="500"
                required
              />
            </Field>
            <Field label="Modal">
              <input
                className={inputCls}
                value={dcCap}
                onChange={(e) => setDcCap(e.target.value)}
                placeholder="1000000"
                required
              />
            </Field>
            <div className="col-span-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Tambah Entry — avg akan turun
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {isOpen ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Close Trade</h2>
          <form onSubmit={submitClose} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal Exit">
                <input
                  type="date"
                  className={inputCls}
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Jam Exit">
                <input
                  type="time"
                  className={inputCls}
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                />
              </Field>
              <Field label="Harga Exit">
                <input
                  className={inputCls}
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="118000"
                />
              </Field>
              <Field label="P/L (sesuai Platform)">
                <input
                  className={inputCls}
                  value={pnlManual}
                  onChange={(e) => setPnlManual(e.target.value)}
                  placeholder="50000"
                />
              </Field>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Trade Price Range
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={trade.position ? "Lowest Price" : "Terendah"}>
                  <input
                    className={inputCls}
                    value={lowestPrice}
                    onChange={(e) => setLowestPrice(e.target.value)}
                    placeholder={trade.position ? "Masukkan harga terendah" : "Masukkan harga terendah"}
                  />
                </Field>
                <Field label={trade.position ? "Highest Price" : "Tertinggi"}>
                  <input
                    className={inputCls}
                    value={highestPrice}
                    onChange={(e) => setHighestPrice(e.target.value)}
                    placeholder={trade.position ? "Masukkan harga tertinggi" : "Masukkan harga tertinggi"}
                  />
                </Field>
              </div>
              {lowestPrice && highestPrice && Number(lowestPrice) > Number(highestPrice) ? (
                <p className="mt-1 text-xs text-rose-600">
                  Terendah tidak boleh lebih besar dari tertinggi.
                </p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-500">
                Opsional. Bila kosong tidak mengubah P/L dan akan ditampilkan sebagai &quot;—&quot;.
              </p>
            </div>
            <Field label="Screenshot Exit">
              <ScreenshotUpload value={exitShot} onChange={setExitShot} />
            </Field>
            <Field label="Alasan Exit / Catatan">
              <textarea
                className={inputCls}
                rows={2}
                value={exitNote}
                onChange={(e) => setExitNote(e.target.value)}
                placeholder="Target tercapai"
              />
            </Field>
            <p className="text-xs text-zinc-500">
              Isi &quot;P/L (sesuai Platform)&quot; bila ingin memakai angka net dari exchange
              (sudah termasuk fee/pajak/leverage). Kosongkan untuk hitung otomatis dari
              harga exit vs harga rata-rata.
            </p>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Tutup Trade
            </button>
          </form>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Catatan
        </h2>
        <dl className="space-y-1.5 text-sm">
          <Row k="Setup" v={trade.setup ?? "—"} />
          <Row k="Alasan Entry" v={trade.entry_note ?? "—"} />
          <Row k="Alasan Exit" v={trade.exit_note ?? "—"} />
        </dl>
      </Card>
    </div>

    {lightbox && (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
        onClick={() => setLightbox(null)}
      >
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.min(z * 1.5, 8));
            }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-lg font-semibold text-white hover:bg-white/20"
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.max(z / 1.5, 0.25));
            }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-lg font-semibold text-white hover:bg-white/20"
          >
            −
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(1);
            }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
          >
            100%
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightbox}
          alt="Screenshot"
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => (z === 1 ? 2 : 1));
          }}
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, cursor: "zoom-in" }}
        />
        <p className="mt-3 text-xs text-zinc-400">
          Klik gambar untuk zoom • klik di luar untuk menutup • Esc
        </p>
      </div>
    )}
    </>
  );
}

function MarkPanel({
  tradeId,
  trade,
  markPrice,
  avg,
  totalAset,
  lastEntryPrice,
}: {
  tradeId: string;
  trade: Trade;
  markPrice: number | null;
  avg: number | null;
  totalAset: number;
  lastEntryPrice: number | null;
}) {
  const [markInput, setMarkInput] = useState(markPrice?.toString() ?? "");
  const markNum = markInput ? Number(markInput) : markPrice ?? lastEntryPrice;
  const dir = trade.market.toLowerCase() === "futures" && trade.position === "Short" ? -1 : 1;
  const plPct = pnlPctFromAvg(avg, markNum) !== null ? (pnlPctFromAvg(avg, markNum) ?? 0) * dir : null;
  const plNom = pnlNominalFromAvg(avg, markNum, totalAset) !== null ? (pnlNominalFromAvg(avg, markNum, totalAset) ?? 0) * dir : null;
  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold">P/L vs Harga Rata-rata</h2>
      <div className="flex items-end gap-3">
        <label className="block flex-1 text-xs font-medium text-zinc-600">
          Harga Saat Ini
          <input
            type="number"
            className={`${inputCls} mt-1`}
            value={markInput}
            placeholder={lastEntryPrice?.toString() ?? ""}
            onChange={(e) => setMarkInput(e.target.value)}
            onBlur={() => setMarkPrice(tradeId, markInput ? Number(markInput) : null)}
          />
        </label>
        <div
          className={`flex-1 rounded-lg p-3 text-sm font-semibold ${
            (plPct ?? 0) >= 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {pct(plPct)}
          <div className="text-xs font-normal">{idr(plNom)}</div>
        </div>
      </div>
    </Card>
  );
}

function Row({
  k,
  v,
  tone,
}: {
  k: string;
  v: string;
  tone?: "profit" | "loss";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-600">{k}</dt>
      <dd className={tone === "profit" ? "font-medium text-emerald-600" : tone === "loss" ? "font-medium text-rose-600" : "font-medium text-zinc-900"}>
        {v}
      </dd>
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