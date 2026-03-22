"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendMonthRow {
  label: string;
  gelir: number;
  gider: number;
  net: number;
}

interface TrendChartProps {
  data: TrendMonthRow[];
}

const TREND_H = 300;

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div style={{ width: "100%", height: TREND_H, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={TREND_H}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tGelir" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--sd-gelir)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--sd-gelir)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="tGider" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--sd-gider)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--sd-gider)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#64748b" />
          <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as TrendMonthRow;
              return (
                <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold shadow-lg">
                  <p className="mb-1 text-black/55">{label}</p>
                  <p className="text-[var(--sd-gelir)]">Gelir: {formatTry(row.gelir)}</p>
                  <p className="text-[var(--sd-gider)]">Gider: {formatTry(row.gider)}</p>
                  <p className="mt-1 border-t border-black/10 pt-1 text-[var(--sd-text)]">
                    Net: {formatTry(row.net)}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="gelir"
            stroke="var(--sd-gelir)"
            fill="url(#tGelir)"
            name="Gelir"
          />
          <Area
            type="monotone"
            dataKey="gider"
            stroke="var(--sd-gider)"
            fill="url(#tGider)"
            name="Gider"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatTry(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
