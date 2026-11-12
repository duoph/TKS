"use client";

/**
 * Data access layer.
 *
 * Every read and write in the app goes through this file. Today the functions
 * work on the in-browser store. To connect a real backend, keep the function
 * names and types and replace the bodies with API calls.
 */

import { round2, round3 } from "@/lib/format";
import { reseed, useStore } from "./store";
import type {
  Batch,
  BatchOutput,
  Category,
  Customer,
  CustomerPayment,
  HeldBill,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PriceType,
  Product,
  Purchase,
  Role,
  Sale,
  SaleItem,
  Settings,
  StockAdjustment,
  Supplier,
  SupplierPayment,
  User,
} from "./types";

const get = useStore.getState;
const set = useStore.setState;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function docNo(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(5, "0")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------- reads

export const getCategories = (): Category[] => get().categories;
export const getProducts = (): Product[] => get().products;
export const getProduct = (id: string): Product | undefined => get().products.find((p) => p.id === id);
export const getCustomers = (): Customer[] => get().customers;
export const getSuppliers = (): Supplier[] => get().suppliers;
export const getSales = (): Sale[] => get().sales;
export const getPurchases = (): Purchase[] => get().purchases;
export const getBatches = (): Batch[] => get().batches;
export const getOrders = (): Order[] => get().orders;
export const getUsers = (): User[] => get().users;
export const getSettings = (): Settings => get().settings;

// ---------------------------------------------------------------- session

/** Demo login: any password works. Signs in as the first active user with the role. */
export function login(role: Role): User {
  const user =
    get().users.find((u) => u.role === role && u.active) ??
    ({ id: `u-${role}`, name: role, username: role, role, active: true } satisfies User);
  set({ session: user });
  return user;
}

export function logout(): void {
  set({ session: null });
}

// ---------------------------------------------------------------- sales (POS)

export interface CreateSaleInput {
  customerId: string | null;
  priceType: PriceType;
  items: SaleItem[];
  discount: number;
  payments: Payment[];
}

/** Bill totals. The total is rounded to the nearest rupee and the difference shown as round-off. */
export function calcBillTotals(items: SaleItem[], discount: number) {
  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  const safeDiscount = Math.min(Math.max(0, discount || 0), subtotal);
  const total = Math.round(subtotal - safeDiscount);
  const roundOff = round2(total - (subtotal - safeDiscount));
  return { subtotal, discount: safeDiscount, roundOff, total };
}

/** Saves a bill and reduces stock for every line. */
export function createSale(input: CreateSaleInput): Sale {
  const state = get();
  if (input.items.length === 0) throw new Error("Add at least one item to the bill.");

  const needed = new Map<string, number>();
  for (const item of input.items) {
    needed.set(item.productId, (needed.get(item.productId) ?? 0) + item.weightKg);
  }
  for (const [productId, weight] of needed) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) throw new Error("A product on this bill no longer exists.");
    if (weight > product.stockKg + 0.0005) {
      throw new Error(`Only ${product.stockKg.toFixed(3)} kg of ${product.name} in stock.`);
    }
  }

  const totals = calcBillTotals(input.items, input.discount);
  const paid = round2(input.payments.reduce((s, p) => s + p.amount, 0));
  if (Math.abs(paid - totals.total) > 0.01) throw new Error("Payments do not match the bill total.");
  if (input.payments.some((p) => p.method === "credit" && p.amount > 0) && !input.customerId) {
    throw new Error("Select a customer to sell on credit.");
  }

  const customer = state.customers.find((c) => c.id === input.customerId);
  const billNumber = state.counters.bill + 1;
  const sale: Sale = {
    id: newId("sale"),
    billNo: docNo("B", billNumber),
    date: nowIso(),
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? "Walk-in customer",
    priceType: input.priceType,
    items: input.items,
    ...totals,
    payments: input.payments.filter((p) => p.amount > 0),
    cashier: state.session?.name ?? "Cashier",
  };

  set({
    sales: [sale, ...state.sales],
    counters: { ...state.counters, bill: billNumber },
    products: state.products.map((p) => {
      const weight = needed.get(p.id);
      if (!weight) return p;
      const birds = input.items
        .filter((i) => i.productId === p.id)
        .reduce((s, i) => s + (i.birds ?? 0), 0);
      return {
        ...p,
        stockKg: Math.max(0, round3(p.stockKg - weight)),
        stockBirds: p.stockBirds === undefined ? undefined : Math.max(0, p.stockBirds - birds),
      };
    }),
  });
  return sale;
}

export function holdBill(bill: Omit<HeldBill, "id" | "heldAt">): HeldBill {
  const held: HeldBill = { ...bill, id: newId("hold"), heldAt: nowIso() };
  set({ heldBills: [held, ...get().heldBills] });
  return held;
}

export function removeHeldBill(id: string): void {
  set({ heldBills: get().heldBills.filter((b) => b.id !== id) });
}

// ---------------------------------------------------------------- purchases

