export const DASH = "—";

const idrFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function isNull(v: number | string | null | undefined): boolean {
  return v === null || v === undefined || v === "";
}

export function idr(v: number | null | undefined): string {
  return isNull(v) ? DASH : idrFmt.format(v as number);
}

export function num(v: number | null | undefined): string {
  return isNull(v) ? DASH : numFmt.format(v as number);
}

export function pct(v: number | null | undefined): string {
  if (isNull(v)) return DASH;
  const n = v as number;
  return (n > 0 ? "+" : "") + numFmt.format(n) + "%";
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return DASH;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return DASH;
  return (
    d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

export function holdingMs(
  entry: string,
  exit: string | null,
  now: number = Date.now()
): number {
  const e = new Date(entry).getTime();
  if (isNaN(e)) return 0;
  const x = exit ? new Date(exit).getTime() : now;
  return Math.max(0, x - e);
}

export function holdingHuman(ms: number): string {
  if (ms <= 0) return "0 mnt";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${mins} mnt`;
  return `${mins} mnt`;
}