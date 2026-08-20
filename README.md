# Personal Trading Journal

Website pribadi gratis untuk mencatat trading, cash flow, profit/loss, drawdown,
holding time, dan screenshot entry/exit. Dibangun sesuai blueprint
(`Blueprint_Personal_Trading_Journal_Rinci.pdf` + `trading_journal_agent_workflow.json`).

## Jalankan (lokal)

```bash
npm install
npm run dev
# buka http://localhost:3000
```

Data disimpan di **localStorage** browser (single user, tanpa login). Seed data
dummy muncul otomatis saat pertama kali dibuka. Hapus data: DevTools →
Application → Local Storage → hapus key `tj_trades` / `tj_cashflows`.

## Fitur

- **Dashboard** — Dana Masuk, Dana Keluar, Equity, Net P/L, ROI, Max Drawdown, Equity Curve, Statistik.
- **Trade Journal** — Tambah Trade (OPEN), list Open/Closed, Close Trade, Detail ("satu trade satu cerita").
- **Screenshot** — upload entry/exit (dikompres lokal, batas localStorage).
- **Cash Flow** — Deposit/Withdraw + riwayat.
- **Statistik** — Total Trade, Win/Loss, Win Rate, Best/Worst, Avg & live Holding Time.
- **Equity Curve & Drawdown** — dari urutan deposit/withdraw + P/L trade closed.

## Prinsip inti (diterapkan di `src/lib/`)

1. **NULL ≠ 0** — field kosong disimpan `null`, bukan 0.
2. **P/L manual** — website tidak menghitung/mengganti angka P/L.
3. **Data kosong tampil "—"**, bukan 0 atau error.
4. **Trade tanpa P/L tidak mengubah equity curve.**
5. RLS (per-user) berlaku setelah terhubung ke Supabase.

## Self-check logika statistik

```bash
npx tsx stats.check.ts
# → ALL STATS CHECKS PASSED
```

## Migrasi ke Supabase + Vercel (nantinya)

`src/lib/db.ts` sudah diisolasi sebagai satu-satunya titik akses data. Saat akun
Supabase & git siap:

1. Buat project Supabase (free tier), jalankan SQL skema di bawah.
2. `npm i @supabase/supabase-js`; ganti isi `getTrades`/`getCashFlows`/`addTrade`/
   `closeTrade`/`deleteTrade`/`addCashFlow`/`deleteCashFlow` di `src/lib/db.ts`
   dengan panggilan `supabase.from(...)` (RLS aktif, kolom `user_id` = `auth.uid()`).
3. Screenshot: ganti penyimpanan base64 di `ScreenshotUpload.tsx` ke Supabase
   Storage bucket `trading-screenshots`, path `user_id/trade_id/{entry,exit}.jpg`.
4. Auth: tambah halaman login (`supabase.auth.signInWithPassword`) dan guard
   halaman dengan sesi.
5. Push ke GitHub (instal git), import ke Vercel, set env `NEXT_PUBLIC_SUPABASE_URL`
   dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### SQL skema Supabase

```sql
create type trade_status as enum ('OPEN','CLOSED');
create type cash_flow_type as enum ('DEPOSIT','WITHDRAW');

create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  asset text not null,
  market text,
  position text,
  entry_date timestamptz not null,
  entry_price numeric,
  capital numeric,
  quantity numeric,
  leverage numeric,
  entry_screenshot text,
  exit_date timestamptz,
  exit_price numeric,
  pnl numeric,
  pnl_percent numeric,
  exit_screenshot text,
  entry_note text,
  exit_note text,
  setup text,
  status trade_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cash_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  type cash_flow_type not null,
  amount numeric not null,
  date timestamptz not null,
  note text,
  created_at timestamptz not null default now()
);

alter table trades enable row level security;
alter table cash_flows enable row level security;

create policy "own trades" on trades for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cash flows" on cash_flows for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('trading-screenshots', 'trading-screenshots', false);
```
