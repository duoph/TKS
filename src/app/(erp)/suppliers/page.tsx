"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/shared/field";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { PaymentForm } from "@/components/shared/payment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { recordSupplierPayment, saveSupplier } from "@/data/api";
import { supplierOutstandingMap } from "@/data/selectors";
import { useStore } from "@/data/store";
import type { Supplier } from "@/data/types";
import { fmtDate, inr, inrWhole, kgNum } from "@/lib/format";
import { requiredText } from "@/lib/validation";

const schema = z.object({
  name: requiredText("Farm name"),
  contact: requiredText("Contact person"),
  phone: requiredText("Phone"),
  place: requiredText("Place"),
});
type FormValues = z.infer<typeof schema>;

function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: supplier ?? { name: "", contact: "", phone: "", place: "" },
  });
  const { register, formState } = form;
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={form.handleSubmit((data) => {
        saveSupplier({ ...data, id: supplier?.id });
        toast.success(supplier ? "Supplier updated" : "Supplier added");
        onDone();
      })}
    >
      <Field label="Farm / supplier name" htmlFor="s-name" error={formState.errors.name?.message}>
        <Input id="s-name" className="h-10" {...register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact person" htmlFor="s-contact" error={formState.errors.contact?.message}>
          <Input id="s-contact" className="h-10" {...register("contact")} />
        </Field>
        <Field label="Phone" htmlFor="s-phone" error={formState.errors.phone?.message}>
          <Input id="s-phone" inputMode="tel" className="h-10" {...register("phone")} />
        </Field>
      </div>
      <Field label="Place" htmlFor="s-place" error={formState.errors.place?.message}>
        <Input id="s-place" className="h-10" {...register("place")} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="h-10">
          Save supplier
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function SuppliersPage() {
  const suppliers = useStore((s) => s.suppliers);
  const purchases = useStore((s) => s.purchases);
  const supplierPayments = useStore((s) => s.supplierPayments);
  const products = useStore((s) => s.products);
  const [editing, setEditing] = useState<{ supplier?: Supplier } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const outstanding = useMemo(
    () => supplierOutstandingMap(suppliers, purchases, supplierPayments),
    [suppliers, purchases, supplierPayments],
  );
  const totalDue = Object.values(outstanding).reduce((s, v) => s + Math.max(0, v), 0);
  const detail = suppliers.find((s) => s.id === detailId);
  const paying = suppliers.find((s) => s.id === payingId);
  const detailPurchases = purchases.filter((p) => p.supplierId === detailId);
  const detailPayments = supplierPayments.filter((p) => p.supplierId === detailId);

  return (
    <>
      <PageHeader title="Suppliers" description="Farms that supply live birds, what is owed to them, and their purchase history.">
        <Button size="lg" onClick={() => setEditing({})}>
          <Plus /> Add supplier
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Suppliers" value={String(suppliers.length)} icon={Truck} />
        <StatCard label="Total payable" value={inrWhole(totalDue)} tone={totalDue > 0 ? "warn" : "default"} />
        <StatCard label="Suppliers to pay" value={String(Object.values(outstanding).filter((v) => v > 0).length)} />
      </div>

      <Panel className="mt-4" title="Supplier list" description="Tap a supplier to see purchases and payments" bodyClassName="p-0">
        {suppliers.length === 0 ? (
          <EmptyState icon={Truck} title="No suppliers yet" description="Add the farms you buy birds from.">
            <Button onClick={() => setEditing({})}>Add supplier</Button>
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Place</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Last purchase</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => {
                const list = purchases.filter((p) => p.supplierId === s.id);
                const due = outstanding[s.id] ?? 0;
                return (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetailId(s.id)}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      {s.contact}
                      <span className="block text-xs text-muted-foreground">{s.phone}</span>
                    </TableCell>
                    <TableCell>{s.place}</TableCell>
                    <TableCell className="tabular text-right">{list.length}</TableCell>
                    <TableCell className="tabular text-right">{list[0] ? fmtDate(list[0].date) : "-"}</TableCell>
                    <TableCell className="tabular text-right font-semibold">
                      {due > 0 ? <span className="text-destructive">{inr(due)}</span> : <Badge variant="secondary">Settled</Badge>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setDetailId(s.id)}>
                          History
                        </Button>
                        <Button variant="outline" size="sm" disabled={due <= 0} onClick={() => setPayingId(s.id)}>
                          Pay
                        </Button>
                        <Button variant="outline" size="icon-sm" aria-label={`Edit ${s.name}`} onClick={() => setEditing({ supplier: s })}>
                          <Pencil />
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

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{editing?.supplier ? "Edit supplier" : "Add supplier"}</DialogTitle>
            <DialogDescription>Farm and contact details.</DialogDescription>
          </DialogHeader>
          {editing && <SupplierForm supplier={editing.supplier} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!paying} onOpenChange={(open) => !open && setPayingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Pay supplier</DialogTitle>
            <DialogDescription>{paying?.name}</DialogDescription>
          </DialogHeader>
          {paying && (
            <PaymentForm
              outstanding={outstanding[paying.id] ?? 0}
              methods={[
                { id: "bank" as const, label: "Bank transfer" },
                { id: "upi" as const, label: "UPI" },
                { id: "cash" as const, label: "Cash" },
              ]}
              submitLabel="Save payment"
              onCancel={() => setPayingId(null)}
              onSubmit={({ amount, method, note }) => {
                recordSupplierPayment({ supplierId: paying.id, amount, method, note });
                toast.success(`${inr(amount)} paid to ${paying.name}`);
                setPayingId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="flex max-h-[92dvh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{detail?.name}</DialogTitle>
            <DialogDescription>
              {detail?.contact} · {detail?.phone} · {detail?.place}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2.5">
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-xl font-semibold tabular-nums">{inr(outstanding[detail.id] ?? 0)}</p>
                </div>
                <Button className="h-10" disabled={(outstanding[detail.id] ?? 0) <= 0} onClick={() => setPayingId(detail.id)}>
                  Pay supplier
                </Button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                <div className="rounded-lg border">
                  <p className="border-b px-3 py-2 text-sm font-semibold">Purchase history</p>
                  {detailPurchases.length === 0 ? (
                    <EmptyState icon={Truck} title="No purchases from this supplier yet" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>No.</TableHead>
                          <TableHead>Bird type</TableHead>
                          <TableHead className="text-right">Birds</TableHead>
                          <TableHead className="text-right">Kg</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailPurchases.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{fmtDate(p.date)}</TableCell>
                            <TableCell>{p.purchaseNo}</TableCell>
                            <TableCell>{products.find((x) => x.id === p.productId)?.name}</TableCell>
                            <TableCell className="tabular text-right">{p.birds}</TableCell>
                            <TableCell className="tabular text-right">{kgNum(p.weightKg)}</TableCell>
                            <TableCell className="tabular text-right">{inr(p.total)}</TableCell>
                            <TableCell className="tabular text-right">{inr(p.paidAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                {detailPayments.length > 0 && (
                  <div className="rounded-lg border">
                    <p className="border-b px-3 py-2 text-sm font-semibold">Payments made</p>
                    <Table>
                      <TableBody>
                        {detailPayments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{fmtDate(p.date)}</TableCell>
                            <TableCell className="uppercase">{p.method}</TableCell>
                            <TableCell className="text-muted-foreground">{p.note || "-"}</TableCell>
                            <TableCell className="tabular text-right font-medium">{inr(p.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
