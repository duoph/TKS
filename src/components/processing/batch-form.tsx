"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, NativeSelect } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { calcBatch, createBatch } from "@/data/api";
import { useStore } from "@/data/store";
import type { Product } from "@/data/types";
import { kg, round3 } from "@/lib/format";
import { cn } from "@/lib/utils";
import { optionalAmount, positiveInt, positiveNumber, requiredText, toNumber } from "@/lib/validation";

const schema = z.object({
  liveProductId: requiredText("Bird type"),
  birds: positiveInt("Birds"),
  liveKg: positiveNumber("Live weight"),
  outputs: z.record(z.string(), z.string()),
  wasteKg: optionalAmount("Waste"),
  lossKg: optionalAmount("Loss"),
  notes: z.string(),
});
type FormValues = z.infer<typeof schema>;

/** Believable weighed outputs for a batch, with a yield between 68% and 74%. Demo helper only. */
function buildSampleWeights(liveKg: number, cutProducts: Product[]) {
  const targetYield = 68.3 + Math.random() * 5.4;
  const weights = cutProducts.map((p) => (Math.random() < 0.3 ? 0 : 0.5 + Math.random() * (p.lowStockKg + 2)));
  const weightTotal = weights.reduce((s, w) => s + w, 0) || 1;
  const outputs: Record<string, string> = {};
  let total = 0;
  cutProducts.forEach((p, i) => {
    const value = Math.round(((liveKg * targetYield) / 100) * (weights[i] / weightTotal) * 100) / 100;
    outputs[p.id] = value > 0 ? value.toFixed(3) : "";
    total += value;
  });
  const lossKg = round3(liveKg * (0.015 + Math.random() * 0.02));
  return { outputs, lossKg, wasteKg: round3(liveKg - total - lossKg) };
}

