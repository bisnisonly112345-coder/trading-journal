"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  if (!mounted) {
    return (
      <div className="py-10 text-center text-sm text-zinc-500">Memuat…</div>
    );
  }
  return <>{children}</>;
}