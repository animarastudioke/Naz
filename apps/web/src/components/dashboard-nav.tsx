"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/bookings", label: "Bookings" },
  { href: "/dashboard/quotations", label: "Quotations" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/payments", label: "Payments" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-500 text-white" : "text-ink-secondary hover:bg-plane dark:text-white/70 dark:hover:bg-white/5"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
