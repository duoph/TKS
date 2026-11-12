"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, NativeSelect } from "@/components/shared/field";
import { EmptyState, FilterPills, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createOrder, setOrderStatus } from "@/data/api";
import { productLabel } from "@/data/selectors";
import { useStore } from "@/data/store";
import type { Order, OrderStatus } from "@/data/types";
import { dateFromKey, dayKey, fmtDate, inr, kgNum, round2, todayKey } from "@/lib/format";
import { optionalAmount, positiveNumber, requiredText, toNumber } from "@/lib/validation";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  confirmed: "secondary",
  ready: "default",
  delivered: "secondary",
  cancelled: "destructive",
};
/** The next step for each status, and the button label for it. */
const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending: { status: "confirmed", label: "Confirm" },
  confirmed: { status: "ready", label: "Mark ready" },
  ready: { status: "delivered", label: "Mark delivered" },
};

const schema = z.object({
  customerId: requiredText("Customer"),
  deliveryDate: requiredText("Delivery date").refine((v) => v >= todayKey(), "Delivery date cannot be in the past"),
  deliveryTime: requiredText("Delivery time"),
  items: z
    .array(z.object({ productId: requiredText("Product"), kg: positiveNumber("Kg") }))
    .min(1, "Add at least one product"),
  advance: optionalAmount("Advance"),
  notes: z.string(),
});
type FormValues = z.infer<typeof schema>;

