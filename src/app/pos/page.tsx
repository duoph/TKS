"use client";

import { ArrowLeft, Clock, PackageSearch, Search, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle, UserMenu } from "@/components/layout/header-controls";
import { CartPanel } from "@/components/pos/cart-panel";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { WeightDialog, type WeighTarget } from "@/components/pos/weight-dialog";
import { EmptyState } from "@/components/shared/page-header";
import { Logo } from "@/components/shared/logo";
import { ProductImage } from "@/components/shared/product-image";
import { ReceiptDialog } from "@/components/shared/receipt";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { calcBillTotals, createSale, holdBill, removeHeldBill } from "@/data/api";
import { customerOutstandingMap, isLowStock, productLabel } from "@/data/selectors";
import { useStore } from "@/data/store";
import type { HeldBill, Payment, PriceType, Product, Sale, SaleItem } from "@/data/types";
import { fmtTime, inr, inrWhole, kg, round2 } from "@/lib/format";
import { canAccess, navForRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function rateFor(product: Product, priceType: PriceType): number {
  return priceType === "wholesale" ? product.wholesalePrice : product.retailPrice;
}

export default function PosPage() {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.session);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const customers = useStore((s) => s.customers);
  const sales = useStore((s) => s.sales);
  const customerPayments = useStore((s) => s.customerPayments);
  const heldBills = useStore((s) => s.heldBills);
  const shop = useStore((s) => s.settings.shop);

  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [priceType, setPriceType] = useState<PriceType>("retail");
  const [discountText, setDiscountText] = useState("");
  const [weighing, setWeighing] = useState<(WeighTarget & { editIndex?: number }) | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allowed = !!session && canAccess(session.role, "/pos");
  useEffect(() => {
    if (!hydrated) return;
    if (!session) router.replace("/login");
    else if (!allowed) router.replace(navForRole(session.role)[0]?.href ?? "/login");
  }, [hydrated, session, allowed, router]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const totals = useMemo(() => calcBillTotals(items, Number(discountText) || 0), [items, discountText]);
  const customer = customers.find((c) => c.id === customerId) ?? null;
  const outstanding = useMemo(
    () => (customerId ? (customerOutstandingMap(customers, sales, customerPayments)[customerId] ?? 0) : 0),
    [customerId, customers, sales, customerPayments],
  );

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.active) return false;
      if (term) {
        const category = categoryById.get(p.categoryId);
        return `${category?.code ?? ""} ${p.name} ${p.code}`.toLowerCase().includes(term);
      }
      return categoryId === "all" || p.categoryId === categoryId;
    });
  }, [products, search, categoryId, categoryById]);

  const repriced = useCallback(
    (list: SaleItem[], type: PriceType): SaleItem[] =>
      list.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return item;
        const rate = rateFor(product, type);
        return { ...item, rate, amount: round2(item.weightKg * rate) };
      }),
    [products],
  );

  const changePriceType = (type: PriceType) => {
    setPriceType(type);
    setItems((list) => repriced(list, type));
  };

  const changeCustomer = (id: string | null) => {
    setCustomerId(id);
    const next = customers.find((c) => c.id === id);
    if (next && next.priceType !== priceType) {
      changePriceType(next.priceType);
      toast.info(`${next.priceType === "wholesale" ? "Wholesale" : "Retail"} prices applied for ${next.name}`);
    }
  };

  const openWeigh = (product: Product, editIndex?: number) => {
    const inCart = items.reduce(
      (s, item, i) => (item.productId === product.id && i !== editIndex ? s + item.weightKg : s),
      0,
    );
    const editing = editIndex === undefined ? undefined : items[editIndex];
    setWeighing({
      product,
      label: productLabel(product, categories),
      category: categoryById.get(product.categoryId),
      isLive: !!categoryById.get(product.categoryId)?.isLive,
      rate: rateFor(product, priceType),
      availableKg: Math.max(0, round2(product.stockKg * 1000 - inCart * 1000) / 1000),
      initialWeight: editing?.weightKg,
      initialBirds: editing?.birds,
      editIndex,
    });
  };

  const confirmWeight = (weightKg: number, birds?: number) => {
    if (!weighing) return;
    const { product, rate, editIndex } = weighing;
    const line: SaleItem = {
      productId: product.id,
      name: product.name,
      categoryCode: categoryById.get(product.categoryId)?.code ?? "",
      weightKg,
      rate,
      amount: round2(weightKg * rate),
      birds,
    };
    setItems((list) => (editIndex === undefined ? [...list, line] : list.map((x, i) => (i === editIndex ? line : x))));
    setWeighing(null);
    setSearch("");
  };

  const clearBill = () => {
    setItems([]);
    setCustomerId(null);
    setPriceType("retail");
    setDiscountText("");
  };

  const holdCurrent = useCallback(() => {
    if (items.length === 0) return;
    holdBill({ customerId, priceType, items, discount: Number(discountText) || 0 });
    setItems([]);
    setCustomerId(null);
    setPriceType("retail");
    setDiscountText("");
    setCartOpen(false);
    toast.success("Bill put on hold");
  }, [items, customerId, priceType, discountText]);

  const resume = (bill: HeldBill) => {
    if (items.length > 0) holdBill({ customerId, priceType, items, discount: Number(discountText) || 0 });
    removeHeldBill(bill.id);
    setItems(repriced(bill.items, bill.priceType));
    setCustomerId(customers.some((c) => c.id === bill.customerId) ? bill.customerId : null);
    setPriceType(bill.priceType);
    setDiscountText(bill.discount ? String(bill.discount) : "");
    setHeldOpen(false);
    toast.success(items.length > 0 ? "Held bill resumed. Your current bill was put on hold." : "Held bill resumed");
  };

  const completeSale = (payments: Payment[], tendered?: number) => {
    try {
      const sale = createSale({ customerId, priceType, items, discount: totals.discount, payments });
      setPayOpen(false);
      setCartOpen(false);
      clearBill();
      setReceipt(sale);
      const change = tendered ? round2(tendered - sale.total) : 0;
      toast.success(`Bill ${sale.billNo} saved`, {
        description: change > 0 ? `Return change ${inr(change)}` : "Stock updated",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the bill");
    }
  };

  // Keyboard: "/" or F2 = search, F9 = pay, F4 = hold.
  const dialogOpen = !!weighing || payOpen || heldOpen || !!receipt || cartOpen;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen) return;
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
      if (e.key === "F2" || (e.key === "/" && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (items.length > 0) setPayOpen(true);
        else toast.info("Add an item before taking payment");
      } else if (e.key === "F4") {
        e.preventDefault();
        holdCurrent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen, items.length, holdCurrent]);

  if (!hydrated || !session || !allowed) {
    return (
      <div className="grid h-dvh gap-4 p-4 md:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="hidden rounded-xl md:block" />
      </div>
    );
  }

  const backHref = navForRole(session.role).find((n) => n.href !== "/pos")?.href;
  const cartProps = {
    items,
    totals,
    customers,
    customerId,
    priceType,
    discountText,
    onCustomerChange: changeCustomer,
    onPriceTypeChange: changePriceType,
    onDiscountChange: setDiscountText,
    onEditItem: (index: number) => {
      const product = products.find((p) => p.id === items[index].productId);
      if (product) openWeigh(product, index);
    },
    onRemoveItem: (index: number) => setItems((list) => list.filter((_, i) => i !== index)),
    onClear: clearBill,
    onHold: holdCurrent,
    onPay: () => setPayOpen(true),
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        {backHref && (
          <Link href={backHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}>
            <ArrowLeft aria-hidden /> <span className="hidden sm:inline">Back office</span>
          </Link>
        )}
        <Logo className="ml-1 size-9" />
        <div className="min-w-0 px-1">
          <p className="truncate text-sm font-semibold leading-tight">{shop.name}</p>
          <p className="text-xs text-muted-foreground">POS billing</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="lg" className="gap-2" onClick={() => setHeldOpen(true)}>
            <Clock aria-hidden /> <span className="hidden sm:inline">Held bills</span>
            {heldBills.length > 0 && <Badge>{heldBills.length}</Badge>}
          </Button>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_400px]">
        <section className="flex min-h-0 flex-col" aria-label="Products">
          <div className="grid gap-2 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                ref={searchRef}
                type="search"
                aria-label="Search products"
                placeholder="Search product or code   ( / )"
                className="h-12 pr-10 pl-10 text-base md:text-base"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" role="tablist" aria-label="Categories">
              {[{ id: "all", code: "ALL", name: "All products" }, ...categories].map((c) => {
                const active = !search && categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    title={c.name}
                    onClick={() => {
                      setCategoryId(c.id);
                      setSearch("");
                    }}
                    className={cn(
                      "h-12 shrink-0 rounded-lg border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                    )}
                  >
                    {c.code}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-24 md:pb-3">
            {visibleProducts.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title="No products found"
                description={search ? `Nothing matches "${search}".` : "This category has no active products."}
              >
                {search && (
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                )}
              </EmptyState>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visibleProducts.map((p) => {
                  const out = p.stockKg <= 0;
                  const low = isLowStock(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      onClick={() => openWeigh(p)}
                      className="relative flex flex-col overflow-hidden rounded-xl border bg-card text-left outline-none transition-colors hover:border-primary hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
                    >
                      <ProductImage product={p} category={categoryById.get(p.categoryId)} className="h-20 w-full shrink-0 lg:h-24" />
                      <span className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-xs font-semibold tracking-wide text-black shadow-sm">
                        {categoryById.get(p.categoryId)?.code}
                      </span>
                      <span className="flex flex-1 flex-col justify-between p-2.5">
                      <span className="block text-base font-semibold leading-tight">{p.name}</span>
                      <span className="mt-2 flex items-end justify-between gap-2">
                        <span className="text-lg font-semibold tabular-nums">
                          {inrWhole(rateFor(p, priceType))}
                          <span className="text-xs font-normal text-muted-foreground"> /kg</span>
                        </span>
                        <span
                          className={cn(
                            "tabular text-xs",
                            out ? "font-semibold text-destructive" : low ? "font-semibold text-warning" : "text-muted-foreground",
                          )}
                        >
                          {out ? "Out of stock" : `${low ? "Low: " : ""}${kg(p.stockKg)}`}
                        </span>
                      </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="hidden min-h-0 border-l bg-card md:block" aria-label="Current bill">
          <CartPanel {...cartProps} />
        </aside>
      </div>

      {/* Phone: the bill opens from a bar at the bottom. */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3 md:hidden">
        <Button className="h-14 w-full justify-between px-4 text-base" onClick={() => setCartOpen(true)}>
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-5!" /> View bill ({items.length})
          </span>
          <span className="tabular-nums">{inr(totals.total)}</span>
        </Button>
      </div>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[88dvh] gap-0 p-0">
          <SheetHeader className="border-b px-3 py-3">
            <SheetTitle>Current bill</SheetTitle>
            <SheetDescription className="sr-only">Items, totals and payment</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <CartPanel {...cartProps} />
          </div>
        </SheetContent>
      </Sheet>

      <WeightDialog target={weighing} priceType={priceType} onConfirm={confirmWeight} onClose={() => setWeighing(null)} />

      <PaymentDialog
        open={payOpen}
        total={totals.total}
        customer={customer}
        outstanding={outstanding}
        upiId={shop.upiId}
        onConfirm={completeSale}
        onClose={() => setPayOpen(false)}
      />

      <Dialog open={heldOpen} onOpenChange={setHeldOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Held bills</DialogTitle>
            <DialogDescription>Bills kept aside while the customer is still shopping.</DialogDescription>
          </DialogHeader>
          {heldBills.length === 0 ? (
            <EmptyState icon={Clock} title="No held bills" description="Use Hold (F4) to keep a bill aside and start another." />
          ) : (
            <ul className="grid max-h-[60dvh] gap-2 overflow-y-auto">
              {heldBills.map((bill) => {
                const billTotals = calcBillTotals(bill.items, bill.discount);
                return (
                  <li key={bill.id} className="flex items-center gap-2 rounded-xl border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {customers.find((c) => c.id === bill.customerId)?.name ?? "Walk-in customer"}
                      </p>
                      <p className="tabular text-sm text-muted-foreground">
                        {bill.items.length} item{bill.items.length === 1 ? "" : "s"} · {inr(billTotals.total)} · held{" "}
                        {fmtTime(bill.heldAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="size-11"
                      aria-label="Delete held bill"
                      onClick={() => {
                        removeHeldBill(bill.id);
                        toast.success("Held bill deleted");
                      }}
                    >
                      <X />
                    </Button>
                    <Button className="h-11 px-4" onClick={() => resume(bill)}>
                      Resume
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <ReceiptDialog sale={receipt} onClose={() => setReceipt(null)} closeLabel="New bill" />
    </div>
  );
}
