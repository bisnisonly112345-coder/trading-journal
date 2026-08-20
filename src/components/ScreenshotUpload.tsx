"use client";

import { useRef } from "react";

// Compresses the picked image to a small JPEG dataURL before storing.
// ponytail: localStorage quota ~5MB; canvas downscale keeps each shot ~50-150KB.
// Swap for Supabase Storage upload (user_id/trade_id/entry.jpg) when wired.

const MAX_DIM = 1000;
const QUALITY = 0.72;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function compress(dataUrl: string): Promise<string> {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = dataUrl;
  });
  let { width, height } = img;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", QUALITY);
}

export default function ScreenshotUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 py-6 text-sm text-zinc-600 hover:border-zinc-400"
      >
        {value ? "Ganti screenshot" : "Upload Screenshot"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            onChange(await compress(await readAsDataURL(f)));
          } catch {
            onChange(null);
          }
        }}
      />
      {value ? (
        <div className="relative mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Screenshot"
            className="max-h-64 w-full rounded-lg border border-zinc-200 object-contain"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded bg-zinc-900/70 px-2 py-1 text-xs text-white"
          >
            Hapus
          </button>
        </div>
      ) : null}
    </div>
  );
}