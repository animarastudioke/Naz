"use client";

import { useRequireAuth } from "@/lib/auth-context";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, business, loading, logout } = useRequireAuth();

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-plane">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 h-screen w-60 shrink-0 border-r border-line-hairline p-4">
          <div className="mb-6 flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-md bg-brand-500" />
            <span className="text-sm font-semibold text-ink">{business?.name ?? "KaziHQ"}</span>
          </div>
          <DashboardNav />
          <div className="mt-6 border-t border-line-hairline pt-4 px-2">
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <Button variant="ghost" size="sm" className="mt-2 px-0" onClick={logout}>
              Sign out
            </Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
