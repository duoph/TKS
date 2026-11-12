import { round2, round3 } from "@/lib/format";
import type {
  Batch,
  CustomerPayment,
  DemoData,
  Order,
  Payment,
  Product,
  Purchase,
  Sale,
  SaleItem,
  StockAdjustment,
} from "../types";
import { seedCategories, seedProducts } from "./catalog";
import { seedCustomers, seedSettings, seedSuppliers, seedUsers } from "./people";

/** Small deterministic random generator so the demo data is the same on every reset. */
function createRandom(seed: number) {
  let a = seed;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    chance: (p: number) => next() < p,
    pick: <T>(list: T[]): T => list[Math.floor(next() * list.length)],
    weighted: <T>(list: [T, number][]): T => {
      const total = list.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [item, w] of list) {
        r -= w;
        if (r <= 0) return item;
      }
      return list[list.length - 1][0];
    },
  };
}

const HISTORY_DAYS = 30;

/** How much of each cut a typical batch produces (relative weights). */
const OUTPUT_MIX: [string, number][] = [
  ["wsb-cc", 14], ["wsb-bc", 8], ["wsb-ch", 4], ["wsb-wc", 6], ["wsb-gc", 4],
  ["wsbl-cc", 3], ["wsbl-bc", 2], ["wsbl-ch", 2], ["wsbl-sh", 3],
  ["slb-cc", 12], ["slb-bc", 7], ["slb-ch", 4], ["slb-td", 3], ["slb-wc", 4],
  ["slbl-cc", 4], ["slbl-ch", 2], ["slbl-tk", 2], ["slbl-kb", 1.5], ["slbl-br", 5],
  ["slbl-th", 3], ["slbl-sh", 3], ["slbl-km", 1.5], ["slbl-pc", 1],
  ["pt-mx", 1.5], ["pt-gz", 2], ["pt-ht", 0.8], ["pt-lv", 2],
  ["bn-nk", 2.5], ["bn-jn", 4],
];

/** What walk-in customers buy most. */
const RETAIL_MIX: [string, number][] = [
  ["wsb-cc", 20], ["slb-cc", 18], ["wsb-bc", 8], ["slb-bc", 8], ["wsb-wc", 6],
  ["slb-wc", 5], ["wsb-ch", 4], ["slb-ch", 4], ["slbl-br", 6], ["slbl-cc", 5],
  ["slbl-th", 3], ["slbl-km", 2], ["slbl-pc", 2], ["slb-td", 2], ["wsb-gc", 2],
  ["pt-lv", 3], ["pt-gz", 2], ["pt-mx", 2], ["bn-nk", 2], ["bn-jn", 2],
  ["lv-sb", 3], ["lv-bb", 2], ["slbl-tk", 1], ["wsbl-cc", 1],
];

/** What hotels, restaurants and caterers buy most. */
const WHOLESALE_MIX: [string, number][] = [
  ["wsb-bc", 14], ["slb-bc", 12], ["wsb-cc", 12], ["slb-cc", 10], ["slbl-sh", 8],
  ["wsbl-sh", 7], ["slbl-br", 7], ["slbl-cc", 5], ["slbl-ch", 4], ["wsb-ch", 5],
  ["slb-ch", 4], ["slb-td", 4], ["wsb-gc", 4], ["slbl-tk", 3], ["slbl-kb", 2],
  ["slbl-th", 3], ["wsbl-bc", 2], ["wsbl-ch", 2], ["slbl-km", 2], ["bn-jn", 2],
  ["pt-mx", 1],
];

function atTime(day: Date, hour: number, minute: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0);
}