function BatchFormBody({ onDone }: { onDone: () => void }) {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);

  const liveCategoryIds = useMemo(() => new Set(categories.filter((c) => c.isLive).map((c) => c.id)), [categories]);
  const liveProducts = products.filter((p) => p.active && liveCategoryIds.has(p.categoryId));
  const groups = useMemo(
    () =>
      categories
        .filter((c) => !c.isLive)
        .map((c) => ({ category: c, products: products.filter((p) => p.active && p.categoryId === c.id) }))
        .filter((g) => g.products.length > 0),
    [categories, products],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      liveProductId: liveProducts[0]?.id ?? "",
      birds: "",
      liveKg: "",
      outputs: {},
      wasteKg: "",
      lossKg: "",
      notes: "",
    },
  });
  const { register, control, setValue, getValues, formState } = form;
  const values = useWatch({ control });

  const live = liveProducts.find((p) => p.id === values.liveProductId);
  const liveKg = toNumber(values.liveKg);
  const birds = toNumber(values.birds);
  const wasteKg = toNumber(values.wasteKg);
  const lossKg = toNumber(values.lossKg);
  const outputs = Object.entries(values.outputs ?? {})
    .map(([productId, text]) => ({ productId, kg: toNumber(text) }))
    .filter((o) => o.kg > 0);
  const { outputKg, balanceKg, yieldPct } = calcBatch(liveKg, outputs, wasteKg, lossKg);
  const balanced = liveKg > 0 && Math.abs(balanceKg) <= 0.005;
  const overStock = !!live && (liveKg > live.stockKg + 0.0005 || birds > (live.stockBirds ?? 0));

  /** Demo helper: fills believable weighed outputs so the screen can be shown quickly. */
  const fillSample = () => {
    let sampleBirds = birds;
    let sampleLive = liveKg;
    if (!sampleBirds || !sampleLive) {
      sampleBirds = Math.min(150, live?.stockBirds ?? 150);
      const perBird = live && live.stockBirds ? live.stockKg / live.stockBirds : 2;
      sampleLive = Math.round(sampleBirds * perBird * 10) / 10;
      setValue("birds", String(sampleBirds), { shouldValidate: true });
      setValue("liveKg", String(sampleLive), { shouldValidate: true });
    }
    const { outputs: next, lossKg: loss, wasteKg: waste } = buildSampleWeights(
      sampleLive,
      groups.flatMap((g) => g.products),
    );
    setValue("outputs", next);
    setValue("lossKg", loss.toFixed(3));
    setValue("wasteKg", waste.toFixed(3));
    toast.info("Sample weights filled. Edit any value to see the yield change.");
  };

  const putBalanceInLoss = () => {
    setValue("lossKg", Math.max(0, round3(toNumber(getValues("lossKg")) + balanceKg)).toFixed(3), { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit((data) => {
    try {
      const batch = createBatch({
        liveProductId: data.liveProductId,
        birds: toNumber(data.birds),
        liveKg: toNumber(data.liveKg),
        outputs: Object.entries(data.outputs).map(([productId, text]) => ({ productId, kg: toNumber(text) })),
        wasteKg: toNumber(data.wasteKg),
        lossKg: toNumber(data.lossKg),
        notes: data.notes,
      });
      toast.success(`Batch ${batch.batchNo} saved`, {
        description: `Yield ${batch.yieldPct.toFixed(2)}%. ${kg(batch.outputKg)} added to cut stock.`,
      });
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the batch");
    }
  });

  const errors = formState.errors;

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col" noValidate>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">1. Input: live birds used</h3>
            <Button type="button" variant="outline" size="sm" onClick={fillSample}>
              <Sparkles /> Fill sample weights
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Bird type"
              htmlFor="b-type"
              error={errors.liveProductId?.message}
              hint={live ? `In stock: ${live.stockBirds ?? 0} birds, ${kg(live.stockKg)}` : undefined}
            >
              <NativeSelect id="b-type" className="h-10" {...register("liveProductId")}>
                {liveProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Birds used (count)" htmlFor="b-birds" error={errors.birds?.message}>
              <Input id="b-birds" inputMode="numeric" className="h-10" placeholder="0" {...register("birds")} />
            </Field>
            <Field
              label="Live weight used (kg)"
              htmlFor="b-live"
              error={errors.liveKg?.message}
              hint={birds > 0 && liveKg > 0 ? `Average ${(liveKg / birds).toFixed(3)} kg per bird` : undefined}
            >
              <Input id="b-live" inputMode="decimal" className="h-10" placeholder="0.000" {...register("liveKg")} />
            </Field>
          </div>
          {overStock && (
            <p className="mt-2 text-sm font-medium text-destructive" role="alert">
              This is more than the live stock available for {live?.name}.
            </p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">2. Output: actual weighed kg per product</h3>
          <div className="space-y-4">
            {groups.map(({ category, products: list }) => (
              <fieldset key={category.id}>
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {category.code} · {category.name}
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded-lg border bg-card py-1 pr-1 pl-2.5">
                      <span className="min-w-0 flex-1 truncate text-sm" title={`${category.code} - ${p.name}`}>
                        {p.name}
                      </span>
                      <Input
                        inputMode="decimal"
                        placeholder="0.000"
                        aria-label={`${category.code} - ${p.name} output kg`}
                        className="h-9 w-24 text-right tabular-nums"
                        {...register(`outputs.${p.id}`)}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">3. Waste and loss (entered separately)</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Waste (kg)" htmlFor="b-waste" error={errors.wasteKg?.message} hint="Feathers, blood, intestines">
              <Input id="b-waste" inputMode="decimal" className="h-10" placeholder="0.000" {...register("wasteKg")} />
            </Field>
            <Field label="Loss (kg)" htmlFor="b-loss" error={errors.lossKg?.message} hint="Moisture and handling loss">
              <Input id="b-loss" inputMode="decimal" className="h-10" placeholder="0.000" {...register("lossKg")} />
            </Field>
            <Field label="Notes" htmlFor="b-notes">
              <Input id="b-notes" className="h-10" placeholder="Optional" {...register("notes")} />
            </Field>
          </div>
        </section>
      </div>

      <div className="border-t bg-muted/50 p-4">
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm sm:grid-cols-6" aria-live="polite">
          <Summary label="Input" value={kg(liveKg)} />
          <Summary label="Output" value={kg(outputKg)} />
          <Summary label="Waste" value={kg(wasteKg)} />
          <Summary label="Loss" value={kg(lossKg)} />
          <Summary
            label="Balance"
            value={kg(balanceKg)}
            tone={liveKg === 0 ? "muted" : balanced ? "good" : "bad"}
            hint={liveKg === 0 ? "" : balanced ? "Balanced" : balanceKg > 0 ? "Not yet accounted" : "Over the input"}
          />
          <Summary label="Yield" value={`${yieldPct.toFixed(2)}%`} big />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Yield % = output kg / live input kg. Rule: input = outputs + waste + loss.
          </p>
          <div className="flex gap-2">
            {liveKg > 0 && !balanced && balanceKg > 0 && (
              <Button type="button" variant="outline" className="h-10" onClick={putBalanceInLoss}>
                Add balance to loss
              </Button>
            )}
            <Button type="submit" className="h-10 px-5" disabled={!balanced || overStock || outputKg <= 0}>
              Save batch
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Summary({
  label,
  value,
  hint,
  tone,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad" | "muted";
  big?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-semibold tabular-nums",
          big ? "text-2xl leading-tight" : "text-base",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className={cn("text-xs", tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function BatchFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[94dvh] flex-col gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="p-4">
          <DialogTitle className="text-lg">New processing batch</DialogTitle>
          <DialogDescription>
            Enter what was actually used and weighed. Yield is calculated for this batch only.
          </DialogDescription>
        </DialogHeader>
        {open && <BatchFormBody onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
