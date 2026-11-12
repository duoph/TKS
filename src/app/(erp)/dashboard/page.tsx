"use client";

import {
  AlertTriangle,
  Bird,
  Factory,
  IndianRupee,
  Package,
  PackageCheck,
  Receipt as ReceiptIcon,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryBars, SalesBarChart, YieldLineChart } from "@/components/dashboard/charts";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { ReceiptDialog } from "@/components/shared/receipt";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  cashInHand,
  combinedYield,
  customerOutstandingMap,
  isLowStock,
  productLabel,
  salesOnDay,
} from "@/data/selectors";
import { useStore } from "@/data/store";
import type { Sale } from "@/data/types";
import { dayKey, fmtDate, fmtDayShort, fmtTime, inr, inrWhole, kg, lastNDayKeys, dateFromKey, todayKey } from "@/lib/format";

export default function DashboardPage() {
  const data = useStore();
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const { sales, batches, products, categories, customers, customerPayments } = data;

  const stats = useMemo(() => {
    const today = todayKey();
    const todaySales = salesOnDay(sales, today);
    const liveIds = new Set(categories.filter((c) => c.isLive).map((c) => c.id));
    const live = products.filter((p) => liveIds.has(p.categoryId));
    const cut = products.filter((p) => !liveIds.has(p.categoryId));
    const todayBatches = batches.filter((b) => dayKey(b.date) === today);
    const outstanding = customerOutstandingMap(customers, sales, customerPayments);
    return {
      todayTotal: todaySales.reduce((s, x) => s + x.total, 0),
      bills: todaySales.length,
      liveBirds: live.reduce((s, p) => s + (p.stockBirds ?? 0), 0),
      liveKg: live.reduce((s, p) => s + p.stockKg, 0),
      cutKg: cut.reduce((s, p) => s + p.stockKg, 0),
      todayYield: combinedYield(todayBatches),
      todayBatchCount: todayBatches.length,
      outstanding: Object.values(outstanding).reduce((s, v) => s + Math.max(0, v), 0),
      owing: Object.values(outstanding).filter((v) => v > 0).length,
    };
  }, [sales, batches, products, categories, customers, customerPayments]);

  const cash = useMemo(() => cashInHand(data, todayKey()), [data]);

  const salesTrend = useMemo(
    () =>
      lastNDayKeys(7).map((key) => {
        const list = salesOnDay(sales, key);
        return {
          label: fmtDayShort(dateFromKey(key)),
          date: fmtDate(dateFromKey(key)),
          total: list.reduce((s, x) => s + x.total, 0),
          bills: list.length,
        };
      }),
    [sales],
  );

  const yieldTrend = useMemo(
    () =>
      lastNDayKeys(14).map((key) => {
        const list = batches.filter((b) => dayKey(b.date) === key);
        return {
          label: fmtDayShort(dateFromKey(key)),
          date: fmtDate(dateFromKey(key)),
          yieldPct: combinedYield(list),
          liveKg: list.reduce((s, b) => s + b.liveKg, 0),
        };
      }),
    [batches],
  );

  const categorySales = useMemo(() => {
    const from = lastNDayKeys(7)[0];
    const byCode = new Map(categories.map((c) => [c.code, { code: c.code, name: c.name, total: 0, kg: 0 }]));
    for (const sale of sales) {
      if (dayKey(sale.date) < from) continue;
      for (const item of sale.items) {
        const row = byCode.get(item.categoryCode);
        if (row) {
          row.total += item.amount;
          row.kg += item.weightKg;
        }
      }
    }
    return [...byCode.values()].sort((a, b) => b.total - a.total);
  }, [sales, categories]);

  const lowStock = useMemo(
    () => products.filter(isLowStock).sort((a, b) => a.stockKg / a.lowStockKg - b.stockKg / b.lowStockKg),
    [products],
  );
  const recent = sales.slice(0, 8);

  return (
    <>
      <PageHeader title="Dashboard" description="Today's business at a glance. Numbers update with every bill and batch.">
        <Link href="/reports" className={buttonVariants({ variant: "outline", size: "lg" })}>
          View reports
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="col-span-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">Today&apos;s sales</p>
            <IndianRupee className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{inrWhole(stats.todayTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.bills} bills, average {inrWhole(stats.bills ? stats.todayTotal / stats.bills : 0)} per bill
          </p>
        </div>
        <StatCard label="Bills today" value={String(stats.bills)} icon={ReceiptText} hint="Retail and wholesale" />
        <StatCard
          label="Today's yield"
          value={stats.todayYield === null ? "No batch" : `${stats.todayYield.toFixed(2)}%`}
          icon={Factory}
          hint={
            stats.todayYield === null
              ? "No batch processed yet today"
              : `Actual, from ${stats.todayBatchCount} batch${stats.todayBatchCount === 1 ? "" : "es"}`
          }
        />
        <StatCard
          label="Live stock"
          value={`${stats.liveBirds.toLocaleString("en-IN")} birds`}
          icon={Bird}
          hint={kg(stats.liveKg)}
        />
        <StatCard label="Cut stock" value={kg(stats.cutKg)} icon={Package} hint="All dressed products" />
        <StatCard label="Cash in hand" value={inrWhole(cash)} icon={Wallet} hint="Opening float + today's cash" />
        <StatCard
          label="Customer outstanding"
          value={inrWhole(stats.outstanding)}
          icon={Users}
          hint={`${stats.owing} customers owe money`}
          tone={stats.outstanding > 0 ? "warn" : "default"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Sales, last 7 days" description="Total bill value per day">
          <SalesBarChart data={salesTrend} />
        </Panel>
        <Panel title="Yield %, last 14 days" description="Output kg / live input kg. It changes every day.">
          <YieldLineChart data={yieldTrend} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Sales by category" description="Last 7 days">
          <CategoryBars rows={categorySales} />
        </Panel>

        <Panel
          title="Low stock"
          description={`${lowStock.length} product${lowStock.length === 1 ? "" : "s"} at or below the low-stock level`}
          action={
            <Link href="/inventory" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Inventory
            </Link>
          }
          bodyClassName="p-0"
        >
          {lowStock.length === 0 ? (
            <EmptyState icon={PackageCheck} title="Stock is healthy" description="No product is below its low-stock level." />
          ) : (
            <ul className="divide-y">
              {lowStock.slice(0, 7).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
                    <span className="truncate font-medium">{productLabel(p, categories)}</span>
                  </span>
                  <span className="tabular shrink-0 text-right">
                    <span className="font-semibold text-destructive">{kg(p.stockKg)}</span>
                    <span className="block text-xs text-muted-foreground">low at {kg(p.lowStockKg)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent bills" description="Tap a bill to see the receipt" bodyClassName="p-0">
          {recent.length === 0 ? (
            <EmptyState icon={ReceiptIcon} title="No bills yet" description="Bills made in the POS appear here." />
          ) : (
            <ul className="divide-y">
              {recent.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setViewSale(s)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.customerName}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.billNo} · {dayKey(s.date) === todayKey() ? fmtTime(s.date) : fmtDate(s.date)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tabular block font-semibold">{inr(s.total)}</span>
                      <Badge variant="outline" className="uppercase">
                        {s.payments.length > 1 ? "split" : s.payments[0]?.method}
                      </Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ReceiptDialog sale={viewSale} onClose={() => setViewSale(null)} />
    </>
  );
}
