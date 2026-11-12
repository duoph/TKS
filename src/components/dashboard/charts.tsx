"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { inrCompact, inrWhole } from "@/lib/format";

const axisTick = { fill: "var(--chart-axis)", fontSize: 12 };

function TooltipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="mb-1 font-medium">{title}</p>
      {rows.map(([label, value]) => (
        <p key={label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular font-medium">{value}</span>
        </p>
      ))}
    </div>
  );
}

export interface DaySalesPoint {
  label: string;
  date: string;
  total: number;
  bills: number;
}

/** Sales per day, one colour: the title says what is plotted. */
export function SalesBarChart({ data }: { data: DaySalesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={inrCompact} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as DaySalesPoint | undefined;
            if (!active || !point) return null;
            return (
              <TooltipBox
                title={point.date}
                rows={[
                  ["Sales", inrWhole(point.total)],
                  ["Bills", String(point.bills)],
                ]}
              />
            );
          }}
        />
        <Bar dataKey="total" fill="var(--chart-1)" maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface YieldPoint {
  label: string;
  date: string;
  yieldPct: number | null;
  liveKg: number;
}

/** Yield % per day. The axis is zoomed to the working range so daily changes are visible. */
export function YieldLineChart({ data }: { data: YieldPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: "var(--chart-grid)" }}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          domain={[66, 76]}
          ticks={[66, 68, 70, 72, 74, 76]}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as YieldPoint | undefined;
            if (!active || !point || point.yieldPct === null) return null;
            return (
              <TooltipBox
                title={point.date}
                rows={[
                  ["Yield", `${point.yieldPct.toFixed(2)}%`],
                  ["Live input", `${point.liveKg.toFixed(1)} kg`],
                ]}
              />
            );
          }}
        />
        <Line
          type="linear"
          dataKey="yieldPct"
          stroke="var(--chart-2)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          connectNulls
          dot={{ r: 4, fill: "var(--chart-2)", stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "var(--chart-2)", stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface CategorySalesRow {
  code: string;
  name: string;
  total: number;
  kg: number;
}

/** Sales by category as labelled horizontal bars, value at the tip. */
export function CategoryBars({ rows }: { rows: CategorySalesRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.code}
          className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm"
          title={`${row.code} - ${row.name}: ${inrWhole(row.total)} (${row.kg.toFixed(1)} kg)`}
        >
          <span className="font-medium">{row.code}</span>
          <div className="h-4">
            <div
              className="h-full min-w-0.5 rounded-r-sm bg-chart-1"
              style={{ width: `${(row.total / max) * 100}%` }}
            />
          </div>
          <span className="tabular text-right text-muted-foreground">{inrWhole(row.total)}</span>
        </div>
      ))}
    </div>
  );
}
