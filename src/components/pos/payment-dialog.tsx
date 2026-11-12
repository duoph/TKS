"use client";

import { Banknote, CreditCard, HandCoins, type LucideIcon, QrCode, Split } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Customer, Payment, PaymentMethod } from "@/data/types";
import { inr, round2 } from "@/lib/format";
import { cn } from "@/lib/utils";

type Mode = PaymentMethod | "split";

const MODES: { id: Mode; label: string; icon: LucideIcon }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI", icon: QrCode },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "credit", label: "Credit", icon: HandCoins },
  { id: "split", label: "Split", icon: Split },
];
const SPLIT_METHODS: PaymentMethod[] = ["cash", "upi", "card", "credit"];
const METHOD_LABELS: Record<PaymentMethod, string> = { cash: "Cash", upi: "UPI", card: "Card", credit: "Credit" };

/** Decorative QR-style pattern for the demo. It is not a real payment code. */
function DemoQr({ seed }: { seed: number }) {
  const cells = useMemo(() => {
    const size = 21;
    const out: boolean[] = [];
    let a = seed * 9301 + 49297;
    const finder = (r: number, c: number) => {
      const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
      for (const [r0, c0] of [[0, 0], [0, 14], [14, 0]] as const) {
        if (inBox(r0, c0)) {
          const dr = r - r0;
          const dc = c - c0;
          const ring = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          return ring || core;
        }
      }
      return null;
    };
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        a = (a * 1103515245 + 12345) & 0x7fffffff;
        out.push(finder(r, c) ?? a % 7 < 3);
      }
    }
    return out;
  }, [seed]);
  return (
    <svg viewBox="0 0 21 21" className="size-36 bg-white p-2" role="img" aria-label="Demo QR code">
      {cells.map((on, i) => (on ? <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" fill="#000" /> : null))}
    </svg>
  );
}

function PaymentForm({
  total,
  customer,
  outstanding,
  upiId,
  onConfirm,
}: {
  total: number;
  customer: Customer | null;
  outstanding: number;
  upiId: string;
  onConfirm: (payments: Payment[], tendered?: number) => void;
}) {
  const [mode, setMode] = useState<Mode>("cash");
  const [tendered, setTendered] = useState(String(total));
  const [split, setSplit] = useState<Record<PaymentMethod, string>>({ cash: "", upi: "", card: "", credit: "" });

  const tenderedNum = Number(tendered) || 0;
  const change = round2(tenderedNum - total);
  const splitTotal = round2(SPLIT_METHODS.reduce((s, m) => s + (Number(split[m]) || 0), 0));
  const splitRemaining = round2(total - splitTotal);
  const newBalance = outstanding + total;
  const overLimit = !!customer && newBalance > customer.creditLimit;

  const quickCash = useMemo(() => {
    const options = [50, 100, 500, 2000].map((step) => Math.ceil(total / step) * step);
    return [...new Set(options)].filter((v) => v > total).slice(0, 3);
  }, [total]);

  let error = "";
  if (mode === "cash" && tenderedNum < total) error = `Cash received is short by ${inr(total - tenderedNum)}.`;
  if (mode === "credit" && !customer) error = "Select a customer on the bill to sell on credit.";
  if (mode === "split") {
    if (Math.abs(splitRemaining) > 0.009) {
      error = splitRemaining > 0 ? `${inr(splitRemaining)} still to be allotted.` : `Over by ${inr(-splitRemaining)}.`;
    } else if ((Number(split.credit) || 0) > 0 && !customer) error = "Select a customer to put part of the bill on credit.";
  }

  const confirm = () => {
    if (error) return;
    if (mode === "split") {
      onConfirm(SPLIT_METHODS.map((m) => ({ method: m, amount: round2(Number(split[m]) || 0) })).filter((p) => p.amount > 0));
    } else {
      onConfirm([{ method: mode, amount: total }], mode === "cash" ? tenderedNum : undefined);
    }
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        confirm();
      }}
    >
      <div className="flex items-end justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
        <span className="text-sm font-medium">Amount to collect</span>
        <span className="text-3xl font-semibold tabular-nums">{inr(total)}</span>
      </div>

      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Payment method">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              mode === m.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "bg-card hover:bg-muted",
            )}
          >
            <m.icon className="size-5" aria-hidden />
            {m.label}
          </button>
        ))}
      </div>

      <div className="min-h-44">
        {mode === "cash" && (
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Cash received
              <Input
                autoFocus
                inputMode="decimal"
                className="h-12 text-xl tabular-nums md:text-xl"
                value={tendered}
                onChange={(e) => setTendered(e.target.value.replace(/[^0-9.]/g, ""))}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setTendered(String(total))}>
                Exact
              </Button>
              {quickCash.map((v) => (
                <Button key={v} type="button" variant="outline" className="h-11 tabular-nums" onClick={() => setTendered(String(v))}>
                  {inr(v)}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
              <span className="text-sm font-medium">Change to return</span>
              <span className="text-xl font-semibold tabular-nums">{inr(Math.max(0, change))}</span>
            </div>
          </div>
        )}

        {mode === "upi" && (
          <div className="flex items-center gap-4">
            <DemoQr seed={Math.round(total)} />
            <div className="text-sm">
              <p className="font-medium">Ask the customer to scan and pay</p>
              <p className="mt-1 text-muted-foreground">UPI ID: {upiId}</p>
              <p className="mt-1 text-muted-foreground">Amount: {inr(total)}</p>
              <p className="mt-3 text-xs text-muted-foreground">Demo QR. Confirm once the payment message arrives.</p>
            </div>
          </div>
        )}

        {mode === "card" && (
          <div className="flex items-center gap-4 rounded-xl bg-muted p-4 text-sm">
            <CreditCard className="size-10 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-medium">Swipe, insert or tap the card on the card machine</p>
              <p className="mt-1 text-muted-foreground">Charge {inr(total)}, then confirm here once it is approved.</p>
            </div>
          </div>
        )}

        {mode === "credit" &&
          (customer ? (
            <div className="grid gap-2 text-sm">
              <p className="font-medium">{customer.name}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-muted p-3 tabular-nums">
                <dt className="text-muted-foreground">Current outstanding</dt>
                <dd className="text-right">{inr(outstanding)}</dd>
                <dt className="text-muted-foreground">This bill</dt>
                <dd className="text-right">{inr(total)}</dd>
                <dt className="font-medium">New outstanding</dt>
                <dd className="text-right font-semibold">{inr(newBalance)}</dd>
                <dt className="text-muted-foreground">Credit limit</dt>
                <dd className="text-right">{inr(customer.creditLimit)}</dd>
              </dl>
              {overLimit && (
                <p className="font-medium text-warning" role="alert">
                  This goes over the credit limit by {inr(newBalance - customer.creditLimit)}. You can still continue.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-4 text-sm">
              Credit needs a named customer. Close this, choose the customer on the bill, and try again.
            </p>
          ))}

        {mode === "split" && (
          <div className="grid gap-2">
            {SPLIT_METHODS.map((m) => (
              <div key={m} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
                <label htmlFor={`split-${m}`} className="text-sm font-medium">
                  {METHOD_LABELS[m]}
                </label>
                <Input
                  id={`split-${m}`}
                  inputMode="decimal"
                  placeholder="0"
                  className="h-11 tabular-nums"
                  disabled={m === "credit" && !customer}
                  value={split[m]}
                  onChange={(e) => setSplit({ ...split, [m]: e.target.value.replace(/[^0-9.]/g, "") })}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={splitRemaining <= 0 || (m === "credit" && !customer)}
                  onClick={() => setSplit({ ...split, [m]: String(round2((Number(split[m]) || 0) + splitRemaining)) })}
                >
                  Rest
                </Button>
              </div>
            ))}
            {!customer && <p className="text-xs text-muted-foreground">Credit is available when a customer is selected.</p>}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="h-14 text-lg" disabled={!!error}>
        Complete sale · {inr(total)}
      </Button>
    </form>
  );
}

export function PaymentDialog({
  open,
  total,
  customer,
  outstanding,
  upiId,
  onConfirm,
  onClose,
}: {
  open: boolean;
  total: number;
  customer: Customer | null;
  outstanding: number;
  upiId: string;
  onConfirm: (payments: Payment[], tendered?: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Payment</DialogTitle>
          <DialogDescription>{customer ? customer.name : "Walk-in customer"}</DialogDescription>
        </DialogHeader>
        {open && (
          <PaymentForm total={total} customer={customer} outstanding={outstanding} upiId={upiId} onConfirm={onConfirm} />
        )}
      </DialogContent>
    </Dialog>
  );
}
