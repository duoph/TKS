"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field, NativeSelect } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/format";
import { positiveNumber, toNumber } from "@/lib/validation";

const schema = z.object({
  amount: positiveNumber("Amount"),
  method: z.string(),
  note: z.string(),
});
type FormValues = z.infer<typeof schema>;

/** Used for both "receive from customer" and "pay supplier". */
export function PaymentForm<M extends string>({
  outstanding,
  methods,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  outstanding: number;
  methods: { id: M; label: string }[];
  submitLabel: string;
  onSubmit: (values: { amount: number; method: M; note: string }) => void;
  onCancel: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: outstanding > 0 ? String(outstanding) : "", method: methods[0].id, note: "" },
  });
  const { register, formState } = form;

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={form.handleSubmit((data) =>
        onSubmit({ amount: toNumber(data.amount), method: data.method as M, note: data.note }),
      )}
    >
      <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">Outstanding now</span>
        <span className="text-lg font-semibold tabular-nums">{inr(outstanding)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)" htmlFor="pay-amount" error={formState.errors.amount?.message}>
          <Input id="pay-amount" inputMode="decimal" className="h-10" autoFocus {...register("amount")} />
        </Field>
        <Field label="Method" htmlFor="pay-method">
          <NativeSelect id="pay-method" className="h-10" {...register("method")}>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Note (optional)" htmlFor="pay-note">
        <Input id="pay-note" className="h-10" placeholder="Cheque no., reference..." {...register("note")} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-10">
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
