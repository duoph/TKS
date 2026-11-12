"use client";

import { Download, FileSearch } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, FilterPills, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  combinedYield,
  customerOutstandingMap,
  inRange,
  isLowStock,
  itemLabel,
  paidBy,
  supplierOutstandingMap,
} from "@/data/selectors";
import { useStore } from "@/data/store";
import { downloadCsv } from "@/lib/csv";
import { dateFromKey, dayKey, fmtDate, inr, inrWhole, kgNum, lastNDayKeys, round2, round3, todayKey } from "@/lib/format";
import { cn } from "@/lib/utils";

type ReportId = "daily" | "products" | "yield" | "stock" | "outstanding";
type Cell = string | number;
type Format = "text" | "money" | "kg" | "int" | "pct";

interface Report {
  columns: { label: string; format: Format }[];
  rows: Cell[][];
  totals?: Cell[];
  summary: { label: string; value: string }[];
}

const REPORTS: { id: ReportId; label: string; usesDates: boolean }[] = [
  { id: "daily", label: "Daily sales", usesDates: true },
  { id: "products", label: "Product-wise sales", usesDates: true },
  { id: "yield", label: "Yield report", usesDates: true },
  { id: "stock", label: "Stock report", usesDates: false },
  { id: "outstanding", label: "Outstanding report", usesDates: false },
];

function show(value: Cell, format: Format): string {
  if (typeof value === "string") return value;
  if (format === "money") return inr(value);
  if (format === "kg") return kgNum(value);
  if (format === "pct") return `${value.toFixed(2)}%`;
  return String(value);
}

function csvValue(value: Cell, format: Format): Cell {
  if (typeof value === "string") return value;
  if (format === "money" || format === "pct") return value.toFixed(2);
  if (format === "kg") return value.toFixed(3);
  return value;
}

