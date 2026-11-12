"use client";

import { Factory, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { BatchFormDialog } from "@/components/processing/batch-form";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { combinedYield, productLabel } from "@/data/selectors";
import { useStore } from "@/data/store";
import type { Batch } from "@/data/types";
import { dayKey, fmtDate, fmtTime, kg, kgNum, todayKey } from "@/lib/format";

function YieldBadge({ value }: { value: number }) {
  return (
    <Badge variant={value >= 72 ? "default" : value >= 70 ? "secondary" : "outline"} className="tabular-nums">
      {value.toFixed(2)}%
    </Badge>
  );
}

export default function ProcessingPage() {
  const batches = useStore((s) => s.batches);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Batch | null>(null);

  const stats = useMemo(() => {
    const today = batches.filter((b) => dayKey(b.date) === todayKey());
    const yields = batches.map((b) => b.yieldPct);
    return {
      today: combinedYield(today),
      todayKg: today.reduce((s, b) => s + b.liveKg, 0),
      average: combinedYield(batches),
      best: yields.length ? Math.max(...yields) : null,
      lowest: yields.length ? Math.min(...yields) : null,
    };
  }, [batches]);

  const nameOf = (id: string) => {
    const p = products.find((x) => x.id === id);
    return p ? productLabel(p, categories) : "Removed product";
  };
  const fmtPct = (v: number | null) => (v === null ? "-" : `${v.toFixed(2)}%`);

  return (
    <>
      <PageHeader title="Processing" description="Every batch records actual input and weighed output. Yield is never a fixed number.">
        <Button size="lg" onClick={() => setFormOpen(true)}>
          <Plus /> New batch
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today's yield"
          value={stats.today === null ? "No batch" : fmtPct(stats.today)}
          hint={stats.today === null ? "Nothing processed yet today" : `${kg(stats.todayKg)} live input`}
          icon={Factory}
        />
        <StatCard label="Average yield" value={fmtPct(stats.average)} hint={`Across ${batches.length} batches`} />
        <StatCard label="Best batch" value={fmtPct(stats.best)} tone="good" />
        <StatCard label="Lowest batch" value={fmtPct(stats.lowest)} tone="warn" />
      </div>

      <Panel className="mt-4" title="Batches" description="Tap a batch to see its output per product" bodyClassName="p-0">
        {batches.length === 0 ? (
          <EmptyState icon={Factory} title="No batches yet" description="Create a batch to turn live birds into cut stock.">
            <Button onClick={() => setFormOpen(true)}>New batch</Button>
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Bird type</TableHead>
                <TableHead className="text-right">Birds</TableHead>
                <TableHead className="text-right">Input (kg)</TableHead>
                <TableHead className="text-right">Output (kg)</TableHead>
                <TableHead className="text-right">Waste (kg)</TableHead>
                <TableHead className="text-right">Loss (kg)</TableHead>
                <TableHead className="text-right">Yield</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow
                  key={b.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => setDetail(b)}
                  onKeyDown={(e) => e.key === "Enter" && setDetail(b)}
                >
                  <TableCell>
                    {fmtDate(b.date)} <span className="text-muted-foreground">{fmtTime(b.date)}</span>
                  </TableCell>
                  <TableCell className="font-medium">{b.batchNo}</TableCell>
                  <TableCell>{products.find((p) => p.id === b.liveProductId)?.name ?? "-"}</TableCell>
                  <TableCell className="tabular text-right">{b.birds}</TableCell>
                  <TableCell className="tabular text-right">{kgNum(b.liveKg)}</TableCell>
                  <TableCell className="tabular text-right">{kgNum(b.outputKg)}</TableCell>
                  <TableCell className="tabular text-right">{kgNum(b.wasteKg)}</TableCell>
                  <TableCell className="tabular text-right">{kgNum(b.lossKg)}</TableCell>
                  <TableCell className="text-right">
                    <YieldBadge value={b.yieldPct} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <BatchFormDialog open={formOpen} onClose={() => setFormOpen(false)} />

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">Batch {detail.batchNo}</DialogTitle>
                <DialogDescription>
                  {fmtDate(detail.date)} {fmtTime(detail.date)} · by {detail.createdBy}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Input</p>
                  <p className="tabular font-semibold">{kg(detail.liveKg)}</p>
                  <p className="text-xs text-muted-foreground">
                    {detail.birds} × {products.find((p) => p.id === detail.liveProductId)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Output</p>
                  <p className="tabular font-semibold">{kg(detail.outputKg)}</p>
                  <p className="text-xs text-muted-foreground">
                    Waste {kgNum(detail.wasteKg)} · Loss {kgNum(detail.lossKg)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Yield</p>
                  <p className="text-2xl font-semibold tabular-nums">{detail.yieldPct.toFixed(2)}%</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Kg</TableHead>
                    <TableHead className="text-right">% of input</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.outputs.map((o) => (
                    <TableRow key={o.productId}>
                      <TableCell>{nameOf(o.productId)}</TableCell>
                      <TableCell className="tabular text-right">{kgNum(o.kg)}</TableCell>
                      <TableCell className="tabular text-right">{((o.kg / detail.liveKg) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="text-muted-foreground">Waste</TableCell>
                    <TableCell className="tabular text-right">{kgNum(detail.wasteKg)}</TableCell>
                    <TableCell className="tabular text-right">{((detail.wasteKg / detail.liveKg) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Loss</TableCell>
                    <TableCell className="tabular text-right">{kgNum(detail.lossKg)}</TableCell>
                    <TableCell className="tabular text-right">{((detail.lossKg / detail.liveKg) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {detail.notes && <p className="text-sm text-muted-foreground">Notes: {detail.notes}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
