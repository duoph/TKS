"use client";

import { Pause, ShoppingBasket, Trash2, X } from "lucide-react";
import { NativeSelect } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { itemLabel } from "@/data/selectors";
import type { Customer, PriceType, SaleItem } from "@/data/types";
import { inr, kgNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BillTotals {
  subtotal: number;
  discount: number;
  roundOff: number;
  total: number;
}

interface CartPanelProps {
  items: SaleItem[];
  totals: BillTotals;
  customers: Customer[];
  customerId: string | null;
  priceType: PriceType;
  discountText: string;
  onCustomerChange: (id: string | null) => void;
  onPriceTypeChange: (type: PriceType) => void;
  onDiscountChange: (text: string) => void;
  onEditItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onClear: () => void;
  onHold: () => void;
  onPay: () => void;
}

/** The bill being built: lines, customer, price type, discount and totals. */
export function CartPanel(props: CartPanelProps) {
  const { items, totals, priceType } = props;
  const totalKg = items.reduce((s, i) => s + i.weightKg, 0);
  const empty = items.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid gap-2 border-b p-3">
        <NativeSelect
          aria-label="Customer"
          className="h-11 text-base"
          value={props.customerId ?? ""}
          onChange={(e) => props.onCustomerChange(e.target.value || null)}
        >
          <option value="">Walk-in customer</option>
          {props.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Price type">
          {(["retail", "wholesale"] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={priceType === type}
              onClick={() => props.onPriceTypeChange(type)}
              className={cn(
                "h-9 rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                priceType === type ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {type === "retail" ? "Retail price" : "Wholesale price"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <ShoppingBasket className="size-9 text-muted-foreground" aria-hidden />
            <p className="font-medium">No items yet</p>
            <p className="text-sm text-muted-foreground">Tap a product, then enter its weight.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((item, index) => (
              <li key={`${item.productId}-${index}`} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => props.onEditItem(index)}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                  aria-label={`Edit ${itemLabel(item)}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{itemLabel(item)}</span>
                    <span className="tabular shrink-0 font-semibold">{inr(item.amount)}</span>
                  </span>
                  <span className="tabular text-sm text-muted-foreground">
                    {kgNum(item.weightKg)} kg × {inr(item.rate)}
                    {item.birds ? ` · ${item.birds} bird${item.birds === 1 ? "" : "s"}` : ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => props.onRemoveItem(index)}
                  className="flex w-12 shrink-0 items-center justify-center text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10"
                  aria-label={`Remove ${itemLabel(item)}`}
                >
                  <X className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t bg-card p-3">
        <dl className="tabular grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted-foreground">
            Subtotal ({items.length} item{items.length === 1 ? "" : "s"}, {kgNum(totalKg)} kg)
          </dt>
          <dd className="text-right">{inr(totals.subtotal)}</dd>
          <dt className="flex items-center text-muted-foreground">
            <label htmlFor="pos-discount">Discount (₹)</label>
          </dt>
          <dd className="flex justify-end">
            <Input
              id="pos-discount"
              inputMode="decimal"
              placeholder="0"
              className="h-9 w-24 text-right"
              value={props.discountText}
              onChange={(e) => props.onDiscountChange(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </dd>
          <dt className="text-muted-foreground">Round off</dt>
          <dd className="text-right">{totals.roundOff > 0 ? "+" : ""}{totals.roundOff.toFixed(2)}</dd>
        </dl>
        <div className="mt-2 flex items-end justify-between border-t pt-2">
          <span className="text-base font-semibold">Total</span>
          <span className="text-3xl font-semibold tabular-nums">{inr(totals.total)}</span>
        </div>
        <div className="mt-3 grid grid-cols-[auto_auto_1fr] gap-2">
          <Button variant="outline" className="h-14 px-3" onClick={props.onClear} disabled={empty} aria-label="Clear bill">
            <Trash2 className="size-5!" />
          </Button>
          <Button variant="outline" className="h-14 gap-2 px-4 text-base" onClick={props.onHold} disabled={empty}>
            <Pause className="size-5!" /> Hold
          </Button>
          <Button className="h-14 text-lg" onClick={props.onPay} disabled={empty}>
            Pay <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1.5 text-xs font-normal lg:inline">F9</kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
