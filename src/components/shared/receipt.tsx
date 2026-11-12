"use client";

import { Printer } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { itemLabel } from "@/data/selectors";
import { useStore } from "@/data/store";
import type { Sale, Settings } from "@/data/types";
import { fmtDate, fmtTime, kgNum } from "@/lib/format";

const money = (n: number) => n.toFixed(2);
const METHOD_LABELS = { cash: "Cash", upi: "UPI", card: "Card", credit: "Credit" } as const;

/** Thermal-printer style bill. Always black on white, like the paper. */
export function Receipt({ sale, settings }: { sale: Sale; settings: Settings }) {
  const { shop, bill } = settings;
  const narrow = bill.paperWidth === "58mm";
  const totalKg = sale.items.reduce((s, i) => s + i.weightKg, 0);
  const rule = <div className="my-1.5 border-t border-dashed border-black" />;

  return (
    <div
      className="bg-white px-3 py-4 font-mono leading-snug text-black"
      style={{ width: narrow ? "58mm" : "80mm", fontSize: narrow ? 10.5 : 12 }}
    >
      <div className="text-center">
        {bill.showLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="" className="mx-auto mb-1 size-14" />
        )}
        <p className="text-[1.25em] font-bold uppercase">{shop.name}</p>
        {bill.header && <p>{bill.header}</p>}
        <p>{shop.address}</p>
        <p>Ph: {shop.phone}</p>
        {bill.showGstin && <p>GSTIN: {shop.gstin}</p>}
        <p>FSSAI: {shop.fssai}</p>
      </div>
      {rule}
      <div className="flex justify-between">
        <span>Bill: {sale.billNo}</span>
        <span>{fmtDate(sale.date)}</span>
      </div>
      <div className="flex justify-between">
        <span>{sale.priceType === "wholesale" ? "Wholesale" : "Retail"}</span>
        <span>{fmtTime(sale.date)}</span>
      </div>
      {bill.showCustomer && <p>Customer: {sale.customerName}</p>}
      <p>Cashier: {sale.cashier}</p>
      {rule}
      <div className="flex justify-between font-bold">
        <span>Item / Kg x Rate</span>
        <span>Amount</span>
      </div>
      {rule}
      {sale.items.map((item, i) => (
        <div key={i} className="mb-1">
          <p className="font-bold">{bill.showCategoryCode ? itemLabel(item) : item.name}</p>
          <div className="flex justify-between">
            <span>
              {kgNum(item.weightKg)} kg x {money(item.rate)}
              {item.birds ? ` (${item.birds} nos)` : ""}
            </span>
            <span>{money(item.amount)}</span>
          </div>
        </div>
      ))}
      {rule}
      <div className="flex justify-between">
        <span>Items: {sale.items.length}</span>
        <span>Total wt: {kgNum(totalKg)} kg</span>
      </div>
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{money(sale.subtotal)}</span>
      </div>
      {sale.discount > 0 && (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{money(sale.discount)}</span>
        </div>
      )}
      {sale.roundOff !== 0 && (
        <div className="flex justify-between">
          <span>Round off</span>
          <span>{money(sale.roundOff)}</span>
        </div>
      )}
      {rule}
      <div className="flex justify-between text-[1.3em] font-bold">
        <span>TOTAL</span>
        <span>Rs {money(sale.total)}</span>
      </div>
      {rule}
      {sale.payments.map((p, i) => (
        <div key={i} className="flex justify-between">
          <span>Paid by {METHOD_LABELS[p.method]}</span>
          <span>{money(p.amount)}</span>
        </div>
      ))}
      {rule}
      <p className="text-center">{bill.footer}</p>
    </div>
  );
}

/** Receipt preview with a Print button. Only the receipt itself is printed. */
export function ReceiptDialog({
  sale,
  onClose,
  closeLabel = "Close",
}: {
  sale: Sale | null;
  onClose: () => void;
  closeLabel?: string;
}) {
  const settings = useStore((s) => s.settings);
  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] grid-rows-[auto_1fr_auto] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bill {sale?.billNo}</DialogTitle>
          <DialogDescription>Receipt preview ({settings.bill.paperWidth} thermal paper)</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 justify-center overflow-auto rounded-lg bg-muted p-3">
          {sale && (
            <div className="h-fit shadow-md">
              <Receipt sale={sale} settings={settings} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => window.print()}>
            <Printer /> Print
          </Button>
          <Button className="h-11" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
        {sale &&
          createPortal(
            <div className="print-root">
              <Receipt sale={sale} settings={settings} />
            </div>,
            document.body,
          )}
      </DialogContent>
    </Dialog>
  );
}
