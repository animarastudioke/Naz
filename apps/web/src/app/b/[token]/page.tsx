"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PublicBooking {
  status: string;
  startAt: string;
  endAt: string;
  service: { name: string; durationMins: number };
  client: { fullName: string };
  business: { name: string };
}

export default function BookingSelfServicePage() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.public.get<PublicBooking>(`/public/bookings/${token}`).then(setBooking).catch(() => undefined);
  useEffect(() => { load(); }, [token]);

  const reschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const startAt = new Date(`${date}T${time}:00`);
      const endAt = new Date(startAt.getTime() + booking.service.durationMins * 60000);
      await api.public.post(`/public/bookings/${token}/reschedule`, { startAt: startAt.toISOString(), endAt: endAt.toISOString() });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await api.public.post(`/public/bookings/${token}/cancel`, { reason: "Cancelled by client" });
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!booking) return <p className="p-10 text-center text-sm text-ink-muted">Loading…</p>;

  const canManage = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status);

  return (
    <main className="flex min-h-screen items-center justify-center bg-plane px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink">{booking.business.name}</h1>
          <Badge status={booking.status}>{booking.status}</Badge>
        </div>
        <p className="text-sm text-ink-secondary">{booking.service.name}</p>
        <p className="mt-1 text-sm font-medium text-ink">{new Date(booking.startAt).toLocaleString()}</p>

        {canManage && (
          <>
            <form onSubmit={reschedule} className="mt-6 border-t border-line-hairline pt-6">
              <Label>Reschedule</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
                <Input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              {error && <p className="mt-2 text-sm text-status-critical">{error}</p>}
              <Button type="submit" className="mt-3 w-full" disabled={busy}>
                {busy ? "Saving…" : "Request new time"}
              </Button>
            </form>
            <Button variant="secondary" className="mt-3 w-full" disabled={busy} onClick={cancel}>
              Cancel booking
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
