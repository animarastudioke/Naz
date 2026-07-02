"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";

interface Client {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  company?: string;
  segment?: string;
  loyaltyPoints: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", company: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get<Client[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(setClients).catch(() => undefined);
  };

  useEffect(() => { load(); }, [search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/clients", form);
      setOpen(false);
      setForm({ fullName: "", phone: "", email: "", company: "", notes: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink-secondary">Your CRM — every client, booking and conversation in one place.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add client</Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input placeholder="Search by name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>Phone</Th>
            <Th>Company</Th>
            <Th>Segment</Th>
            <Th>Loyalty pts</Th>
          </tr>
        </Thead>
        <tbody>
          {clients.map((c) => (
            <Tr key={c.id}>
              <Td>
                <Link href={`/dashboard/clients/${c.id}`} className="font-medium text-brand-600 hover:underline">
                  {c.fullName}
                </Link>
              </Td>
              <Td>{c.phone}</Td>
              <Td>{c.company ?? "—"}</Td>
              <Td>{c.segment ?? "—"}</Td>
              <Td>{c.loyaltyPoints}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {clients.length === 0 && <EmptyState message="No clients yet — add your first one." />}

      <Modal open={open} onClose={() => setOpen(false)} title="Add client">
        <form onSubmit={submit}>
          <FieldGroup>
            <Label>Full name</Label>
            <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <Label>Phone (WhatsApp)</Label>
            <Input required placeholder="2547XXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <Label>Company</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FieldGroup>
          {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Add client"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
