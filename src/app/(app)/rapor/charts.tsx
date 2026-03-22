"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendPoint {
  label: string;
  gelir: number;
  gider: number;
}

export interface AvPoint {
  label: string;
  alacak: number;
  verecek: number;
}

const AREA_H = 300;

export function GelirGiderArea({ data }: { data: TrendPoint[] }) {
  return (
    <div style={{ width: "100%", height: AREA_H, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={AREA_H}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gGelir" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--sd-gelir)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--sd-gelir)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gGider" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--sd-gider)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--sd-gider)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#64748b" />
          <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="gelir"
            stroke="var(--sd-gelir)"
            fill="url(#gGelir)"
            name="Gelir"
          />
          <Area
            type="monotone"
            dataKey="gider"
            stroke="var(--sd-gider)"
            fill="url(#gGider)"
            name="Gider"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const BAR_H = 300;

export function AlacakVerecekBar({ data }: { data: AvPoint[] }) {
  return (
    <div style={{ width: "100%", height: BAR_H, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={BAR_H}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#64748b" />
          <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
          <Tooltip />
          <Bar dataKey="alacak" fill="var(--sd-alacak)" name="Alacak" radius={[6, 6, 0, 0]} />
          <Bar dataKey="verecek" fill="var(--sd-verecek)" name="Borç" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
