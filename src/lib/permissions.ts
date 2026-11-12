import {
  BarChart3,
  Bird,
  ClipboardList,
  Factory,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import type { Role } from "@/data/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

/** One list drives the sidebar and the route guard. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "manager"] },
  { href: "/pos", label: "POS Billing", icon: ShoppingCart, roles: ["owner", "manager", "cashier"] },
  { href: "/purchases", label: "Purchase", icon: Bird, roles: ["owner", "manager", "production"] },
  { href: "/processing", label: "Processing", icon: Factory, roles: ["owner", "manager", "production"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["owner", "manager", "production"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["owner", "manager", "cashier"] },
  { href: "/orders", label: "Advance Orders", icon: ClipboardList, roles: ["owner", "manager", "cashier"] },
  { href: "/suppliers", label: "Suppliers", icon: Truck, roles: ["owner", "manager"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["owner", "manager"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["owner"] },
];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
  production: "Production staff",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full access, including settings and reports",
  manager: "Daily operations, stock, customers and reports",
  cashier: "POS billing, customers and advance orders",
  production: "Purchases, processing batches and inventory",
};

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function homeForRole(role: Role): string {
  return navForRole(role)[0]?.href ?? "/login";
}

export function canAccess(role: Role, pathname: string): boolean {
  const item = NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return item ? item.roles.includes(role) : true;
}
