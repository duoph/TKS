/**
 * Pure functions that derive numbers from the stored data: outstanding
 * balances, ledgers, stock history, daily totals. Nothing here changes state.
 */

import { dayKey, round2, round3 } from "@/lib/format";
import type {
  Batch,
  Category,
  Customer,
  CustomerPayment,
  DemoData,
  LedgerEntry,
  Product,
  Purchase,
  Sale,
  StockMovement,
  Supplier,
  SupplierPayment,
} from "./types";

/** "SL BL - Curry Cut": the same cut name exists in several categories. */
export function productLabel(product: Pick<Product, "name" | "categoryId">, categories: Category[]): string {
  const category = categories.find((c) => c.id === product.categoryId);
  return category ? `${category.code} - ${product.name}` : product.name;
}

export function itemLabel(item: { name: string; categoryCode: string }): string {
  return item.categoryCode ? `${item.categoryCode} - ${item.name}` : item.name;
}

export function isLowStock(product: Product): boolean {
  return product.active && product.stockKg <= product.lowStockKg;
}

export function creditOf(sale: Sale): number {
  return sale.payments.filter((p) => p.method === "credit").reduce((s, p) => s + p.amount, 0);
}

export function paidBy(sale: Sale, method: "cash" | "upi" | "card" | "credit"): number {
  return sale.payments.filter((p) => p.method === method).reduce((s, p) => s + p.amount, 0);
}

// ---------------------------------------------------------------- customers

export function customerOutstandingMap(
  customers: Customer[],
  sales: Sale[],
  payments: CustomerPayment[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of customers) map[c.id] = c.openingBalance;
  for (const s of sales) {
    if (s.customerId && s.customerId in map) map[s.customerId] += creditOf(s);
  }
  for (const p of payments) {
    if (p.customerId in map) map[p.customerId] -= p.amount;
  }
  for (const id of Object.keys(map)) map[id] = round2(map[id]);
  return map;
}

/** Oldest first, with a running balance. */
export function customerLedger(customer: Customer, sales: Sale[], payments: CustomerPayment[]): LedgerEntry[] {
  const rows: Omit<LedgerEntry, "balance">[] = [];
  for (const s of sales) {
    if (s.customerId !== customer.id) continue;
    rows.push({
      id: s.id,
      date: s.date,
      kind: "sale",
      ref: s.billNo,
      note: `${s.items.length} item${s.items.length === 1 ? "" : "s"}`,
      debit: s.total,
      credit: round2(s.total - creditOf(s)),
    });
  }
  for (const p of payments) {
    if (p.customerId !== customer.id) continue;
    rows.push({
      id: p.id,
      date: p.date,
      kind: "payment",
      ref: p.method.toUpperCase(),
      note: p.note || "Payment received",
      debit: 0,
      credit: p.amount,
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  let balance = customer.openingBalance;
  const ledger: LedgerEntry[] = [
    {
      id: "opening",
      date: rows[0]?.date ?? new Date().toISOString(),
      kind: "opening",
      ref: "",
      note: "Opening balance",
      debit: 0,
      credit: 0,
      balance,
    },
  ];
  for (const row of rows) {
    balance = round2(balance + row.debit - row.credit);
    ledger.push({ ...row, balance });
  }
  return ledger;
}

// ---------------------------------------------------------------- suppliers

export function supplierOutstandingMap(
  suppliers: Supplier[],
  purchases: Purchase[],
  payments: SupplierPayment[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of suppliers) map[s.id] = 0;
  for (const p of purchases) {
    if (p.supplierId in map) map[p.supplierId] += p.total - p.paidAmount;
  }
  for (const p of payments) {
    if (p.supplierId in map) map[p.supplierId] -= p.amount;
  }
  for (const id of Object.keys(map)) map[id] = round2(map[id]);
  return map;
}

// ---------------------------------------------------------------- stock history

type MovementSource = Pick<DemoData, "sales" | "batches" | "purchases" | "adjustments" | "suppliers">;

/** Newest first. The running balance is worked back from the current stock. */
export function stockMovements(product: Product, data: MovementSource): StockMovement[] {
  const rows: Omit<StockMovement, "balanceKg">[] = [];
  for (const s of data.sales) {
    for (const [i, item] of s.items.entries()) {
      if (item.productId !== product.id) continue;
      rows.push({
        id: `${s.id}-${i}`,
        date: s.date,
        type: "sale",
        ref: s.billNo,
        qtyKg: -item.weightKg,
        note: s.customerName,
      });
    }
  }
  for (const b of data.batches) {
    if (b.liveProductId === product.id) {
      rows.push({
        id: `${b.id}-in`,
        date: b.date,
        type: "processing-in",
        ref: b.batchNo,
        qtyKg: -b.liveKg,
        note: `${b.birds} birds sent for processing`,
      });
    }
    const out = b.outputs.find((o) => o.productId === product.id);
    if (out) {
      rows.push({
        id: `${b.id}-out`,
        date: b.date,
        type: "processing-out",
        ref: b.batchNo,
        qtyKg: out.kg,
        note: `Batch yield ${b.yieldPct.toFixed(1)}%`,
      });
    }
  }
  for (const p of data.purchases) {
    if (p.productId !== product.id) continue;
    rows.push({
      id: p.id,
      date: p.date,
      type: "purchase",
      ref: p.purchaseNo,
      qtyKg: p.weightKg,
      note: `${p.birds} birds from ${data.suppliers.find((s) => s.id === p.supplierId)?.name ?? "supplier"}`,
    });
  }
  for (const a of data.adjustments) {
    if (a.productId !== product.id) continue;
    rows.push({ id: a.id, date: a.date, type: a.type, ref: "", qtyKg: a.qtyKg, note: a.reason });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  let balance = product.stockKg;
  return rows.map((row) => {
    const withBalance = { ...row, balanceKg: round3(balance) };
    balance -= row.qtyKg;
    return withBalance;
  });
}

// ---------------------------------------------------------------- daily numbers

export function salesOnDay(sales: Sale[], key: string): Sale[] {
  return sales.filter((s) => dayKey(s.date) === key);
}

/** Yield for a set of batches = total output kg / total live kg. */
export function combinedYield(batches: Batch[]): number | null {
  const live = batches.reduce((s, b) => s + b.liveKg, 0);
  if (live <= 0) return null;
  return round2((batches.reduce((s, b) => s + b.outputKg, 0) / live) * 100);
}

export function yieldOnDay(batches: Batch[], key: string): number | null {
  return combinedYield(batches.filter((b) => dayKey(b.date) === key));
}

type CashSource = Pick<DemoData, "sales" | "customerPayments" | "supplierPayments" | "purchases" | "settings">;

/** Opening float + cash received today - cash paid out today. */
export function cashInHand(data: CashSource, key: string): number {
  let cash = data.settings.shop.openingCash;
  for (const s of data.sales) if (dayKey(s.date) === key) cash += paidBy(s, "cash");
  for (const p of data.customerPayments) if (p.method === "cash" && dayKey(p.date) === key) cash += p.amount;
  for (const p of data.supplierPayments) if (p.method === "cash" && dayKey(p.date) === key) cash -= p.amount;
  for (const p of data.purchases) if (p.paymentMode === "cash" && dayKey(p.date) === key) cash -= p.paidAmount;
  return round2(cash);
}

export function inRange(dateIso: string, fromKey: string, toKey: string): boolean {
  const key = dayKey(dateIso);
  return key >= fromKey && key <= toKey;
}
