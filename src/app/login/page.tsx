"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Factory, type LucideIcon, ShieldCheck, ShoppingCart, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ThemeToggle } from "@/components/layout/header-controls";
import { Logo } from "@/components/shared/logo";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { login } from "@/data/api";
import { useStore } from "@/data/store";
import type { Role } from "@/data/types";
import { homeForRole, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<Role, LucideIcon> = {
  owner: ShieldCheck,
  manager: UserCog,
  cashier: ShoppingCart,
  production: Factory,
};
const ROLES: Role[] = ["owner", "manager", "cashier", "production"];

const schema = z.object({
  username: z.string().trim().min(1, "Enter a username"),
  password: z.string().min(1, "Enter any password"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.session);
  const shop = useStore((s) => s.settings.shop);
  const [role, setRole] = useState<Role>("owner");
  const [busy, setBusy] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "owner", password: "demo123" },
  });

  useEffect(() => {
    if (hydrated && session && !busy) router.replace(homeForRole(session.role));
  }, [hydrated, session, busy, router]);

  const chooseRole = (next: Role) => {
    setRole(next);
    form.setValue("username", next, { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit(() => {
    setBusy(true);
    // Short delay so the demo feels like a real sign-in.
    setTimeout(() => {
      const user = login(role);
      toast.success(`Welcome, ${user.name}`);
      router.replace(homeForRole(role));
    }, 450);
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <Logo variant="chip" className="size-14" />
          <span className="text-lg font-semibold">{shop.name}</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            From live bird to final bill, in one place.
          </h1>
          <ul className="mt-8 space-y-3 text-primary-foreground/90">
            {[
              "Fast touch POS with weighing scale entry",
              "Actual yield for every processing batch",
              "Live and cut stock, updated with every sale",
              "Customer credit, suppliers and daily reports",
            ].map((line) => (
              <li key={line} className="flex items-center gap-3">
                <Check className="size-4 shrink-0" aria-hidden /> {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">{shop.address}</p>
      </div>

      <div className="flex flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-12">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Logo className="size-12" />
            <span className="text-lg font-semibold">{shop.name}</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a role to see the app as that person.</p>

          {!hydrated ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Role">
                {ROLES.map((r) => {
                  const Icon = ROLE_ICONS[r];
                  const selected = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseRole(r)}
                      className={cn(
                        "rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                        selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "bg-card hover:bg-muted",
                      )}
                    >
                      <Icon className={cn("size-5", selected ? "text-primary" : "text-muted-foreground")} aria-hidden />
                      <p className="mt-2 text-sm font-semibold">{ROLE_LABELS[r]}</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
                    </button>
                  );
                })}
              </div>

              <Field label="Username" htmlFor="username" error={form.formState.errors.username?.message}>
                <Input id="username" className="h-10" autoComplete="username" {...form.register("username")} />
              </Field>
              <Field
                label="Password"
                htmlFor="password"
                error={form.formState.errors.password?.message}
                hint="Demo: any password works."
              >
                <Input
                  id="password"
                  type="password"
                  className="h-10"
                  autoComplete="current-password"
                  {...form.register("password")}
                />
              </Field>

              <Button type="submit" className="h-11 w-full text-base" disabled={busy}>
                {busy ? "Signing in…" : `Sign in as ${ROLE_LABELS[role]}`}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