export interface CreatePurchaseInput {
  supplierId: string;
  productId: string;
  birds: number;
  weightKg: number;
  ratePerKg: number;
  transportCost: number;
  paidAmount: number;
  paymentMode: "cash" | "bank";
}

/** Saves a live bird purchase and adds the birds and weight to live stock. */
export function createPurchase(input: CreatePurchaseInput): Purchase {
  const state = get();
  const number = state.counters.purchase + 1;
  const total = round2(input.weightKg * input.ratePerKg + input.transportCost);
  const purchase: Purchase = {
    id: newId("pur"),
    purchaseNo: docNo("P", number),
    date: nowIso(),
    ...input,
    weightKg: round3(input.weightKg),
    total,
    paidAmount: Math.min(input.paidAmount, total),
  };
  set({
    purchases: [purchase, ...state.purchases],
    counters: { ...state.counters, purchase: number },
    products: state.products.map((p) =>
      p.id === input.productId
        ? { ...p, stockKg: round3(p.stockKg + input.weightKg), stockBirds: (p.stockBirds ?? 0) + input.birds }
        : p,
    ),
  });
  return purchase;
}

// ---------------------------------------------------------------- processing

export interface CreateBatchInput {
  liveProductId: string;
  birds: number;
  liveKg: number;
  outputs: BatchOutput[];
  wasteKg: number;
  lossKg: number;
  notes: string;
}

/** Yield and balance for a batch, from the actual weights entered. */
export function calcBatch(liveKg: number, outputs: BatchOutput[], wasteKg: number, lossKg: number) {
  const outputKg = round3(outputs.reduce((s, o) => s + (o.kg || 0), 0));
  const balanceKg = round3(liveKg - outputKg - (wasteKg || 0) - (lossKg || 0));
  const yieldPct = liveKg > 0 ? round2((outputKg / liveKg) * 100) : 0;
  return { outputKg, balanceKg, yieldPct };
}

/** Saves a processing batch: reduces live stock, adds cut stock. */
export function createBatch(input: CreateBatchInput): Batch {
  const state = get();
  const live = state.products.find((p) => p.id === input.liveProductId);
  if (!live) throw new Error("Choose the bird type used.");
  if (input.liveKg > live.stockKg + 0.0005) {
    throw new Error(`Only ${live.stockKg.toFixed(3)} kg of ${live.name} in live stock.`);
  }
  if (input.birds > (live.stockBirds ?? 0)) {
    throw new Error(`Only ${live.stockBirds ?? 0} ${live.name} birds in live stock.`);
  }
  const outputs = input.outputs.filter((o) => o.kg > 0).map((o) => ({ ...o, kg: round3(o.kg) }));
  if (outputs.length === 0) throw new Error("Enter the weighed output for at least one product.");
  const { outputKg, balanceKg, yieldPct } = calcBatch(input.liveKg, outputs, input.wasteKg, input.lossKg);
  if (Math.abs(balanceKg) > 0.005) {
    throw new Error("Input must equal outputs + waste + loss. Clear the balance first.");
  }

  const number = state.counters.batch + 1;
  const batch: Batch = {
    id: newId("bat"),
    batchNo: docNo("PB", number),
    date: nowIso(),
    liveProductId: input.liveProductId,
    birds: input.birds,
    liveKg: round3(input.liveKg),
    outputs,
    wasteKg: round3(input.wasteKg),
    lossKg: round3(input.lossKg),
    outputKg,
    yieldPct,
    notes: input.notes,
    createdBy: state.session?.name ?? "Production",
  };
  const added = new Map(outputs.map((o) => [o.productId, o.kg]));
  set({
    batches: [batch, ...state.batches],
    counters: { ...state.counters, batch: number },
    products: state.products.map((p) => {
      if (p.id === input.liveProductId) {
        return {
          ...p,
          stockKg: Math.max(0, round3(p.stockKg - input.liveKg)),
          stockBirds: Math.max(0, (p.stockBirds ?? 0) - input.birds),
        };
      }
      const kg = added.get(p.id);
      return kg ? { ...p, stockKg: round3(p.stockKg + kg) } : p;
    }),
  });
  return batch;
}

// ---------------------------------------------------------------- inventory

export interface CreateAdjustmentInput {
  productId: string;
  type: "wastage" | "adjustment";
  /** Signed. Wastage is stored as a negative number. */
  qtyKg: number;
  birds?: number;
  reason: string;
}

