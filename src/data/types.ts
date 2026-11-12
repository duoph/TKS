/** Domain types for the whole app. A real backend should return these same shapes. */

export type Role = "owner" | "manager" | "cashier" | "production";

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
}

export interface Category {
  id: string;
  /** Printed with every product, e.g. "SL BL" */
  code: string;
  name: string;
  /** Live birds are tracked by count as well as weight. */
  isLive: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  /** Short code, e.g. "SLBL-CC" */
  code: string;
  retailPrice: number;
  wholesalePrice: number;
  stockKg: number;
  lowStockKg: number;
  /** Only for live birds. */
  stockBirds?: number;
  /** Optional uploaded photo (small data URL). Without it an illustration is shown. */
  imageUrl?: string;
  active: boolean;
}

export type PriceType = "retail" | "wholesale";
export type CustomerType = "retail" | "hotel" | "restaurant" | "caterer";

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  phone: string;
  place: string;
  priceType: PriceType;
  creditLimit: number;
  openingBalance: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  place: string;
}

export type PaymentMethod = "cash" | "upi" | "card" | "credit";

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export interface SaleItem {
  productId: string;
  /** Snapshot at the time of sale so later renames do not change old bills. */
  name: string;
  categoryCode: string;
  weightKg: number;
  rate: number;
  amount: number;
  /** Only for live birds. */
  birds?: number;
}

export interface Sale {
  id: string;
  billNo: string;
  date: string;
  customerId: string | null;
  customerName: string;
  priceType: PriceType;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  roundOff: number;
  total: number;
  payments: Payment[];
  cashier: string;
}

export interface HeldBill {
  id: string;
  heldAt: string;
  customerId: string | null;
  priceType: PriceType;
  items: SaleItem[];
  discount: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  date: string;
  supplierId: string;
  /** Which live bird product was bought. */
  productId: string;
  birds: number;
  weightKg: number;
  ratePerKg: number;
  transportCost: number;
  total: number;
  paidAmount: number;
  paymentMode: "cash" | "bank";
}

export interface BatchOutput {
  productId: string;
  kg: number;
}

/**
 * One processing run. Yield is never a fixed setting: it is calculated from
 * what was actually weighed in this batch.
 * Rule: liveKg = sum(outputs) + wasteKg + lossKg
 */
export interface Batch {
  id: string;
  batchNo: string;
  date: string;
  liveProductId: string;
  birds: number;
  liveKg: number;
  outputs: BatchOutput[];
  wasteKg: number;
  lossKg: number;
  outputKg: number;
  yieldPct: number;
  notes: string;
  createdBy: string;
}

export interface StockAdjustment {
  id: string;
  date: string;
  productId: string;
  type: "wastage" | "adjustment";
  /** Signed: negative reduces stock. Wastage is always negative. */
  qtyKg: number;
  birds?: number;
  reason: string;
  by: string;
}

export interface CustomerPayment {
  id: string;
  date: string;
  customerId: string;
  amount: number;
  method: "cash" | "upi" | "card" | "bank";
  note: string;
}

export interface SupplierPayment {
  id: string;
  date: string;
  supplierId: string;
  amount: number;
  method: "cash" | "bank" | "upi";
  note: string;
}

export type OrderStatus = "pending" | "confirmed" | "ready" | "delivered" | "cancelled";

export interface OrderItem {
  productId: string;
  kg: number;
}

export interface Order {
  id: string;
  orderNo: string;
  createdAt: string;
  customerId: string;
  /** YYYY-MM-DD */
  deliveryDate: string;
  deliveryTime: string;
  items: OrderItem[];
  estimatedAmount: number;
  advance: number;
  status: OrderStatus;
  notes: string;
}

export interface ShopSettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  gstin: string;
  fssai: string;
  upiId: string;
  openingCash: number;
}

export interface BillSettings {
  header: string;
  footer: string;
  showLogo: boolean;
  showCategoryCode: boolean;
  showGstin: boolean;
  showCustomer: boolean;
  paperWidth: "80mm" | "58mm";
}

export interface Settings {
  shop: ShopSettings;
  bill: BillSettings;
}

export interface Counters {
  bill: number;
  purchase: number;
  batch: number;
  order: number;
}

/** Everything the demo keeps. This is what a database would hold. */
export interface DemoData {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  users: User[];
  sales: Sale[];
  purchases: Purchase[];
  batches: Batch[];
  adjustments: StockAdjustment[];
  customerPayments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  orders: Order[];
  heldBills: HeldBill[];
  settings: Settings;
  counters: Counters;
}

/** One line in a product's stock history (derived, not stored). */
export interface StockMovement {
  id: string;
  date: string;
  type: "sale" | "processing-in" | "processing-out" | "purchase" | "wastage" | "adjustment";
  ref: string;
  qtyKg: number;
  balanceKg: number;
  note: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  kind: "opening" | "sale" | "payment" | "purchase";
  ref: string;
  note: string;
  debit: number;
  credit: number;
  balance: number;
}
