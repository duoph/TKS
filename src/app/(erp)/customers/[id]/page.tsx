"use client";

import { ArrowLeft, HandCoins, Pencil, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CUSTOMER_TYPE_LABELS, CustomerFormDialog } from "@/components/customers/customer-form";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { PaymentForm } from "@/components/shared/payment-form";
import { ReceiptDialog } from "@/components/shared/receipt";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { recordCustomerPayment } from "@/data/api";
import { customerLedger } from "@/data/selectors";
import { useStore } from "@/data/store";
import type { Sale } from "@/data/types";
import { downloadCsv } from "@/lib/csv";
import { fmtDate, inr, inrWhole } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customer = useStore((s) => s.customers.find((c) => c.id === id));
  const sales = useStore((s) => s.sales);
  const customerPayments = useStore((s) => s.customerPayments);
  const orders = useStore((s) => s.orders);
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const ledger = useMemo(
    () => (customer ? customerLedger(customer, sales, customerPayments) : []),
    [customer, sales, customerPayments],
  );

  if (!customer) {
    return (
      <EmptyState icon={UserX} title="Customer not found" description="This customer may have been removed when the demo data was reset.">
        <Link href="/customers" className={buttonVariants()}>
          Back to customers
        </Link>
      </EmptyState>
    );
  }

  const outstanding = ledger[ledger.length - 1]?.balance ?? 0;
  const customerSales = sales.filter((s) => s.customerId === customer.id);
  const totalBilled = customerSales.reduce((s, x) => s + x.total, 0);
  const openOrders = orders.filter((o) => o.customerId === customer.id && !["delivered", "cancelled"].includes(o.status));
  const newestFirst = [...ledger].reverse();

  const exportLedger = () => {
    downloadCsv(
      `ledger-${customer.name.replace(/\s+/g, "-").toLowerCase()}`,
      ["Date", "Type", "Ref", "Details", "Debit", "Credit", "Balance"],
      ledger.map((e) => [fmtDate(e.date), e.kind, e.ref, e.note, e.debit.toFixed(2), e.credit.toFixed(2), e.balance.toFixed(2)]),
    );
    toast.success("Ledger downloaded");
  };

  return (
    <>
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All customers
      </Link>
      <PageHeader
        title={customer.name}
        description={`${CUSTOMER_TYPE_LABELS[customer.type]} · ${customer.phone} · ${customer.place} · ${customer.priceType} price`}
      >
        <Button variant="outline" size="lg" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
        <Button size="lg" onClick={() => setPaying(true)}>
          <HandCoins /> Receive payment
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={inr(outstanding)}
          tone={outstanding > customer.creditLimit ? "bad" : outstanding > 0 ? "warn" : "good"}
          hint={outstanding > customer.creditLimit ? "Over the credit limit" : undefined}
        />
        <StatCard label="Credit limit" value={inrWhole(customer.creditLimit)} hint={`${inrWhole(Math.max(0, customer.creditLimit - outstanding))} available`} />
        <StatCard label="Total billed" value={inrWhole(totalBilled)} hint={`${customerSales.length} bills`} />
        <StatCard label="Open advance orders" value={String(openOrders.length)} />
      </div>

      <Panel
        className="mt-4"
        title="Ledger"
        description="Bills add to the balance, payments reduce it. Newest first."
        action={
          <Button variant="outline" onClick={exportLedger}>
            Export CSV
          </Button>
        }
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Debit (bill)</TableHead>
              <TableHead className="text-right">Credit (paid)</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newestFirst.map((entry) => {
              const sale = entry.kind === "sale" ? sales.find((s) => s.id === entry.id) : undefined;
              return (
                <TableRow
                  key={entry.id}
                  className={cn(sale && "cursor-pointer")}
                  onClick={sale ? () => setViewSale(sale) : undefined}
                >
                  <TableCell>{entry.kind === "opening" ? "-" : fmtDate(entry.date)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.kind === "payment" ? "secondary" : "outline"} className="capitalize">
                      {entry.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{entry.ref || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.note}</TableCell>
                  <TableCell className="tabular text-right">{entry.debit ? inr(entry.debit) : "-"}</TableCell>
                  <TableCell className="tabular text-right">{entry.credit ? inr(entry.credit) : "-"}</TableCell>
                  <TableCell className="tabular text-right font-semibold">{inr(entry.balance)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>

      <Dialog open={paying} onOpenChange={setPaying}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Receive payment</DialogTitle>
            <DialogDescription>{customer.name}</DialogDescription>
          </DialogHeader>
          {paying && (
            <PaymentForm
              outstanding={outstanding}
              methods={[
                { id: "cash" as const, label: "Cash" },
                { id: "upi" as const, label: "UPI" },
                { id: "bank" as const, label: "Bank transfer" },
                { id: "card" as const, label: "Card" },
              ]}
              submitLabel="Save payment"
              onCancel={() => setPaying(false)}
              onSubmit={({ amount, method, note }) => {
                recordCustomerPayment({ customerId: customer.id, amount, method, note });
                toast.success(`${inr(amount)} received from ${customer.name}`);
                setPaying(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <CustomerFormDialog open={editing} customer={customer} onClose={() => setEditing(false)} />
      <ReceiptDialog sale={viewSale} onClose={() => setViewSale(null)} />
    </>
  );
}
