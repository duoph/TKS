"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, NativeSelect } from "@/components/shared/field";
import { Panel } from "@/components/shared/page-header";
import { Receipt } from "@/components/shared/receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/data/api";
import { useStore } from "@/data/store";
import type { Sale } from "@/data/types";
import { optionalAmount, requiredText, toNumber } from "@/lib/validation";

const shopSchema = z.object({
  name: requiredText("Shop name"),
  tagline: z.string(),
  address: requiredText("Address"),
  phone: requiredText("Phone"),
  gstin: z.string(),
  fssai: z.string(),
  upiId: z.string(),
  openingCash: optionalAmount("Opening cash"),
});
type ShopValues = z.infer<typeof shopSchema>;

export function ShopSettingsForm() {
  const shop = useStore((s) => s.settings.shop);
  const form = useForm<ShopValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: { ...shop, openingCash: String(shop.openingCash) },
  });
  const { register, formState } = form;
  const errors = formState.errors;

  return (
    <Panel title="Shop details" description="Shown on the login page, the sidebar and every printed bill.">
      <form
        className="grid max-w-2xl gap-3"
        noValidate
        onSubmit={form.handleSubmit((data) => {
          updateSettings({ shop: { ...data, openingCash: toNumber(data.openingCash) } });
          form.reset(data);
          toast.success("Shop details saved");
        })}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Shop name" htmlFor="sh-name" error={errors.name?.message}>
            <Input id="sh-name" className="h-10" {...register("name")} />
          </Field>
          <Field label="Tagline" htmlFor="sh-tagline">
            <Input id="sh-tagline" className="h-10" {...register("tagline")} />
          </Field>
        </div>
        <Field label="Address" htmlFor="sh-address" error={errors.address?.message}>
          <Textarea id="sh-address" rows={2} {...register("address")} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone" htmlFor="sh-phone" error={errors.phone?.message}>
            <Input id="sh-phone" className="h-10" {...register("phone")} />
          </Field>
          <Field label="UPI ID" htmlFor="sh-upi">
            <Input id="sh-upi" className="h-10" {...register("upiId")} />
          </Field>
          <Field label="GSTIN" htmlFor="sh-gstin">
            <Input id="sh-gstin" className="h-10" {...register("gstin")} />
          </Field>
          <Field label="FSSAI licence no." htmlFor="sh-fssai">
            <Input id="sh-fssai" className="h-10" {...register("fssai")} />
          </Field>
          <Field
            label="Opening cash in drawer (₹)"
            htmlFor="sh-cash"
            error={errors.openingCash?.message}
            hint="Used for the cash in hand figure on the dashboard"
          >
            <Input id="sh-cash" inputMode="decimal" className="h-10" {...register("openingCash")} />
          </Field>
        </div>
        <Button type="submit" className="h-10 w-fit px-5" disabled={!formState.isDirty}>
          Save shop details
        </Button>
      </form>
    </Panel>
  );
}

const billSchema = z.object({
  header: z.string(),
  footer: z.string(),
  showLogo: z.boolean(),
  showCategoryCode: z.boolean(),
  showGstin: z.boolean(),
  showCustomer: z.boolean(),
  paperWidth: z.enum(["80mm", "58mm"]),
});
type BillValues = z.infer<typeof billSchema>;

const SAMPLE_SALE: Sale = {
  id: "sample",
  billNo: "B00000",
  date: new Date().toISOString(),
  customerId: null,
  customerName: "Walk-in customer",
  priceType: "retail",
  items: [
    { productId: "a", name: "Curry Cut", categoryCode: "SL BL", weightKg: 1.25, rate: 380, amount: 475 },
    { productId: "b", name: "Curry Cut", categoryCode: "WS B", weightKg: 2, rate: 215, amount: 430 },
    { productId: "c", name: "Liver", categoryCode: "PARTS", weightKg: 0.5, rate: 120, amount: 60 },
  ],
  subtotal: 965,
  discount: 5,
  roundOff: 0,
  total: 960,
  payments: [{ method: "cash", amount: 960 }],
  cashier: "Shahana Basheer",
};

const TOGGLES: { name: "showLogo" | "showCategoryCode" | "showGstin" | "showCustomer"; label: string; hint: string }[] = [
  { name: "showLogo", label: "Print logo", hint: "TKS logo at the top of the bill" },
  { name: "showCategoryCode", label: "Print category code with product", hint: 'For example "SL BL - Curry Cut"' },
  { name: "showGstin", label: "Print GSTIN", hint: "Shown under the shop phone number" },
  { name: "showCustomer", label: "Print customer name", hint: "Useful for hotel and credit bills" },
];

export function BillFormatForm() {
  const settings = useStore((s) => s.settings);
  const lastSale = useStore((s) => s.sales[0]);
  const form = useForm<BillValues>({ resolver: zodResolver(billSchema), defaultValues: settings.bill });
  const { register, control, formState } = form;
  const draft = useWatch({ control });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <Panel title="Bill format" description="Changes show in the preview straight away. Save to use them in the POS.">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit((data) => {
            updateSettings({ bill: data });
            form.reset(data);
            toast.success("Bill format saved");
          })}
        >
          <Field label="Extra header line" htmlFor="bf-header" hint="Printed under the shop name. Leave empty if not needed.">
            <Input id="bf-header" className="h-10" placeholder="e.g. Halal certified" {...register("header")} />
          </Field>
          <Field label="Footer message" htmlFor="bf-footer">
            <Input id="bf-footer" className="h-10" {...register("footer")} />
          </Field>
          <Field label="Paper width" htmlFor="bf-width">
            <div className="max-w-48">
              <NativeSelect id="bf-width" className="h-10" {...register("paperWidth")}>
                <option value="80mm">80 mm (standard)</option>
                <option value="58mm">58 mm (small)</option>
              </NativeSelect>
            </div>
          </Field>
          <div className="grid gap-3">
            {TOGGLES.map((toggle) => (
              <Controller
                key={toggle.name}
                control={control}
                name={toggle.name}
                render={({ field }) => (
                  <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
                    <span>
                      <span className="block text-sm font-medium">{toggle.label}</span>
                      <span className="text-xs text-muted-foreground">{toggle.hint}</span>
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
            ))}
          </div>
          <Button type="submit" className="h-10 w-fit px-5" disabled={!formState.isDirty}>
            Save bill format
          </Button>
        </form>
      </Panel>

      <Panel title="Preview" description={lastSale ? `Using the latest bill, ${lastSale.billNo}` : "Sample bill"}>
        <div className="flex justify-center overflow-x-auto rounded-lg bg-muted p-3">
          <div className="h-fit shadow-md">
            <Receipt
              sale={lastSale ?? SAMPLE_SALE}
              settings={{ shop: settings.shop, bill: { ...settings.bill, ...draft } }}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}
