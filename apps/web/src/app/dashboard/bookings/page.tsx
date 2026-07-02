"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Booking {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  client: { fullName: string };
  service: { name: string; price: string };
}
interface Client {
  id: string;
  fullName: string;
}
interface ServiceOpt {
  id: string;
  name: string;
  durationMins: number;
  price: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ clientId: "", serviceId: "", date: "", time: "" });

  const load = () => api.get<Booking[]>("/bookings").then(setBookings).catch(() => undefined);

  useEffect(() => {
    load();
    api.get<Client[]>("/clients").then(setClients).catch(() => undefined);
    api.get<ServiceOpt[]>("/services").then(setServices).catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const service = services.find((s) => s.id === form.serviceId);
      const startAt = new Date(`${form.date}T${form.time}:00`);
      const endAt = new Date(startAt.getTime() + (service?.durationMins ?? 60) * 60000);
      await api.post("/bookings", {
        clientId: form.clientId,
        serviceId: form.serviceId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/bookings/${id}/status`, { status }).catch(() => undefined);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Bookings</h1>
          <p className="mt-1 text-sm text-ink-secondary">Appointments, availability and reminders.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New booking</Button>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Client</Th>
            <Th>Service</Th>
            <Th>When</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </Thead>
        <tbody>
          {bookings.map((b) => (
            <Tr key={b.id}>
              <Td>{b.client.fullName}</Td>
              <Td>{b.service.name}</Td>
              <Td>{new Date(b.startAt).toLocaleString()}</Td>
              <Td>
                <Badge status={b.status}>{b.status}</Badge>
              </Td>
              <Td>
                <div className="flex gap-2">
                  {b.status !== "COMPLETED" && b.status !== "CANCELLED" && (
                    <>
                      <button className="text-xs text-brand-600" onClick={() => updateStatus(b.id, "COMPLETED")}>
                        Mark complete
                      </button>
                      <button className="text-xs text-status-critical" onClick={() => updateStatus(b.id, "CANCELLED")}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {bookings.length === 0 && <EmptyState message="No bookings yet — create one or share your online booking page." />}

      <Modal open={open} onClose={() => setOpen(false)} title="New booking">
        <form onSubmit={submit}>
          <FieldGroup>
            <Label>Client</Label>
            <Select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>Service</Label>
            <Select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
              <option value="">Select service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMins}min)
                </option>
              ))}
            </Select>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Date</Label>
              <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label>Time</Label>
              <Input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </FieldGroup>
          </div>
          {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Booking…" : "Create booking"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