export default function ReportsPage() {
  const data = useStore();
  const [reportId, setReportId] = useState<ReportId>("daily");
  const [from, setFrom] = useState(() => lastNDayKeys(7)[0]);
  const [to, setTo] = useState(todayKey);
  const meta = REPORTS.find((r) => r.id === reportId)!;
  const rangeValid = from <= to;

  const report = useMemo<Report>(() => {
    const { sales, batches, products, categories, customers, suppliers, customerPayments, supplierPayments, purchases } = data;
    const salesInRange = sales.filter((s) => inRange(s.date, from, to));

    if (reportId === "daily") {
      const byDay = new Map<string, typeof sales>();
      for (const s of salesInRange) {
        const key = dayKey(s.date);
        byDay.set(key, [...(byDay.get(key) ?? []), s]);
      }
      const rows = [...byDay.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, list]): Cell[] => [
          fmtDate(dateFromKey(key)),
          list.length,
          round3(list.reduce((s, x) => s + x.items.reduce((k, i) => k + i.weightKg, 0), 0)),
          list.reduce((s, x) => s + paidBy(x, "cash"), 0),
          list.reduce((s, x) => s + paidBy(x, "upi"), 0),
          list.reduce((s, x) => s + paidBy(x, "card"), 0),
          list.reduce((s, x) => s + paidBy(x, "credit"), 0),
          list.reduce((s, x) => s + x.discount, 0),
          list.reduce((s, x) => s + x.total, 0),
        ]);
      const sum = (i: number) => rows.reduce((s, r) => s + (r[i] as number), 0);
      const total = sum(8);
      return {
        columns: [
          { label: "Date", format: "text" },
          { label: "Bills", format: "int" },
          { label: "Kg sold", format: "kg" },
          { label: "Cash", format: "money" },
          { label: "UPI", format: "money" },
          { label: "Card", format: "money" },
          { label: "Credit", format: "money" },
          { label: "Discount", format: "money" },
          { label: "Total", format: "money" },
        ],
        rows,
        totals: ["Total", sum(1), round3(sum(2)), sum(3), sum(4), sum(5), sum(6), sum(7), total],
        summary: [
          { label: "Total sales", value: inrWhole(total) },
          { label: "Bills", value: String(sum(1)) },
          { label: "Average per day", value: inrWhole(rows.length ? total / rows.length : 0) },
          { label: "Sold on credit", value: inrWhole(sum(6)) },
        ],
      };
    }

    if (reportId === "products") {
      const byProduct = new Map<string, { label: string; code: string; kg: number; amount: number }>();
      for (const s of salesInRange) {
        for (const item of s.items) {
          const row = byProduct.get(item.productId) ?? { label: itemLabel(item), code: item.categoryCode, kg: 0, amount: 0 };
          row.kg += item.weightKg;
          row.amount += item.amount;
          byProduct.set(item.productId, row);
        }
      }
      const list = [...byProduct.values()].sort((a, b) => b.amount - a.amount);
      const total = list.reduce((s, r) => s + r.amount, 0);
      const totalKg = list.reduce((s, r) => s + r.kg, 0);
      return {
        columns: [
          { label: "Product", format: "text" },
          { label: "Category", format: "text" },
          { label: "Kg sold", format: "kg" },
          { label: "Average rate", format: "money" },
          { label: "Amount", format: "money" },
          { label: "Share of sales", format: "pct" },
        ],
        rows: list.map((r) => [r.label, r.code, round3(r.kg), r.kg ? r.amount / r.kg : 0, round2(r.amount), total ? (r.amount / total) * 100 : 0]),
        totals: ["Total", "", round3(totalKg), totalKg ? total / totalKg : 0, round2(total), 100],
        summary: [
          { label: "Sales value", value: inrWhole(total) },
          { label: "Kg sold", value: `${kgNum(totalKg)} kg` },
          { label: "Products sold", value: String(list.length) },
          { label: "Top product", value: list[0]?.label ?? "-" },
        ],
      };
    }

    if (reportId === "yield") {
      const list = batches.filter((b) => inRange(b.date, from, to));
      const sum = (pick: (b: (typeof list)[number]) => number) => round3(list.reduce((s, b) => s + pick(b), 0));
      const yields = list.map((b) => b.yieldPct);
      const overall = combinedYield(list);
      return {
        columns: [
          { label: "Date", format: "text" },
          { label: "Batch", format: "text" },
          { label: "Bird type", format: "text" },
          { label: "Birds", format: "int" },
          { label: "Input kg", format: "kg" },
          { label: "Output kg", format: "kg" },
          { label: "Waste kg", format: "kg" },
          { label: "Loss kg", format: "kg" },
          { label: "Yield %", format: "pct" },
        ],
        rows: list.map((b) => [
          fmtDate(b.date),
          b.batchNo,
          products.find((p) => p.id === b.liveProductId)?.name ?? "-",
          b.birds,
          b.liveKg,
          b.outputKg,
          b.wasteKg,
          b.lossKg,
          b.yieldPct,
        ]),
        totals: ["Total", "", "", sum((b) => b.birds), sum((b) => b.liveKg), sum((b) => b.outputKg), sum((b) => b.wasteKg), sum((b) => b.lossKg), overall ?? 0],
        summary: [
          { label: "Overall yield", value: overall === null ? "-" : `${overall.toFixed(2)}%` },
          { label: "Best batch", value: yields.length ? `${Math.max(...yields).toFixed(2)}%` : "-" },
          { label: "Lowest batch", value: yields.length ? `${Math.min(...yields).toFixed(2)}%` : "-" },
          { label: "Live input", value: `${kgNum(sum((b) => b.liveKg))} kg` },
        ],
      };
    }

    if (reportId === "stock") {
      const list = products.filter((p) => p.active);
      const value = list.reduce((s, p) => s + p.stockKg * p.wholesalePrice, 0);
      return {
        columns: [
          { label: "Product", format: "text" },
          { label: "Code", format: "text" },
          { label: "Stock kg", format: "kg" },
          { label: "Birds", format: "text" },
          { label: "Low level kg", format: "kg" },
          { label: "Status", format: "text" },
          { label: "Value at wholesale", format: "money" },
        ],
        rows: list.map((p) => [
          `${categories.find((c) => c.id === p.categoryId)?.code ?? ""} - ${p.name}`,
          p.code,
          p.stockKg,
          p.stockBirds === undefined ? "" : String(p.stockBirds),
          p.lowStockKg,
          p.stockKg <= 0 ? "Out of stock" : isLowStock(p) ? "Low stock" : "In stock",
          round2(p.stockKg * p.wholesalePrice),
        ]),
        totals: ["Total", "", round3(list.reduce((s, p) => s + p.stockKg, 0)), "", "", "", round2(value)],
        summary: [
          { label: "Stock value", value: inrWhole(value) },
          { label: "Products", value: String(list.length) },
          { label: "Low stock", value: String(list.filter(isLowStock).length) },
          { label: "As of", value: fmtDate(new Date()) },
        ],
      };
    }

    const receivable = customerOutstandingMap(customers, sales, customerPayments);
    const payable = supplierOutstandingMap(suppliers, purchases, supplierPayments);
    const rows: Cell[][] = [
      ...customers
        .filter((c) => receivable[c.id] > 0)
        .sort((a, b) => receivable[b.id] - receivable[a.id])
        .map((c): Cell[] => ["Customer (to receive)", c.name, c.phone, c.place, c.creditLimit, receivable[c.id]]),
      ...suppliers
        .filter((s) => payable[s.id] > 0)
        .sort((a, b) => payable[b.id] - payable[a.id])
        .map((s): Cell[] => ["Supplier (to pay)", s.name, s.phone, s.place, "", payable[s.id]]),
    ];
    const toReceive = Object.values(receivable).reduce((s, v) => s + Math.max(0, v), 0);
    const toPay = Object.values(payable).reduce((s, v) => s + Math.max(0, v), 0);
    return {
      columns: [
        { label: "Type", format: "text" },
        { label: "Name", format: "text" },
        { label: "Phone", format: "text" },
        { label: "Place", format: "text" },
        { label: "Credit limit", format: "money" },
        { label: "Outstanding", format: "money" },
      ],
      rows,
      summary: [
        { label: "To receive from customers", value: inrWhole(toReceive) },
        { label: "To pay suppliers", value: inrWhole(toPay) },
        { label: "Net position", value: inrWhole(toReceive - toPay) },
        { label: "As of", value: fmtDate(new Date()) },
      ],
    };
  }, [data, reportId, from, to]);

  const setPreset = (days: number) => {
    setFrom(lastNDayKeys(days)[0]);
    setTo(todayKey());
  };

  const exportCsv = () => {
    const rows = [...report.rows, ...(report.totals ? [report.totals] : [])].map((row) =>
      row.map((value, i) => csvValue(value, report.columns[i].format)),
    );
    const suffix = meta.usesDates ? `${from}_to_${to}` : todayKey();
    downloadCsv(`${reportId}-report-${suffix}`, report.columns.map((c) => c.label), rows);
    toast.success(`${meta.label} downloaded as CSV`);
  };

  const rightAligned = (format: Format) => format !== "text";

  return (
    <>
      <PageHeader title="Reports" description="Pick a report, set the dates, and export it to CSV for Excel.">
        <Button size="lg" onClick={exportCsv} disabled={report.rows.length === 0 || !rangeValid}>
          <Download /> Export CSV
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterPills label="Report" value={reportId} onChange={setReportId} options={REPORTS} />
        {meta.usesDates ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex gap-1.5">
              <Button variant="outline" onClick={() => setPreset(1)}>
                Today
              </Button>
              <Button variant="outline" onClick={() => setPreset(7)}>
                7 days
              </Button>
              <Button variant="outline" onClick={() => setPreset(30)}>
                30 days
              </Button>
            </div>
            <label className="grid gap-1 text-xs text-muted-foreground">
              From
              <Input type="date" className="w-40 text-foreground" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              To
              <Input type="date" className="w-40 text-foreground" value={to} max={todayKey()} onChange={(e) => e.target.value && setTo(e.target.value)} />
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This report shows the position right now. No date filter.</p>
        )}
      </div>

      {!rangeValid && (
        <p className="mt-3 text-sm font-medium text-destructive" role="alert">
          The From date is after the To date. Change the dates to see the report.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {report.summary.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Panel
        className="mt-4"
        title={meta.label}
        description={
          meta.usesDates
            ? `${fmtDate(dateFromKey(from))} to ${fmtDate(dateFromKey(to))} · ${report.rows.length} rows`
            : `As of ${fmtDate(new Date())} · ${report.rows.length} rows`
        }
        bodyClassName="p-0"
      >
        {report.rows.length === 0 || !rangeValid ? (
          <EmptyState icon={FileSearch} title="Nothing to show" description="There is no data for this report in the selected dates.">
            {meta.usesDates && (
              <Button variant="outline" onClick={() => setPreset(30)}>
                Show last 30 days
              </Button>
            )}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {report.columns.map((c) => (
                  <TableHead key={c.label} className={cn(rightAligned(c.format) && "text-right")}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row, r) => (
                <TableRow key={r}>
                  {row.map((value, i) => (
                    <TableCell
                      key={i}
                      className={cn(rightAligned(report.columns[i].format) && "tabular text-right", i === 0 && "font-medium")}
                    >
                      {show(value, report.columns[i].format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            {report.totals && (
              <TableFooter>
                <TableRow>
                  {report.totals.map((value, i) => (
                    <TableCell key={i} className={cn("font-semibold", rightAligned(report.columns[i].format) && "tabular text-right")}>
                      {show(value, report.columns[i].format)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </Panel>
    </>
  );
}
