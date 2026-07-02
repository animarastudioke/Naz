"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";

interface DashboardData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingReceivables: number;
  vendorPayoutsDue: number;
  bookingsInRange: number;
  newClientsInRange: number;
}

interface TrendPoint {
  month: string;
  total: number;
}

interface TopService {
  name: string;
  total: number;
}

export default function DashboardOverviewPage() {
  const { business } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const currency = "KES";

  useEffect(() => {
    api.get<DashboardData>("/analytics/dashboard").then(setData).catch(() => undefined);
    api.get<TrendPoint[]>("/analytics/sales-trend?months=6").then(setTrend).catch(() => undefined);
    api.get<TopService[]>("/analytics/top-services?limit=5").then(setTopServices).catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Welcome back{business ? `, ${business.name}` : ""}</h1>
      <p className="mt-1 text-sm text-ink-secondary">Here&apos;s how your business is performing.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Revenue (all time)" value={`${currency} ${(data?.totalRevenue ?? 0).toLocaleString()}`} />
        <StatTile label="Outstanding receivables" value={`${currency} ${(data?.outstandingReceivables ?? 0).toLocaleString()}`} />
        <StatTile label="Net profit" value={`${currency} ${(data?.netProfit ?? 0).toLocaleString()}`} />
        <StatTile label="Vendor payouts due" value={`${currency} ${(data?.vendorPayoutsDue ?? 0).toLocaleString()}`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — last 6 months</CardTitle>
          </CardHeader>
          <TrendLineChart
            currency={currency}
            data={trend.map((t) => ({
              label: new Date(t.month).toLocaleDateString("en-KE", { month: "short" }),
              value: t.total,
            }))}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most profitable services</CardTitle>
          </CardHeader>
          <RankedBarChart currency={currency} data={topServices.map((s) => ({ label: s.name, value: s.total }))} />
        </Card>
      </div>
    </div>
  );
}