function OrderForm({ onDone }: { onDone: () => void }) {
  const customers = useStore((s) => s.customers);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const cutCategories = categories.filter((c) => !c.isLive);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: "",
      deliveryDate: dayKey(tomorrow),
      deliveryTime: "08:00",
      items: [{ productId: "", kg: "" }],
      advance: "",
      notes: "",
    },
  });
  const { register, control, formState } = form;
  const errors = formState.errors;
  const lines = useFieldArray({ control, name: "items" });
  const watched = useWatch({ control });
  const customer = customers.find((c) => c.id === watched.customerId);

  const estimate = round2(
    (watched.items ?? []).reduce((sum, line) => {
      const p = products.find((x) => x.id === line?.productId);
      if (!p) return sum;
      return sum + toNumber(line?.kg) * (customer?.priceType === "retail" ? p.retailPrice : p.wholesalePrice);
    }, 0),
  );

  const onSubmit = form.handleSubmit((data) => {
    try {
      const order = createOrder({
        customerId: data.customerId,
        deliveryDate: data.deliveryDate,
        deliveryTime: data.deliveryTime,
        items: data.items.map((i) => ({ productId: i.productId, kg: toNumber(i.kg) })),
        advance: toNumber(data.advance),
        notes: data.notes,
      });
      toast.success(`Order ${order.orderNo} saved`, { description: `Delivery on ${fmtDate(dateFromKey(order.deliveryDate))}` });
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the order");
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <Field label="Customer" htmlFor="o-customer" error={errors.customerId?.message}>
        <NativeSelect id="o-customer" className="h-10" {...register("customerId")}>
          <option value="">Choose a customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Delivery date" htmlFor="o-date" error={errors.deliveryDate?.message}>
          <Input id="o-date" type="date" className="h-10" min={todayKey()} {...register("deliveryDate")} />
        </Field>
        <Field label="Delivery time" htmlFor="o-time" error={errors.deliveryTime?.message}>
          <Input id="o-time" type="time" className="h-10" {...register("deliveryTime")} />
        </Field>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Products</p>
        {lines.fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[1fr_6.5rem_auto] items-start gap-2">
            <div>
              <NativeSelect
                aria-label={`Product ${index + 1}`}
                className="h-10"
                aria-invalid={!!errors.items?.[index]?.productId}
                {...register(`items.${index}.productId`)}
              >
                <option value="">Choose a product</option>
                {cutCategories.map((c) => (
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
              {errors.items?.[index]?.productId && (
                <p className="mt-1 text-xs text-destructive">{errors.items[index]?.productId?.message}</p>
              )}
            </div>
            <div>
              <Input
                aria-label={`Kg for product ${index + 1}`}
                inputMode="decimal"
                placeholder="Kg"
                className="h-10 text-right"
                aria-invalid={!!errors.items?.[index]?.kg}
                {...register(`items.${index}.kg`)}
              />
              {errors.items?.[index]?.kg && <p className="mt-1 text-xs text-destructive">{errors.items[index]?.kg?.message}</p>}
            </div>
            <Button
              type="button"
              variant="outline"
              className="size-10"
              aria-label={`Remove product ${index + 1}`}
              disabled={lines.fields.length === 1}
              onClick={() => lines.remove(index)}
            >
              <X />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" className="h-10 w-fit" onClick={() => lines.append({ productId: "", kg: "" })}>
          <Plus /> Add product
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Advance received (₹)" htmlFor="o-advance" error={errors.advance?.message}>
          <Input id="o-advance" inputMode="decimal" className="h-10" placeholder="0" {...register("advance")} />
        </Field>
        <Field label="Notes" htmlFor="o-notes">
          <Input id="o-notes" className="h-10" placeholder="Function, delivery place..." {...register("notes")} />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">
          Estimated amount ({customer?.priceType === "retail" ? "retail" : "wholesale"} price)
        </span>
        <span className="text-lg font-semibold tabular-nums">{inr(estimate)}</span>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="h-10">
          Save order
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function OrdersPage() {
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const [filter, setFilter] = useState<"open" | "all" | OrderStatus>("open");
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);

  const today = todayKey();
  const rows = useMemo(
    () =>
      orders
        .filter((o) =>
          filter === "all" ? true : filter === "open" ? !["delivered", "cancelled"].includes(o.status) : o.status === filter,
        )
        .sort((a, b) => `${a.deliveryDate} ${a.deliveryTime}`.localeCompare(`${b.deliveryDate} ${b.deliveryTime}`)),
    [orders, filter],
  );
  const open = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const dueToday = open.filter((o) => o.deliveryDate === today);
  const openKg = open.reduce((s, o) => s + o.items.reduce((x, i) => x + i.kg, 0), 0);

  const nameOf = (id: string) => {
    const p = products.find((x) => x.id === id);
    return p ? productLabel(p, categories) : "Removed product";
  };
  const changeStatus = (order: Order, status: OrderStatus) => {
    setOrderStatus(order.id, status);
    toast.success(`Order ${order.orderNo} marked ${STATUS_LABELS[status].toLowerCase()}`);
    setDetail(null);
  };
  const live = detail ? (orders.find((o) => o.id === detail.id) ?? null) : null;

  return (
    <>
      <PageHeader title="Advance orders" description="Orders booked ahead for functions, hotels and caterers, by delivery date.">
        <Button size="lg" onClick={() => setAdding(true)}>
          <Plus /> New order
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open orders" value={String(open.length)} icon={ClipboardList} />
        <StatCard label="To deliver today" value={String(dueToday.length)} tone={dueToday.length ? "warn" : "default"} />
        <StatCard label="Quantity to prepare" value={`${kgNum(openKg)} kg`} hint="All open orders" />
        <StatCard label="Advance collected" value={inr(open.reduce((s, o) => s + o.advance, 0))} hint="On open orders" />
      </div>

      <Panel className="mt-4" bodyClassName="p-0">
        <div className="border-b p-3">
          <FilterPills
            label="Order status"
            value={filter}
            onChange={setFilter}
            options={[
              { id: "open", label: "Open" },
              { id: "all", label: "All" },
              ...(Object.entries(STATUS_LABELS) as [OrderStatus, string][]).map(([id, label]) => ({ id, label })),
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No orders here" description="There are no orders with this status.">
            <Button onClick={() => setAdding(true)}>New order</Button>
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead className="text-right">Estimate</TableHead>
                <TableHead className="text-right">Advance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const next = NEXT_STEP[o.status];
                return (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setDetail(o)}>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium">{o.deliveryDate === today ? "Today" : fmtDate(dateFromKey(o.deliveryDate))}</span>
                      <span className="block text-xs text-muted-foreground">{o.deliveryTime}</span>
                    </TableCell>
                    <TableCell>{o.orderNo}</TableCell>
                    <TableCell className="font-medium">{customers.find((c) => c.id === o.customerId)?.name ?? "-"}</TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {o.items.map((i) => nameOf(i.productId)).join(", ")}
                    </TableCell>
                    <TableCell className="tabular text-right">{kgNum(o.items.reduce((s, i) => s + i.kg, 0))}</TableCell>
                    <TableCell className="tabular text-right">{inr(o.estimatedAmount)}</TableCell>
                    <TableCell className="tabular text-right">{o.advance ? inr(o.advance) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {next ? (
                        <Button variant="outline" size="sm" onClick={() => changeStatus(o, next.status)}>
                          {next.label}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setDetail(o)}>
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">New advance order</DialogTitle>
            <DialogDescription>Book an order for a later delivery date.</DialogDescription>
          </DialogHeader>
          {adding && <OrderForm onDone={() => setAdding(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!live} onOpenChange={(next) => !next && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {live && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">Order {live.orderNo}</DialogTitle>
                <DialogDescription>
                  {customers.find((c) => c.id === live.customerId)?.name} · deliver {fmtDate(dateFromKey(live.deliveryDate))} at{" "}
                  {live.deliveryTime}
                </DialogDescription>
              </DialogHeader>
              <div>
                <Badge variant={STATUS_VARIANTS[live.status]}>{STATUS_LABELS[live.status]}</Badge>
                <span className="ml-2 text-xs text-muted-foreground">Booked on {fmtDate(live.createdAt)}</span>
              </div>
              <ul className="divide-y rounded-lg border text-sm">
                {live.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-3 px-3 py-2">
                    <span>{nameOf(item.productId)}</span>
                    <span className="tabular font-medium">{kgNum(item.kg)} kg</span>
                  </li>
                ))}
              </ul>
              <dl className="tabular grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Estimated amount</dt>
                <dd className="text-right">{inr(live.estimatedAmount)}</dd>
                <dt className="text-muted-foreground">Advance received</dt>
                <dd className="text-right">{inr(live.advance)}</dd>
                <dt className="font-medium">Balance on delivery</dt>
                <dd className="text-right font-semibold">{inr(Math.max(0, live.estimatedAmount - live.advance))}</dd>
              </dl>
              {live.notes && <p className="text-sm text-muted-foreground">Notes: {live.notes}</p>}
              {NEXT_STEP[live.status] && (
                <DialogFooter>
                  <Button variant="destructive" className="h-10" onClick={() => changeStatus(live, "cancelled")}>
                    Cancel order
                  </Button>
                  <Button className="h-10" onClick={() => changeStatus(live, NEXT_STEP[live.status]!.status)}>
                    {NEXT_STEP[live.status]!.label}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
