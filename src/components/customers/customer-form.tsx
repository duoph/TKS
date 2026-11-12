"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, NativeSelect } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveCustomer } from "@/data/api";
import type { Customer } from "@/data/types";
import { optionalAmount, requiredText, toNumber } from "@/lib/validation";

export const CUSTOMER_TYPE_LABELS: Record<Customer["type"], string> = {
  retail: "Retail",
  hotel: "Hotel",
  restaurant: "Restaurant",
  caterer: "Caterer",
};

const schema = z.object({
  name: requiredText("Name"),
  type: z.enum(["retail", "hotel", "restaurant", "caterer"]),
  phone: requiredText("Phone"),
  place: requiredText("Place"),
  priceType: z.enum(["retail", "wholesale"]),
  creditLimit: optionalAmount("Credit limit"),
  openingBalance: optionalAmount("Opening balance"),
});
type FormValues = z.infer<typeof schema>;

function CustomerForm({ customer, onDone }: { customer?: Customer; onDone: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? { ...customer, creditLimit: String(customer.creditLimit), openingBalance: String(customer.openingBalance) }
      : { name: "", type: "hotel", phone: "", place: "", priceType: "wholesale", creditLimit: "50000", openingBalance: "" },
  });
  const { register, formState } = form;
  const errors = formState.errors;

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={form.handleSubmit((data) => {
        saveCustomer({
          ...data,
          id: customer?.id,
          creditLimit: toNumber(data.creditLimit),
          openingBalance: toNumber(data.openingBalance),
        });
        toast.success(customer ? "Customer updated" : "Customer added");
        onDone();
      })}
    >
      <Field label="Customer name" htmlFor="c-name" error={errors.name?.message}>
        <Input id="c-name" className="h-10" {...register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" htmlFor="c-type">
          <NativeSelect id="c-type" className="h-10" {...register("type")}>
            {Object.entries(CUSTOMER_TYPE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Price type" htmlFor="c-price">
          <NativeSelect id="c-price" className="h-10" {...register("priceType")}>
            <option value="wholesale">Wholesale</option>
            <option value="retail">Retail</option>
          </NativeSelect>
        </Field>
        <Field label="Phone" htmlFor="c-phone" error={errors.phone?.message}>
          <Input id="c-phone" inputMode="tel" className="h-10" {...register("phone")} />
        </Field>
        <Field label="Place" htmlFor="c-place" error={errors.place?.message}>
          <Input id="c-place" className="h-10" {...register("place")} />
        </Field>
        <Field label="Credit limit (₹)" htmlFor="c-limit" error={errors.creditLimit?.message}>
          <Input id="c-limit" inputMode="decimal" className="h-10" {...register("creditLimit")} />
        </Field>
        <Field label="Opening balance (₹)" htmlFor="c-opening" error={errors.openingBalance?.message}>
          <Input id="c-opening" inputMode="decimal" className="h-10" placeholder="0" {...register("openingBalance")} />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="h-10">
          Save customer
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CustomerFormDialog({
  open,
  customer,
  onClose,
}: {
  open: boolean;
  customer?: Customer;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{customer ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>Hotels, restaurants and caterers usually get wholesale prices and credit.</DialogDescription>
        </DialogHeader>
        {open && <CustomerForm customer={customer} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
