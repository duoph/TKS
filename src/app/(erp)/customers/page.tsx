"use client";

import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CUSTOMER_TYPE_LABELS, CustomerFormDialog } from "@/components/customers/customer-form";
import { EmptyState, FilterPills, PageHeader, Panel, StatCard } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerOutstandingMap } from "@/data/selectors";
import { useStore } from "@/data/store";
import type { CustomerType } from "@/data/types";
import { inr, inrWhole } from "@/lib/format";

export default function CustomersPage() {
  const router = useRouter();
  const customers = useStore((s) => s.customers);
  const sales = useStore((s) => s.sales);
  const customerPayments = useStore((s) => s.customerPayments);
  const [type, setType] = useState<"all" | CustomerType>("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const outstanding = useMemo(
    () => customerOutstandingMap(customers, sales, customerPayments),
    [customers, sales, customerPayments],
  );
  const rows = customers
    .filter((c) => type === "all" || c.type === type)
    .filter((c) => `${c.name} ${c.phone} ${c.place}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (outstanding[b.id] ?? 0) - (outstanding[a.id] ?? 0));
  const totalDue = Object.values(outstanding).reduce((s, v) => s + Math.max(0, v), 0);
  const overLimit = customers.filter((c) => (outstanding[c.id] ?? 0) > c.creditLimit).length;

  return (
    <>
      <PageHeader title="Customers" description="Retail regulars, hotels, restaurants and caterers, with what each one owes.">
        <Button size="lg" onClick={() => setAdding(true)}>
          <Plus /> Add customer
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Customers" value={String(customers.length)} icon={Users} />
        <StatCard label="Total outstanding" value={inrWhole(totalDue)} tone={totalDue > 0 ? "warn" : "default"} />
        <StatCard label="Customers who owe" value={String(Object.values(outstanding).filter((v) => v > 0).length)} />
        <StatCard label="Over credit limit" value={String(overLimit)} tone={overLimit ? "bad" : "good"} />
      </div>

      <Panel className="mt-4" bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <FilterPills
            label="Customer type"
            value={type}
            onChange={setType}
            options={[
              { id: "all", label: "All" },
              ...(Object.entries(CUSTOMER_TYPE_LABELS) as [CustomerType, string][]).map(([id, label]) => ({ id, label })),
            ]}
          />
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              aria-label="Search customers"
              placeholder="Search name, phone, place"
              className="w-56 pl-8 sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" description="Try another filter, or add a new customer.">
            <Button onClick={() => setAdding(true)}>Add customer</Button>
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Place</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Credit limit</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const due = outstanding[c.id] ?? 0;
                return (
                  <TableRow
                    key={c.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => router.push(`/customers/${c.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/customers/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{CUSTOMER_TYPE_LABELS[c.type]}</Badge>
                    </TableCell>
                    <TableCell className="tabular">{c.phone}</TableCell>
                    <TableCell>{c.place}</TableCell>
                    <TableCell className="capitalize">{c.priceType}</TableCell>
                    <TableCell className="tabular text-right">{inrWhole(c.creditLimit)}</TableCell>
                    <TableCell className="tabular text-right font-semibold">
                      {due > 0 ? (
                        <span className={due > c.creditLimit ? "text-destructive" : ""}>{inr(due)}</span>
                      ) : (
                        <span className="font-normal text-muted-foreground">Nil</span>
                      )}
                    </TableCell>
                    <TableCell className="w-8 text-muted-foreground">
                      <ChevronRight className="size-4" aria-hidden />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      <CustomerFormDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
