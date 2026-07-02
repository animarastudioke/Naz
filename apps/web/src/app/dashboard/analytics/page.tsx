"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { TrendLineChart } from "@/components/charts/trend-line-chart";

interface ConversionRates {
  quotationApprovalRate: number;
  bookingCompletionRate: number;
  totalQuotations: number;
  totalBookings: number;
}
interface AcquisitionPoint {
  month: string;
  newClients: number;
}
interface Forecast {
  averageBookingsPerWeek: number;
  next4WeeksForecast: { week: number; estimatedBookings: number }[];
}

export default function AnalyticsPage() {
  const [conversion, setConversion] = useState<ConversionRates | null>(null);
  const [acquisition, setAcquisition] = useState<AcquisitionPoint[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);

  useEffect(() => {
    api.get<ConversionRates>("/analytics/conversion-rates").then(setConversion).catch(() => undefined);
    api.get<AcquisitionPoint[]>("/analytics/customer-acquisition?months=6").then(setAcquisition).catch(() => undefined);
    api.get<Forecast>("/ai/demand-forecast").then(setForecast).catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
      <p className="mt-1 text-sm text-ink-secondary">Conversion, growth and demand forecasting.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Quotation approval rate"
          value={`${conversion?.quotationApprovalRate ?? 0}%`}
          deltaLabel={`${conversion?.totalQuotations ?? 0} quotations sent`}
        />
        <StatTile
          label="Booking completion rate"
          value={`${conversion?.bookingCompletionRate ?? 0}%`}
          deltaLabel={`${conversion?.totalBookings ?? 0} bookings total`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New clients — last 6 months</CardTitle>
          </CardHeader>
          <TrendLineChart
            currency=""
            data={acquisition.map((a) => ({ label: new Date(a.month).toLocaleDateString("en-KE", { month: "short" }), value: a.newClients }))}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demand forecast (next 4 weeks)</CardTitle>
          </CardHeader>
          <p className="mb-3 text-sm text-ink-secondary">
            Averaging {forecast?.averageBookingsPerWeek ?? 0} bookings/week based on recent trailing history.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {forecast?.next4WeeksForecast.map((w) => (
              <div key={w.week} className="rounded-lg border border-line-hairline p-3 text-center">
                <p className="text-xs text-ink-muted">Week {w.week}</p>
                <p className="text-lg font-semibold text-ink">{w.estimatedBookings}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
