"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle } from "@/components/ui";
import { emptyTrash, restoreFromTrash, useTrash } from "@/lib/db";
import { dateTime, idr } from "@/lib/format";
import type { TrashItem } from "@/lib/db";

const DAY = 86400000;

function remainingDays(item: TrashItem, now: number): string {
  const left = now - new Date(item.deleted_at).getTime();
  const days = Math.ceil((7 * DAY - left) / DAY);
  return days > 0 ? `${days} hari lagi` : "segera";
}

export default function Trash() {
  const items = useTrash();
  const [restoring, setRestoring] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  const restore = (index: number) => {
    setRestoring(index);
    restoreFromTrash(index);
    setRestoring(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sampah</h1>
        {items.length ? (
          <button
            onClick={() => {
              if (confirm("Kosongkan sampah? Semua item akan terhapus permanen.")) {
                emptyTrash();
              }
            }}
            className="rounded border border-rose-300 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
          >
            Kosongkan Sampah
          </button>
        ) : null}
      </div>

      <Card>
        <SectionTitle>Riwayat Terhapus</SectionTitle>
        <p className="mb-3 text-xs text-zinc-500">
          Item tersimpan 7 hari. Lebih dari itu otomatis terhapus permanen.
        </p>
        {!items.length ? (
          <p className="text-sm text-zinc-500">Sampah kosong.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                    {item.kind === "trade" ? "Trade" : "Cash Flow"}
                  </span>
                  <span className="font-medium text-zinc-900">
                    {item.kind === "trade"
                      ? (item.data as { asset: string }).asset
                      : `${(item.data as { type: string }).type === "DEPOSIT" ? "Deposit" : "Withdraw"} ${idr((item.data as { amount: number }).amount)}`}
                  </span>
                  <div className="text-xs text-zinc-500">
                    Dihapus: {dateTime(item.deleted_at)} · Terhapus otomatis {remainingDays(item, now)}
                  </div>
                </div>
                <button
                  onClick={() => restore(i)}
                  disabled={restoring === i}
                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Kembalikan
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}