function padNo(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(5, "0")}`;
}

/**
 * Builds the full demo data set: master data plus the last 30 days of
 * purchases, processing batches, sales and payments, ending "now".
 */
export function buildDemoData(now: Date = new Date()): DemoData {
  const rnd = createRandom(20261110);
  const products: Product[] = seedProducts.map((p) => ({ ...p }));
  const productById = new Map(products.map((p) => [p.id, p]));
  const categoryCode = new Map(seedCategories.map((c) => [c.id, c.code]));
  const cashiers = seedUsers.filter((u) => u.role === "cashier").map((u) => u.name);
  const business = seedCustomers.filter((c) => c.type !== "retail");
  const regulars = seedCustomers.filter((c) => c.type === "retail");

  const sales: Sale[] = [];
  const purchases: Purchase[] = [];
  const batches: Batch[] = [];
  const customerPayments: CustomerPayment[] = [];
  const adjustments: StockAdjustment[] = [];
  const counters = { bill: 0, purchase: 0, batch: 0, order: 0 };

  const owed = new Map<string, number>(seedCustomers.map((c) => [c.id, c.openingBalance]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const makeItem = (productId: string, weightKg: number, wholesale: boolean, birds?: number): SaleItem => {
    const p = productById.get(productId)!;
    const rate = wholesale ? p.wholesalePrice : p.retailPrice;
    return {
      productId,
      name: p.name,
      categoryCode: categoryCode.get(p.categoryId) ?? "",
      weightKg,
      rate,
      amount: round2(weightKg * rate),
      birds,
    };
  };

  const pickDistinct = (mix: [string, number][], count: number): string[] => {
    const chosen = new Set<string>();
    while (chosen.size < count) chosen.add(rnd.weighted(mix));
    return [...chosen];
  };

  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
    const isToday = d === 0;
    const weekday = day.getDay();

    // ---- Purchases of live birds (roughly every second day) ----
    if (d % 2 === 1 || d % 7 === 3) {
      const small = rnd.chance(0.6);
      const birds = rnd.int(350, 650);
      const avg = small ? rnd.between(1.75, 2.05) : rnd.between(2.4, 2.9);
      const weightKg = Math.round(birds * avg * 10) / 10;
      const ratePerKg = rnd.int(96, 112);
      const transportCost = rnd.int(18, 44) * 50;
      const total = round2(weightKg * ratePerKg + transportCost);
      const paidAmount = d > 8 ? total : d > 3 ? Math.floor(total / 2000) * 1000 : 0;
      counters.purchase++;
      purchases.push({
        id: `pur-${counters.purchase}`,
        purchaseNo: padNo("P", counters.purchase),
        date: atTime(day, 5, rnd.int(20, 59)).toISOString(),
        supplierId: seedSuppliers[counters.purchase % seedSuppliers.length].id,
        productId: small ? "lv-sb" : "lv-bb",
        birds,
        weightKg,
        ratePerKg,
        transportCost,
        total,
        paidAmount,
        paymentMode: "bank",
      });
    }

    // ---- Processing batches: actual weighed output, so yield differs every day ----
    const batchCount = !isToday && d % 5 === 2 ? 2 : 1;
    for (let b = 0; b < batchCount; b++) {
      const small = rnd.chance(0.55);
      const birds = rnd.int(140, 240);
      const avg = small ? rnd.between(1.8, 2.05) : rnd.between(2.45, 2.85);
      const liveKg = Math.round(birds * avg * 10) / 10;
      const targetYield = rnd.between(68.3, 73.7);
      const raw = OUTPUT_MIX.filter(([, w]) => w >= 3 || rnd.chance(0.75)).map(
        ([id, w]) => [id, w * rnd.between(0.6, 1.4)] as [string, number],
      );
      const rawTotal = raw.reduce((s, [, w]) => s + w, 0);
      const outputs = raw.map(([productId, w]) => ({
        productId,
        kg: Math.round(((liveKg * targetYield) / 100) * (w / rawTotal) * 100) / 100,
      }));
      const outputKg = round3(outputs.reduce((s, o) => s + o.kg, 0));
      const lossKg = round3(liveKg * rnd.between(0.015, 0.035));
      const wasteKg = round3(liveKg - outputKg - lossKg);
      let when = b === 0 ? atTime(day, rnd.int(6, 7), rnd.int(0, 59)) : atTime(day, 14, rnd.int(0, 59));
      if (when > now) when = new Date(now.getTime() - 5 * 60000);
      counters.batch++;
      batches.push({
        id: `bat-${counters.batch}`,
        batchNo: padNo("PB", counters.batch),
        date: when.toISOString(),
        liveProductId: small ? "lv-sb" : "lv-bb",
        birds,
        liveKg,
        outputs,
        wasteKg,
        lossKg,
        outputKg,
        yieldPct: round2((outputKg / liveKg) * 100),
        notes: "",
        createdBy: "Rajan P.",
      });
    }

    // ---- Sales ----
    let billCount = Math.round(rnd.int(20, 30) * (weekday === 0 ? 1.35 : weekday === 6 ? 1.15 : 1));
    let windowStart = atTime(day, 7, 0).getTime();
    let windowEnd = atTime(day, 20, 30).getTime();
    if (isToday) {
      const elapsed = (now.getTime() - windowStart) / (windowEnd - windowStart);
      billCount = Math.max(8, Math.round(billCount * Math.min(1, Math.max(0, elapsed))));
      windowEnd = Math.min(windowEnd, now.getTime());
      if (windowEnd - windowStart < 2 * 3600000) {
        windowStart = Math.max(today.getTime() + 60000, now.getTime() - 2 * 3600000);
        windowEnd = now.getTime();
      }
    }
    const times = Array.from({ length: billCount }, () => rnd.between(windowStart, windowEnd)).sort(
      (a, b) => a - b,
    );

    for (const time of times) {
      const kind = rnd.weighted<"walkin" | "business" | "regular">([
        ["walkin", 64],
        ["business", 26],
        ["regular", 10],
      ]);
      const customer = kind === "business" ? rnd.pick(business) : kind === "regular" ? rnd.pick(regulars) : null;
      const wholesale = customer?.priceType === "wholesale";
      const items: SaleItem[] = [];

      if (wholesale) {
        for (const id of pickDistinct(WHOLESALE_MIX, rnd.int(2, 5))) {
          items.push(makeItem(id, Math.round(rnd.between(2, 16) * 20) / 20, true));
        }
      } else {
        for (const id of pickDistinct(RETAIL_MIX, rnd.weighted([[1, 5], [2, 4], [3, 1]]))) {
          if (id.startsWith("lv-")) {
            const birds = rnd.int(1, 3);
            const avg = id === "lv-sb" ? rnd.between(1.75, 2.05) : rnd.between(2.4, 2.85);
            items.push(makeItem(id, round3(Math.round(birds * avg * 200) / 200), false, birds));
          } else if (id.endsWith("-wc")) {
            items.push(makeItem(id, Math.round(rnd.between(1.1, 1.8) * 200) / 200, false));
          } else {
            items.push(makeItem(id, Math.round(rnd.between(0.35, 2.2) * 200) / 200, false));
          }
        }
      }

      const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
      const discount = wholesale ? (rnd.chance(0.15) ? rnd.int(2, 10) * 10 : 0) : rnd.chance(0.05) ? 5 : 0;
      const total = Math.round(subtotal - discount);
      const roundOff = round2(total - (subtotal - discount));

      let payments: Payment[];
      if (kind === "business") {
        const mode = rnd.weighted<"credit" | "upi" | "cash" | "split">([
          ["credit", 55],
          ["upi", 25],
          ["cash", 14],
          ["split", 6],
        ]);
        if (mode === "split") {
          const cashPart = Math.round(total / 200) * 100;
          payments = [
            { method: "cash", amount: cashPart },
            { method: "credit", amount: total - cashPart },
          ];
        } else payments = [{ method: mode, amount: total }];
      } else if (kind === "regular") {
        payments = [{ method: rnd.weighted([["upi", 45], ["cash", 35], ["credit", 20]]), amount: total }];
      } else {
        payments = [{ method: rnd.weighted([["cash", 50], ["upi", 40], ["card", 10]]), amount: total }];
      }

      if (customer) {
        const credit = payments.filter((p) => p.method === "credit").reduce((s, p) => s + p.amount, 0);
        owed.set(customer.id, (owed.get(customer.id) ?? 0) + credit);
      }

      counters.bill++;
      sales.push({
        id: `sale-${counters.bill}`,
        billNo: padNo("B", counters.bill),
        date: new Date(time).toISOString(),
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? "Walk-in customer",
        priceType: wholesale ? "wholesale" : "retail",
        items,
        subtotal,
        discount,
        roundOff,
        total,
        payments,
        cashier: rnd.pick(cashiers),
      });
    }

    // ---- Customers settle part of their credit about once a week ----
    if (d >= 2) {
      seedCustomers.forEach((c, i) => {
        const due = owed.get(c.id) ?? 0;
        if ((d + i) % 6 !== 0 || due < 500) return;
        const amount = Math.max(500, Math.floor((due * rnd.between(0.6, 1)) / 100) * 100);
        owed.set(c.id, due - amount);
        customerPayments.push({
          id: `cp-${customerPayments.length + 1}`,
          // After the day's last bill, so the ledger balance never dips below zero.
          date: atTime(day, 21, rnd.int(0, 45)).toISOString(),
          customerId: c.id,
          amount,
          method: rnd.weighted([["bank", 45], ["upi", 35], ["cash", 20]]),
          note: "Payment received",
        });
      });
    }

    // ---- Occasional wastage entries ----
    if (d % 6 === 4) {
      const p = productById.get(rnd.pick(["wsb-cc", "slb-cc", "pt-lv", "slbl-km", "bn-jn", "wsb-wc"]))!;
      adjustments.push({
        id: `adj-${adjustments.length + 1}`,
        date: atTime(day, 20, rnd.int(30, 59)).toISOString(),
        productId: p.id,
        type: "wastage",
        qtyKg: -Math.round(rnd.between(0.4, 2.2) * 100) / 100,
        reason: rnd.pick(["Unsold at day end", "Quality check reject", "Cold storage issue", "Damaged while packing"]),
        by: "Anoop Menon",
      });
    }
  }

  // ---- Advance orders around today ----
  const orderPlan: [string, number, string, [string, number][], number, Order["status"], string][] = [
    ["c-07", -1, "07:00", [["wsb-bc", 45], ["slbl-br", 12]], 5000, "delivered", "Wedding reception at Ramanattukara"],
    ["c-02", -1, "09:30", [["slb-bc", 20], ["slbl-sh", 8]], 0, "delivered", ""],
    ["c-01", 0, "10:30", [["wsb-bc", 25], ["slb-cc", 15], ["slbl-tk", 5]], 0, "ready", "Deliver to kitchen back gate"],
    ["c-06", 0, "16:00", [["slbl-sh", 18], ["wsbl-sh", 10]], 2000, "confirmed", ""],
    ["c-08", 1, "06:30", [["wsb-bc", 60], ["wsb-cc", 30], ["pt-lv", 5]], 10000, "confirmed", "Sadhya for 400 people"],
    ["c-11", 1, "08:00", [["slb-bc", 35], ["slb-td", 12]], 5000, "pending", "Call before delivery"],
    ["c-04", 2, "09:00", [["wsb-gc", 20], ["slbl-kb", 6]], 0, "pending", ""],
    ["c-13", 2, "11:00", [["slb-cc", 4], ["slbl-km", 1.5]], 500, "confirmed", "House warming"],
    ["c-07", 4, "06:00", [["wsb-bc", 80], ["slb-cc", 25], ["slbl-br", 15]], 15000, "pending", "Hall booking at Feroke"],
    ["c-05", -2, "10:00", [["wsb-bc", 30]], 0, "cancelled", "Customer cancelled"],
  ];
  const orders: Order[] = orderPlan.map(([customerId, offset, deliveryTime, lines, advance, status, notes]) => {
    counters.order++;
    const delivery = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const created = new Date(delivery.getTime() - rnd.int(2, 4) * 86400000 + rnd.int(9, 17) * 3600000);
    const customer = seedCustomers.find((c) => c.id === customerId)!;
    const items = lines.map(([productId, kg]) => ({ productId, kg }));
    const estimatedAmount = round2(
      items.reduce((s, i) => {
        const p = productById.get(i.productId)!;
        return s + i.kg * (customer.priceType === "wholesale" ? p.wholesalePrice : p.retailPrice);
      }, 0),
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      id: `ord-${counters.order}`,
      orderNo: padNo("O", counters.order),
      createdAt: created.toISOString(),
      customerId,
      deliveryDate: `${delivery.getFullYear()}-${pad(delivery.getMonth() + 1)}-${pad(delivery.getDate())}`,
      deliveryTime,
      items,
      estimatedAmount,
      advance,
      status,
      notes,
    };
  });

  const newestFirst = <T extends { date: string }>(list: T[]) =>
    [...list].sort((a, b) => b.date.localeCompare(a.date));

  return {
    categories: seedCategories.map((c) => ({ ...c })),
    products,
    customers: seedCustomers.map((c) => ({ ...c })),
    suppliers: seedSuppliers.map((s) => ({ ...s })),
    users: seedUsers.map((u) => ({ ...u })),
    sales: newestFirst(sales),
    purchases: newestFirst(purchases),
    batches: newestFirst(batches),
    adjustments: newestFirst(adjustments),
    customerPayments: newestFirst(customerPayments),
    supplierPayments: [],
    orders,
    heldBills: [],
    settings: structuredClone(seedSettings),
    counters,
  };
}
