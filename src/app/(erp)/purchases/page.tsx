"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bird, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, NativeSelect } from "@/components/shared/field";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createPurchase } from "@/data/api";
import { useStore } from "@/data/store";
import { fmtDate, inr, inrWhole, kg, kgNum, lastNDayKeys, dayKey, round2 } from "@/lib/format";
import { optionalAmount, positiveInt, positiveNumber, requiredText, toNumber } from "@/lib/validation";

const schema = z.object({
  supplierId: requiredText("Supplier"),
  productId: requiredText("Bird type"),
  birds: positiveInt("Bird count"),
  weightKg: positiveNumber("Total weight"),
  ratePerKg: positiveNumber("Rate"),
  transportCost: optionalAmount("Transport cost"),
  paidAmount: optionalAmount("Paid amount"),
  paymentMode: z.enum(["cash", "bank"]),
});
type FormValues = z.infer<typeof schema>;

function PurchaseForm({ onDone }: { onDone: () => void }) {
  const suppliers = useStore((s) => s.suppliers);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const liveIds = new Set(categories.filter((c) => c.isLive).map((c) => c.id));
  const liveProducts = products.filter((p) => p.active && liveIds.has(p.categoryId));

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId: "",
      productId: liveProducts[0]?.id ?? "",
      birds: "",
      weightKg: "",
      ratePerKg: "",
      transportCost: "",
      paidAmount: "",
      paymentMode: "bank",
    },
  });
  const { register, control, formState } = form;
  const errors = formState.errors;
  const v = useWatch({ control });
  const birds = toNumber(v.birds);
  const weight = toNumber(v.weightKg);
  const birdCost = round2(weight * toNumber(v.ratePerKg));
  const total = round2(birdCost + toNumber(v.transportCost));
  const paid = toNumber(v.paidAmount);

  const onSubmit = form.handleSubmit((data) => {
    if (toNumber(data.paidAmount) > total) {
      form.setError("paidAmount", { message: "Paid amount cannot be more than the total" });
      return;
    }
    const purchase = createPurchase({
      supplierId: data.supplierId,
      productId: data.productId,
      birds: toNumber(data.birds),
      weightKg: toNumber(data.weightKg),
      ratePerKg: toNumber(data.ratePerKg),
      transportCost: toNumber(data.transportCost),
      paidAmount: toNumber(data.paidAmount),
      paymentMode: data.paymentMode,
    });
    toast.success(`Purchase ${purchase.purchaseNo} saved`, {
      description: `${purchase.birds} birds, ${kg(purchase.weightKg)} added to live stock.`,
    });
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Supplier" htmlFor="p-supplier" error={errors.supplierId?.message}>
          <NativeSelect id="p-supplier" className="h-10" {...register("supplierId")}>
            <option value="">Choose a supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Bird type" htmlFor="p-type" error={errors.productId?.message}>
          <NativeSelect id="p-type" className="h-10" {...register("productId")}>
            {liveProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Bird count" htmlFor="p-birds" error={errors.birds?.message}>
          <Input id="p-birds" inputMode="numeric" className="h-10" placeholder="0" {...register("birds")} />
        </Field>
        <Field
          label="Total live weight (kg)"
          htmlFor="p-weight"
          error={errors.weightKg?.message}
          hint={birds > 0 && weight > 0 ? `Average ${(weight / birds).toFixed(3)} kg per bird` : undefined}
        >
          <Input id="p-weight" inputMode="decimal" className="h-10" placeholder="0.000" {...register("weightKg")} />
        </Field>
        <Field label="Rate per kg (₹)" htmlFor="p-rate" error={errors.ratePerKg?.message}>
          <Input id="p-rate" inputMode="decimal" className="h-10" placeholder="0.00" {...register("ratePerKg")} />
        </Field>
        <Field label="Transport cost (₹)" htmlFor="p-transport" error={errors.transportCost?.message}>
          <Input id="p-transport" inputMode="decimal" className="h-10" placeholder="0" {...register("transportCost")} />
        </Field>
        <Field label="Paid now (₹)" htmlFor="p-paid" error={errors.paidAmount?.message} hint="Leave empty to keep the full amount as payable">
          <Input id="p-paid" inputMode="decimal" className="h-10" placeholder="0" {...register("paidAmount")} />
        </Field>
        <Field label="Paid by" htmlFor="p-mode">
          <NativeSelect id="p-mode" className="h-10" {...register("paymentMode")}>
            <option value="bank">Bank transfer</option>
            <option value="cash">Cash</option>
          </NativeSelect>
        </Field>
      </div>

      <dl className="tabular grid grid-cols-2 gap-y-1 rounded-xl bg-muted p-3 text-sm" aria-live="polite">
        <dt className="text-muted-foreground">Bird cost</dt>
        <dd className="text-right">{inr(birdCost)}</dd>
        <dt className="text-muted-foreground">Transport</dt>
        <dd className="text-right">{inr(toNumber(v.transportCost))}</dd>
        <dt className="font-semibold">Total</dt>
        <dd className="text-right text-lg font-semibold">{inr(total)}</dd>
        <dt className="text-muted-foreground">Landed cost per kg</dt>
        <dd className="text-right">{weight > 0 ? inr(total / weight) : "-"}</dd>
        <dt className="text-muted-foreground">Balance payable</dt>
        <dd className="text-right">{inr(Math.max(0, total - paid))}</dd>
      </dl>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="h-10">
          Save purchase
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function PurchasesPage() {
  const purchases = useStore((s) => s.purchases);
  const suppliers = useStore((s) => s.suppliers);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const liveIds = new Set(categories.filter((c) => c.isLive).map((c) => c.id));
    const live = products.filter((p) => liveIds.has(p.categoryId));
    const from = lastNDayKeys(30)[0];
    const recent = purchases.filter((p) => dayKey(p.date) >= from);
    const kgBought = recent.reduce((s, p) => s + p.weightKg, 0);
    return {
      birds: live.reduce((s, p) => s + (p.stockBirds ?? 0), 0),
      liveKg: live.reduce((s, p) => s + p.stockKg, 0),
      value: recent.reduce((s, p) => s + p.total, 0),
      count: recent.length,
      avgRate: kgBought ? recent.reduce((s, p) => s + p.weightKg * p.ratePerKg, 0) / kgBought : 0,
      payable: purchases.reduce((s, p) => s + (p.total - p.paidAmount), 0),
    };
  }, [purchases, products, categories]);

  return (
    <>
      <PageHeader title="Purchase" description="Live birds bought from farms. Each purchase adds birds and weight to live stock.">
        <Button size="lg" onClick={() => setOpen(true)}>
          <Plus /> New purchase
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Live stock" value={`${stats.birds.toLocaleString("en-IN")} birds`} hint={kg(stats.liveKg)} icon={Bird} />
        <StatCard label="Purchases, last 30 days" value={inrWhole(stats.value)} hint={`${stats.count} purchases`} />
        <StatCard label="Average rate" value={`${inr(stats.avgRate)} /kg`} hint="Last 30 days, before transport" />
        <StatCard label="Unpaid on purchases" value={inrWhole(stats.payable)} tone={stats.payable > 0 ? "warn" : "default"} hint="See Suppliers to pay" />
      </div>

      <Panel className="mt-4" title="Purchases" bodyClassName="p-0">
        {purchases.length === 0 ? (
          <EmptyState icon={Bird} title="No purchases yet" description="Add a purchase to bring live birds into stock.">
            <Button onClick={() => setOpen(true)}>New purchase</Button>
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>No.</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Bird type</TableHead>
                <TableHead className="text-right">Birds</TableHead>
                <TableHead className="text-right">Weight (kg)</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Transport</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => {
                const due = round2(p.total - p.paidAmount);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell className="font-medium">{p.purchaseNo}</TableCell>
                    <TableCell>{suppliers.find((s) => s.id === p.supplierId)?.name ?? "-"}</TableCell>
                    <TableCell>{products.find((x) => x.id === p.productId)?.name ?? "-"}</TableCell>
                    <TableCell className="tabular text-right">{p.birds}</TableCell>
                    <TableCell className="tabular text-right">{kgNum(p.weightKg)}</TableCell>
                    <TableCell className="tabular text-right">{inr(p.ratePerKg)}</TableCell>
                    <TableCell className="tabular text-right">{inr(p.transportCost)}</TableCell>
                    <TableCell className="tabular text-right font-semibold">{inr(p.total)}</TableCell>
                    <TableCell>
                      {due <= 0 ? (
                        <Badge variant="secondary">Paid</Badge>
                      ) : p.paidAmount > 0 ? (
                        <Badge variant="outline">Part paid</Badge>
                      ) : (
                        <Badge variant="destructive">Unpaid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">New purchase</DialogTitle>
            <DialogDescription>Saving adds the birds and weight to live stock.</DialogDescription>
          </DialogHeader>
          {open && <PurchaseForm onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
