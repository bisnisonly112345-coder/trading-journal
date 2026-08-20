"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/journal", label: "Trade Journal" },
  { href: "/cashflow", label: "Cash Flow" },
  { href: "/trash", label: "Sampah" },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-bold tracking-wide text-zinc-900">
          TRADING JOURNAL
        </Link>
        <nav className="flex items-center gap-4">
          {links.map((l) => {
            const active =
              l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "text-sm font-semibold text-zinc-900"
                    : "text-sm text-zinc-600 hover:text-zinc-800"
                }
              >
                {l.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset semua data (hapus localStorage) dan muat ulang seed?")) {
                localStorage.removeItem("tj_trades");
                localStorage.removeItem("tj_cashflows");
                localStorage.removeItem("tj_trash");
                location.reload();
              }
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
          >
            Reset Data
          </button>
        </nav>
      </div>
    </header>
  );
}