export function createAdjustment(input: CreateAdjustmentInput): StockAdjustment {
  const state = get();
  const product = state.products.find((p) => p.id === input.productId);
  if (!product) throw new Error("Choose a product.");
  const qtyKg = round3(input.type === "wastage" ? -Math.abs(input.qtyKg) : input.qtyKg);
  const birds = input.type === "wastage" ? -Math.abs(input.birds ?? 0) : (input.birds ?? 0);
  if (product.stockKg + qtyKg < -0.0005) {
    throw new Error(`Only ${product.stockKg.toFixed(3)} kg of ${product.name} in stock.`);
  }
  const adjustment: StockAdjustment = {
    id: newId("adj"),
    date: nowIso(),
    productId: input.productId,
    type: input.type,
    qtyKg,
    birds: birds || undefined,
    reason: input.reason,
    by: state.session?.name ?? "Staff",
  };
  set({
    adjustments: [adjustment, ...state.adjustments],
    products: state.products.map((p) =>
      p.id === input.productId
        ? {
            ...p,
            stockKg: Math.max(0, round3(p.stockKg + qtyKg)),
            stockBirds: p.stockBirds === undefined ? undefined : Math.max(0, p.stockBirds + birds),
          }
        : p,
    ),
  });
  return adjustment;
}

// ---------------------------------------------------------------- master data

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export type ProductInput = Omit<Product, "id" | "stockKg" | "stockBirds" | "active"> & { id?: string };

export function saveProduct(input: ProductInput): Product {
  const state = get();
  const existing = state.products.find((p) => p.id === input.id);
  const category = state.categories.find((c) => c.id === input.categoryId);
  const product: Product = existing
    ? { ...existing, ...input, id: existing.id }
    : {
        ...input,
        id: newId("prod"),
        stockKg: 0,
        stockBirds: category?.isLive ? 0 : undefined,
        active: true,
      };
  set({ products: upsert(state.products, product) });
  return product;
}

export function setProductActive(id: string, active: boolean): void {
  set({ products: get().products.map((p) => (p.id === id ? { ...p, active } : p)) });
}

export function saveCategory(input: Omit<Category, "id" | "isLive"> & { id?: string }): Category {
  const state = get();
  const existing = state.categories.find((c) => c.id === input.id);
  const category: Category = existing
    ? { ...existing, ...input, id: existing.id }
    : { ...input, id: newId("cat"), isLive: false };
  set({ categories: upsert(state.categories, category) });
  return category;
}

export function saveCustomer(input: Omit<Customer, "id"> & { id?: string }): Customer {
  const customer: Customer = { ...input, id: input.id ?? newId("c") };
  set({ customers: upsert(get().customers, customer) });
  return customer;
}

export function saveSupplier(input: Omit<Supplier, "id"> & { id?: string }): Supplier {
  const supplier: Supplier = { ...input, id: input.id ?? newId("s") };
  set({ suppliers: upsert(get().suppliers, supplier) });
  return supplier;
}

export function saveUser(input: Omit<User, "id"> & { id?: string }): User {
  const state = get();
  const user: User = { ...input, id: input.id ?? newId("u") };
  set({
    users: upsert(state.users, user),
    session: state.session?.id === user.id ? user : state.session,
  });
  return user;
}

export function updateSettings(patch: { shop?: Partial<Settings["shop"]>; bill?: Partial<Settings["bill"]> }): void {
  const { settings } = get();
  set({
    settings: {
      shop: { ...settings.shop, ...patch.shop },
      bill: { ...settings.bill, ...patch.bill },
    },
  });
}

// ---------------------------------------------------------------- payments

export function recordCustomerPayment(input: Omit<CustomerPayment, "id" | "date">): CustomerPayment {
  const payment: CustomerPayment = { ...input, id: newId("cp"), date: nowIso() };
  set({ customerPayments: [payment, ...get().customerPayments] });
  return payment;
}

export function recordSupplierPayment(input: Omit<SupplierPayment, "id" | "date">): SupplierPayment {
  const payment: SupplierPayment = { ...input, id: newId("sp"), date: nowIso() };
  set({ supplierPayments: [payment, ...get().supplierPayments] });
  return payment;
}

// ---------------------------------------------------------------- advance orders

export interface CreateOrderInput {
  customerId: string;
  deliveryDate: string;
  deliveryTime: string;
  items: OrderItem[];
  advance: number;
  notes: string;
}

export function createOrder(input: CreateOrderInput): Order {
  const state = get();
  const customer = state.customers.find((c) => c.id === input.customerId);
  if (!customer) throw new Error("Choose a customer.");
  const number = state.counters.order + 1;
  const estimatedAmount = round2(
    input.items.reduce((s, i) => {
      const p = state.products.find((x) => x.id === i.productId);
      if (!p) return s;
      return s + i.kg * (customer.priceType === "wholesale" ? p.wholesalePrice : p.retailPrice);
    }, 0),
  );
  const order: Order = {
    id: newId("ord"),
    orderNo: docNo("O", number),
    createdAt: nowIso(),
    ...input,
    estimatedAmount,
    status: "pending",
  };
  set({ orders: [order, ...state.orders], counters: { ...state.counters, order: number } });
  return order;
}

export function setOrderStatus(id: string, status: OrderStatus): void {
  set({ orders: get().orders.map((o) => (o.id === id ? { ...o, status } : o)) });
}

// ---------------------------------------------------------------- demo

/** Restores the original dummy data. */
export function resetDemoData(): void {
  reseed();
}
