"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useEffect, useState } from "react";

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

interface CategoryChartProps {
  data: CategorySlice[];
}

const PIE_H = 320;

export function CategoryChart({ data }: CategoryChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div style={{ width: "100%", height: PIE_H, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={PIE_H}>
        <PieChart margin={wide ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 4, bottom: 4 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx={wide ? "38%" : "50%"}
            cy="50%"
            innerRadius={wide ? 48 : 44}
            outerRadius={wide ? 82 : 76}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="var(--sd-card)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatTry(Number(value ?? 0))}
            contentStyle={{ borderRadius: 12, fontWeight: 600 }}
          />
          <Legend
            layout={wide ? "vertical" : "horizontal"}
            verticalAlign={wide ? "middle" : "bottom"}
            align={wide ? "right" : "center"}
            formatter={(value, entry) => {
              const p = entry.payload as CategorySlice | undefined;
              const v = p?.value ?? 0;
              const pct = Math.round((v / total) * 100);
              return `${value ?? p?.name ?? ""} · %${pct} · ${formatTry(v)}`;
            }}
            wrapperStyle={{ fontSize: wide ? 11 : 10, paddingTop: wide ? 0 : 4 }}
          />
        </PieChart>
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
