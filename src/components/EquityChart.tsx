"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/types";
import { DASH, idr, shortDate } from "@/lib/format";

export default function EquityChart({ points }: { points: EquityPoint[] }) {
  if (!points.length) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        Belum ada data — {DASH}
      </div>
    );
  }
  const data = points.map((p) => ({
    ...p,
    label: shortDate(p.date),
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            width={70}
            tickFormatter={(v: number) => idr(v)}
          />
          <Tooltip
            formatter={(v) => [idr(v as number), "Equity"]}
            labelFormatter={(l) => l as string}
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}