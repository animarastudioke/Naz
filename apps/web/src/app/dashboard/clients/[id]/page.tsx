"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClientDetail {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  loyaltyPoints: number;
  bookings: { id: string; startAt: string; status: string; service: { name: string } }[];
  quotations: { id: string; number: string; status: string; total: string }[];
  invoices: { id: string; number: string; status: string; total: string; balanceDue: string }[];
  communications: { id: string; channel: string; direction: string; message: string; createdAt: string }[];
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);

  useEffect(() => {
    api.get<ClientDetail>(`/clients/${id}`).then(setClient).catch(() => undefined);
  }, [id]);

  if (!client) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">{client.fullName}</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        {client.phone} {client.email ? `· ${client.email}` : ""} {client.company ? `· ${client.company}` : ""}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
          </CardHeader>
          {client.bookings.length === 0 && <p className="text-sm text-ink-muted">No bookings yet</p>}
          <ul className="space-y-2">
            {client.bookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <span>
                  {b.service.name} — {new Date(b.startAt).toLocaleString()}
                </span>
                <Badge status={b.status}>{b.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotations</CardTitle>
          </CardHeader>
          {client.quotations.length === 0 && <p className="text-sm text-ink-muted">No quotations yet</p>}
          <ul className="space-y-2">
            {client.quotations.map((q) => (
              <li key={q.id} className="flex items-center justify-between text-sm">
                <span>
                  {q.number} — KES {Number(q.total).toLocaleString()}
                </span>
                <Badge status={q.status}>{q.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          {client.invoices.length === 0 && <p className="text-sm text-ink-muted">No invoices yet</p>}
          <ul className="space-y-2">
            {client.invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm">
                <span>
                  {i.number} — balance KES {Number(i.balanceDue).toLocaleString()}
                </span>
                <Badge status={i.status}>{i.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communication timeline</CardTitle>
          </CardHeader>
          {client.communications.length === 0 && <p className="text-sm text-ink-muted">No messages logged yet</p>}
          <ul className="space-y-3">
            {client.communications.map((c) => (
              <li key={c.id} className="text-sm">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <span className="font-medium text-ink">{c.channel}</span>
                  <span>· {c.direction === "INBOUND" ? "received" : "sent"}</span>
                  <span>· {new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-0.5 text-ink-secondary">{c.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
