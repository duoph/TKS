"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { History, PackageSearch, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, NativeSelect } from "@/components/shared/field";
import { EmptyState, FilterPills, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { ProductImage } from "@/components/shared/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createAdjustment } from "@/data/api";
import { isLowStock, productLabel, stockMovements } from "@/data/selectors";
import { useStore } from "@/data/store";
import type { Product, StockMovement } from "@/data/types";
import { fmtDateTime, inrWhole, kg, kgNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { optionalAmount, positiveNumber, requiredText, toNumber } from "@/lib/validation";

type EntryType = "wastage" | "adjustment";

const MOVEMENT_LABELS: Record<StockMovement["type"], string> = {
  sale: "Sale",
  "processing-in": "To processing",
  "processing-out": "From processing",
  purchase: "Purchase",
  wastage: "Wastage",
  adjustment: "Adjustment",
};

const WASTAGE_REASONS = ["Unsold at day end", "Quality check reject", "Cold storage issue", "Damaged while packing", "Bird mortality"];
const ADJUST_REASONS = ["Physical stock count", "Weighing correction", "Entry mistake", "Sample / staff use"];

const entrySchema = z.object({
  productId: requiredText("Product"),
  direction: z.enum(["add", "reduce"]),
  qtyKg: positiveNumber("Quantity"),
  birds: optionalAmount("Birds"),
  reason: requiredText("Reason"),
  note: z.string(),
});
type EntryValues = z.infer<typeof entrySchema>;

function StockEntryForm({ type, productId, onDone }: { type: EntryType; productId?: string; onDone: () => void }) {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const form = useForm<EntryValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      productId: productId ?? "",
      direction: "reduce",
      qtyKg: "",
      birds: "",
      reason: (type === "wastage" ? WASTAGE_REASONS : ADJUST_REASONS)[0],
      note: "",
    },
  });
  const { register, control, formState } = form;
  const watched = useWatch({ control });
  const product = products.find((p) => p.id === watched.productId);
  const isLive = !!product && !!categories.find((c) => c.id === product.categoryId)?.isLive;
  const reduce = type === "wastage" || watched.direction === "reduce";
  const qty = toNumber(watched.qtyKg);
  const after = product ? product.stockKg + (reduce ? -qty : qty) : 0;

  const onSubmit = form.handleSubmit((data) => {
    try {
      const sign = type === "wastage" || data.direction === "reduce" ? -1 : 1;
      createAdjustment({
        productId: data.productId,
        type,
        qtyKg: sign * toNumber(data.qtyKg),
        birds: isLive ? sign * toNumber(data.birds) : undefined,
        reason: data.note ? `${data.reason}: ${data.note}` : data.reason,
      });
      toast.success(type === "wastage" ? "Wastage recorded" : "Stock adjusted", {
        description: product ? `${productLabel(product, categories)} is now ${kg(Math.max(0, after))}` : undefined,
      });
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <Field
        label="Product"
        htmlFor="e-product"
        error={formState.errors.productId?.message}
        hint={product ? `Current stock: ${kg(product.stockKg)}` : undefined}
      >
        <NativeSelect id="e-product" className="h-10" {...register("productId")}>
          <option value="">Choose a product</option>
          {categories.map((c) => (
            <optgroup key={c.id} label={`${c.code} - ${c.name}`}>
              {products
                .filter((p) => p.categoryId === c.id && p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {c.code} - {p.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {type === "adjustment" && (
          <Field label="Change" htmlFor="e-direction">
            <NativeSelect id="e-direction" className="h-10" {...register("direction")}>
              <option value="reduce">Reduce stock</option>
              <option value="add">Add stock</option>
            </NativeSelect>
          </Field>
        )}
        <Field label="Quantity (kg)" htmlFor="e-qty" error={formState.errors.qtyKg?.message}>
          <Input id="e-qty" inputMode="decimal" className="h-10" placeholder="0.000" {...register("qtyKg")} />
        </Field>
        {isLive && (
          <Field label="Birds (count)" htmlFor="e-birds" error={formState.errors.birds?.message}>
            <Input id="e-birds" inputMode="numeric" className="h-10" placeholder="0" {...register("birds")} />
          </Field>
        )}
      </div>
      <Field label="Reason" htmlFor="e-reason" error={formState.errors.reason?.message}>
        <NativeSelect id="e-reason" className="h-10" {...register("reason")}>
          {(type === "wastage" ? WASTAGE_REASONS : ADJUST_REASONS).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Note (optional)" htmlFor="e-note">
        <Input id="e-note" className="h-10" {...register("note")} />
      </Field>
      {product && qty > 0 && (
        <p className={cn("text-sm", after < 0 ? "font-medium text-destructive" : "text-muted-foreground")}>
          {after < 0 ? `Not enough stock. Only ${kg(product.stockKg)} available.` : `Stock after saving: ${kg(after)}`}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="h-10" disabled={after < 0}>
          {type === "wastage" ? "Record wastage" : "Save adjustment"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function HistoryDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const data = useStore();
  const movements = useMemo(() => (product ? stockMovements(product, data) : []), [product, data]);
  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{product && productLabel(product, data.categories)}</DialogTitle>
          <DialogDescription>
            Stock movement history · current stock {product && kg(product.stockKg)}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
          {movements.length === 0 ? (
            <EmptyState icon={History} title="No movements yet" description="Sales, batches and adjustments for this product appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead>
                  <TableHead className="text-right">Balance (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.slice(0, 150).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{fmtDateTime(m.date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{MOVEMENT_LABELS[m.type]}</Badge>
                    </TableCell>
                    <TableCell>{m.ref || "-"}</TableCell>
                    <TableCell className="max-w-52 truncate" title={m.note}>
                      {m.note}
                    </TableCell>
                    <TableCell className={cn("tabular text-right font-medium", m.qtyKg < 0 ? "text-destructive" : "text-success")}>
                      {m.qtyKg > 0 ? "+" : ""}
                      {kgNum(m.qtyKg)}
                    </TableCell>
                    <TableCell className="tabular text-right">{kgNum(m.balanceKg)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {movements.length > 150 && (
          <p className="text-xs text-muted-foreground">Showing the latest 150 of {movements.length} movements.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryPage() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [history, setHistory] = useState<Product | null>(null);
  const [entry, setEntry] = useState<{ type: EntryType; productId?: string } | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const active = products.filter((p) => p.active);
  const rows = active.filter((p) => {
    if (categoryId !== "all" && p.categoryId !== categoryId) return false;
    if (lowOnly && !isLowStock(p)) return false;
    const term = search.trim().toLowerCase();
    return !term || `${categoryById.get(p.categoryId)?.code} ${p.name} ${p.code}`.toLowerCase().includes(term);
  });

  const live = active.filter((p) => categoryById.get(p.categoryId)?.isLive);
  const cut = active.filter((p) => !categoryById.get(p.categoryId)?.isLive);
  const lowCount = active.filter(isLowStock).length;
  const stockValue = active.reduce((s, p) => s + p.stockKg * p.wholesalePrice, 0);

  return (
    <>
      <PageHeader title="Inventory" description="Live and cut stock. Updated by purchases, batches, sales and adjustments.">
        <Button variant="outline" size="lg" onClick={() => setEntry({ type: "wastage" })}>
          <Trash2 /> Wastage entry
        </Button>
        <Button size="lg" onClick={() => setEntry({ type: "adjustment" })}>
          <SlidersHorizontal /> Stock adjustment
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Live stock"
          value={`${live.reduce((s, p) => s + (p.stockBirds ?? 0), 0).toLocaleString("en-IN")} birds`}
          hint={kg(live.reduce((s, p) => s + p.stockKg, 0))}
        />
        <StatCard label="Cut stock" value={kg(cut.reduce((s, p) => s + p.stockKg, 0))} hint={`${cut.length} products`} />
        <StatCard label="Low stock items" value={String(lowCount)} tone={lowCount ? "warn" : "good"} hint="At or below low-stock level" />
        <StatCard label="Stock value" value={inrWhole(stockValue)} hint="At wholesale price" />
      </div>

      <Panel className="mt-4" bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <FilterPills
            label="Category"
            value={categoryId}
            onChange={setCategoryId}
            options={[{ id: "all", label: "All" }, ...categories.map((c) => ({ id: c.id, label: c.code }))]}
          />
          <div className="ml-auto flex items-center gap-2">
            <Button variant={lowOnly ? "default" : "outline"} aria-pressed={lowOnly} onClick={() => setLowOnly(!lowOnly)}>
              Low stock only
            </Button>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                aria-label="Search stock"
                placeholder="Search"
                className="w-40 pl-8 sm:w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No products match" description="Try another category or clear the filters.">
            <Button
              variant="outline"
              onClick={() => {
                setCategoryId("all");
                setSearch("");
                setLowOnly(false);
              }}
            >
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Stock (kg)</TableHead>
                <TableHead className="text-right">Low level (kg)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const low = isLowStock(p);
                const out = p.stockKg <= 0;
                return (
                  <TableRow key={p.id} className={cn(low && "bg-warning/10 hover:bg-warning/15")}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <ProductImage product={p} category={categoryById.get(p.categoryId)} className="h-9 w-[3.25rem] shrink-0 rounded-md" />
                        <div>
                          {productLabel(p, categories)}
                          {p.stockBirds !== undefined && (
                            <span className="block text-xs font-normal text-muted-foreground">{p.stockBirds} birds</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.code}</TableCell>
                    <TableCell className={cn("tabular text-right font-semibold", low && "text-destructive")}>
                      {kgNum(p.stockKg)}
                    </TableCell>
                    <TableCell className="tabular text-right text-muted-foreground">{kgNum(p.lowStockKg)}</TableCell>
                    <TableCell>
                      {out ? (
                        <Badge variant="destructive">Out of stock</Badge>
                      ) : low ? (
                        <Badge variant="destructive">Low stock</Badge>
                      ) : (
                        <Badge variant="secondary">In stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-right">{inrWhole(p.stockKg * p.wholesalePrice)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setHistory(p)}>
                          <History /> History
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEntry({ type: "wastage", productId: p.id })}>
                          Wastage
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEntry({ type: "adjustment", productId: p.id })}>
                          Adjust
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      <HistoryDialog product={history ? (products.find((p) => p.id === history.id) ?? null) : null} onClose={() => setHistory(null)} />

      <Dialog open={!!entry} onOpenChange={(open) => !open && setEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{entry?.type === "wastage" ? "Wastage entry" : "Stock adjustment"}</DialogTitle>
            <DialogDescription>
              {entry?.type === "wastage"
                ? "Record stock that was thrown away. It is removed from stock."
                : "Correct the stock after a physical count or an entry mistake."}
            </DialogDescription>
          </DialogHeader>
          {entry && <StockEntryForm key={`${entry.type}-${entry.productId}`} type={entry.type} productId={entry.productId} onDone={() => setEntry(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
