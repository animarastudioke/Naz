"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";

interface BookingPageData {
  name: string;
  logoUrl?: string;
  currency: string;
  services: { id: string; name: string; description?: string; durationMins: number; price: string }[];
}
interface Slot {
  startAt: string;
  endAt: string;
  available: boolean;
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<BookingPageData | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ clientFullName: "", clientPhone: "", clientEmail: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.public.get<BookingPageData>(`/public/business/${slug}`).then(setPage).catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    if (!serviceId || !date) return;
    api.public
      .get<{ slots: Slot[] }>(`/public/business/${slug}/availability?serviceId=${serviceId}&date=${date}`)
      .then((res) => setSlots(res.slots))
      .catch(() => undefined);
  }, [serviceId, date, slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !selectedSlot) return;
    setError(null);
    setLoading(true);
    try {
      await api.public.post(`/public/business/${slug}/bookings`, {
        serviceId,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        ...form,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!page) return <p className="p-10 text-center text-sm text-ink-muted">Loading…</p>;

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-plane px-4">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-ink">Booking request received!</h1>
          <p className="mt-2 text-sm text-ink-secondary">{page.name} will confirm your appointment shortly via WhatsApp or email.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-plane px-4 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-center text-2xl font-semibold text-ink">Book with {page.name}</h1>

        <Card className="mt-6">
          <Label>1. Choose a service</Label>
          <div className="mt-2 space-y-2">
            {page.services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setSelectedSlot(null);
                }}
                className={`w-full rounded-lg border p-3 text-left text-sm ${serviceId === s.id ? "border-brand-500 bg-brand-50" : "border-line-hairline"}`}
              >
                <div className="flex justify-between font-medium text-ink">
                  <span>{s.name}</span>
                  <span>
                    {page.currency} {Number(s.price).toLocaleString()}
                  </span>
                </div>
                {s.description && <p className="mt-1 text-xs text-ink-muted">{s.description}</p>}
                <p className="mt-1 text-xs text-ink-muted">{s.durationMins} minutes</p>
              </button>
            ))}
          </div>

          {serviceId && (
            <div className="mt-4">
              <Label>2. Choose a date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}

          {slots.length > 0 && (
            <div className="mt-4">
              <Label>3. Choose a time</Label>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startAt}
                    onClick={() => setSelectedSlot(s)}
                    className={`rounded-lg border px-2 py-1.5 text-xs ${
                      selectedSlot?.startAt === s.startAt ? "border-brand-500 bg-brand-50" : "border-line-hairline"
                    }`}
                  >
                    {new Date(s.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedSlot && (
            <form onSubmit={submit} className="mt-4 border-t border-line-hairline pt-4">
              <Label>4. Your details</Label>
              <FieldGroup>
                <Input required placeholder="Full name" value={form.clientFullName} onChange={(e) => setForm({ ...form, clientFullName: e.target.value })} />
              </FieldGroup>
              <FieldGroup>
                <Input required placeholder="WhatsApp / phone number" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} />
              </FieldGroup>
              <FieldGroup>
                <Input type="email" placeholder="Email (optional)" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
              </FieldGroup>
              {error && <p className="mb-3 text-sm text-status-critical">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Booking…" : "Confirm booking request"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
