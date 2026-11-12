"use client";

import { Menu, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/data/store";
import type { Role } from "@/data/types";
import { fmtDate } from "@/lib/format";
import { canAccess, homeForRole, navForRole, ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ThemeToggle, UserMenu } from "./header-controls";

function Brand() {
  const shopName = useStore((s) => s.settings.shop.name);
  return (
    <div className="flex items-center gap-2.5 px-2">
      <Logo className="size-10" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{shopName}</p>
        <p className="text-xs text-muted-foreground">ERP &amp; POS</p>
      </div>
    </div>
  );
}

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Main menu">
      {navForRole(role).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/75 hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Sidebar layout for the ERP screens. Also guards routes by login and role. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.session);
  const [menuOpen, setMenuOpen] = useState(false);

  const allowed = !!session && canAccess(session.role, pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!session) router.replace("/login");
    else if (!canAccess(session.role, pathname)) router.replace(homeForRole(session.role));
  }, [hydrated, session, pathname, router]);

  if (!hydrated || !session || !allowed) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6">
        <PageSkeleton />
      </div>
    );
  }

  const canUsePos = canAccess(session.role, "/pos");

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-5 border-r bg-sidebar px-3 py-4 lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavLinks role={session.role} />
        </div>
        <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{ROLE_LABELS[session.role]}</span>
          <br />
          Demo data, stored in this browser
        </div>
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 gap-5 px-3 py-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Main navigation</SheetDescription>
          </SheetHeader>
          <Brand />
          <NavLinks role={session.role} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <Button
            variant="outline"
            size="icon-lg"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Today: <span className="font-medium text-foreground">{fmtDate(new Date())}</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            {canUsePos && (
              <Link href="/pos" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                <ShoppingCart aria-hidden /> <span className="hidden sm:inline">Open POS</span>
              </Link>
            )}
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
