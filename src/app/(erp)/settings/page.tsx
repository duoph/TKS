"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CategoriesSettings, ProductsSettings, UsersSettings } from "@/components/settings/masters";
import { BillFormatForm, ShopSettingsForm } from "@/components/settings/shop-and-bill";
import { FilterPills, PageHeader, Panel } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resetDemoData } from "@/data/api";
import { useStore } from "@/data/store";

type Section = "shop" | "products" | "categories" | "users" | "bill" | "demo";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "shop", label: "Shop details" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "users", label: "Users and roles" },
  { id: "bill", label: "Bill format" },
  { id: "demo", label: "Demo data" },
];

function DemoDataPanel() {
  const [confirming, setConfirming] = useState(false);
  const counts = {
    sales: useStore((s) => s.sales.length),
    batches: useStore((s) => s.batches.length),
    purchases: useStore((s) => s.purchases.length),
  };

  return (
    <Panel title="Demo data" description="Everything in this demo is dummy data stored in this browser.">
      <div className="max-w-xl space-y-4 text-sm">
        <p>
          Right now there are <strong>{counts.sales}</strong> bills, <strong>{counts.batches}</strong> processing batches and{" "}
          <strong>{counts.purchases}</strong> purchases.
        </p>
        <p className="text-muted-foreground">
          Reset brings back the original 30 days of data. Bills, batches, purchases, payments, price changes and settings
          made during the demo will be removed. You stay signed in.
        </p>
        <Button variant="destructive" className="h-10" onClick={() => setConfirming(true)}>
          <RotateCcw /> Reset demo data
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Reset demo data?</DialogTitle>
            <DialogDescription>
              All changes made in this demo will be removed and the original dummy data restored. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-10" onClick={() => setConfirming(false)}>
              Keep my changes
            </Button>
            <Button
              variant="destructive"
              className="h-10"
              onClick={() => {
                resetDemoData();
                setConfirming(false);
                toast.success("Demo data restored");
              }}
            >
              Reset demo data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("shop");
  // Remount the forms after a reset so they show the restored values.
  const seedVersion = useStore((s) => `${s.settings.shop.name}-${s.counters.bill}`);

  return (
    <>
      <PageHeader title="Settings" description="Shop details, products and prices, users, bill format and demo data." />
      <div className="mb-4">
        <FilterPills label="Settings section" value={section} onChange={setSection} options={SECTIONS} />
      </div>
      {section === "shop" && <ShopSettingsForm key={seedVersion} />}
      {section === "products" && <ProductsSettings />}
      {section === "categories" && <CategoriesSettings />}
      {section === "users" && <UsersSettings />}
      {section === "bill" && <BillFormatForm key={seedVersion} />}
      {section === "demo" && <DemoDataPanel />}
    </>
  );
}
