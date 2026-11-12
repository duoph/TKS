"use client";

import { Delete, Minus, Plus, Scale } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "@/components/shared/product-image";
import type { Category, PriceType, Product } from "@/data/types";
import { inr, kg, round2, round3 } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface WeighTarget {
  product: Product;
  label: string;
  category?: Category;
  isLive: boolean;
  rate: number;
  /** Stock still free for this line (stock minus other cart lines). */
  availableKg: number;
  initialWeight?: number;
  initialBirds?: number;
}

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"] as const;

/** A believable reading from the weighing scale for this kind of sale. */
function simulateScale(target: WeighTarget, priceType: PriceType, birds: number): number {
  const step = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 200) / 200;
  let weight: number;
  if (target.isLive) {
    const perBird = target.product.name.toLowerCase().includes("small") ? step(1.75, 2.05) : step(2.4, 2.85);
    weight = round3(perBird * Math.max(1, birds));
  } else if (target.product.name.toLowerCase().includes("whole")) {
    weight = step(1.1, 1.8) * (priceType === "wholesale" ? 5 : 1);
  } else {
    weight = priceType === "wholesale" ? step(3, 14) : step(0.35, 2.2);
  }
  return Math.min(round3(weight), Math.floor(target.availableKg * 1000) / 1000);
}

function WeightPad({
  target,
  priceType,
  onConfirm,
}: {
  target: WeighTarget;
  priceType: PriceType;
  onConfirm: (weightKg: number, birds?: number) => void;
}) {
  const [text, setText] = useState(target.initialWeight ? target.initialWeight.toFixed(3) : "");
  const [fresh, setFresh] = useState(true);
  const [birds, setBirds] = useState(target.initialBirds ?? 1);
  const [reading, setReading] = useState(false);

  const weight = Number(text) || 0;
  const amount = round2(weight * target.rate);
  const tooMuch = weight > target.availableKg + 0.0005;
  const canAdd = weight > 0 && !tooMuch && !reading;
  const quick = priceType === "wholesale" && !target.isLive ? [2, 5, 10, 15, 20] : [0.25, 0.5, 1, 1.5, 2];

  const press = (key: string) => {
    if (reading) return;
    // The first key after opening replaces the old value instead of appending to it.
    const base = fresh ? "" : text;
    setFresh(false);
    if (key === "back") return setText(base.slice(0, -1));
    if (key === ".") return setText(base.includes(".") ? base : `${base || "0"}.`);
    const next = base === "0" ? key : base + key;
    const [whole, decimals = ""] = next.split(".");
    if (whole.length > 4 || decimals.length > 3) return;
    setText(next);
  };

  const readScale = () => {
    setReading(true);
    setTimeout(() => {
      setText(simulateScale(target, priceType, birds).toFixed(3));
      setFresh(true);
      setReading(false);
    }, 550);
  };

  const confirm = () => {
    if (canAdd) onConfirm(round3(weight), target.isLive ? birds : undefined);
  };

  return (
    <div
      className="grid gap-3 outline-none"
      onKeyDown={(e) => {
        if (e.key >= "0" && e.key <= "9") press(e.key);
        else if (e.key === ".") press(".");
        else if (e.key === "Backspace") press("back");
        else if (e.key === "Enter") {
          e.preventDefault();
          confirm();
        }
      }}
    >
      <div className={cn("rounded-xl border-2 bg-muted/60 p-3", tooMuch ? "border-destructive" : "border-transparent")}>
        <div className="flex items-end justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Weight</span>
          <span className="font-mono text-4xl font-semibold tabular-nums" aria-live="polite">
            {reading ? "- - -" : weight ? weight.toFixed(3) : "0.000"}
            <span className="ml-1 text-lg text-muted-foreground">kg</span>
          </span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted-foreground">
            {inr(target.rate)} / kg · {kg(target.availableKg)} in stock
          </span>
          <span className="tabular font-semibold">{inr(amount)}</span>
        </div>
        {tooMuch && (
          <p className="mt-1 text-sm font-medium text-destructive" role="alert">
            Only {kg(target.availableKg)} available.
          </p>
        )}
      </div>

      {target.isLive && (
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
          <span className="text-sm font-medium">Number of birds</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="size-11"
              aria-label="Fewer birds"
              onClick={() => setBirds(Math.max(1, birds - 1))}
            >
              <Minus />
            </Button>
            <span className="w-8 text-center text-xl font-semibold tabular-nums">{birds}</span>
            <Button
              variant="outline"
              className="size-11"
              aria-label="More birds"
              onClick={() => setBirds(Math.min(target.product.stockBirds ?? 99, birds + 1))}
            >
              <Plus />
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-2">
        {quick.map((q) => (
          <Button
            key={q}
            variant="outline"
            className="h-11 px-0 tabular-nums"
            onClick={() => {
              setText(q.toFixed(3));
              setFresh(true);
            }}
          >
            {q < 1 ? `${q * 1000} g` : `${q} kg`}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <Button
            key={key}
            variant="secondary"
            className="h-14 text-2xl font-medium"
            aria-label={key === "back" ? "Delete last digit" : key}
            onClick={() => press(key)}
          >
            {key === "back" ? <Delete className="size-6!" /> : key}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-14 text-base" onClick={readScale} disabled={reading}>
          <Scale className="size-5!" /> {reading ? "Reading…" : "Read scale"}
        </Button>
        <Button className="h-14 text-base" onClick={confirm} disabled={!canAdd}>
          {target.initialWeight ? "Update" : "Add to bill"}
        </Button>
      </div>
    </div>
  );
}

/** Weight entry: number pad, quick weights and a simulated weighing scale. */
export function WeightDialog({
  target,
  priceType,
  onConfirm,
  onClose,
}: {
  target: WeighTarget | null;
  priceType: PriceType;
  onConfirm: (weightKg: number, birds?: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="flex-row items-center gap-3 pr-8">
          {target && (
            <ProductImage product={target.product} category={target.category} className="h-12 w-[4.5rem] shrink-0 rounded-lg" />
          )}
          <div className="grid gap-1">
            <DialogTitle className="text-lg">{target?.label}</DialogTitle>
            <DialogDescription>Type the weight or read it from the scale.</DialogDescription>
          </div>
        </DialogHeader>
        {target && <WeightPad key={target.product.id} target={target} priceType={priceType} onConfirm={onConfirm} />}
      </DialogContent>
    </Dialog>
  );
}
