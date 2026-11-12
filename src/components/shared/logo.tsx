import { cn } from "@/lib/utils";

/**
 * The TKS logo mark.
 * - default: dark green on light theme, white on dark theme
 * - chip: green logo on a white circle, for coloured backgrounds
 */
export function Logo({ variant = "auto", className }: { variant?: "auto" | "chip"; className?: string }) {
  if (variant === "chip") {
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-white p-1.5", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="TKS" className="size-full" />
      </span>
    );
  }
  return (
    <span className={cn("block shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="TKS" className="size-full dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-white.png" alt="TKS" className="hidden size-full dark:block" />
    </span>
  );
}
