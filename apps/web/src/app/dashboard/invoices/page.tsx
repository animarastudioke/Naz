"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string;
  number: string;
  status: string;
  total: string;
  balanceDue: string;
  dueDate: string;
  client: { fullName: string };
}
interface Client {
  id: string;
  fullName: string;
}
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}
const emptyItem = (): LineItem => ({ description: "", quantity: 1, unitPrice: 0, taxRate: 16 });

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurringInterval, setRecurringInterval] = useState("NONE");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const load = () => api.get<Invoice[]>("/invoices").then(setInvoices).catch(() => undefined);
  useEffect(() => {
    load();
    api.get<Client[]>("/clients").then(setClients).catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/invoices", { clientId, items, dueDate: new Date(dueDate).toISOString(), recurringInterval });
      setOpen(false);
      setItems([emptyItem()]);
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
          <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
          <p className="mt-1 text-sm text-ink-secondary">Track payment status and get paid via M-Pesa or card.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New invoice</Button>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Number</Th>
            <Th>Client</Th>
            <Th>Due</Th>
            <Th>Balance</Th>
            <Th>Status</Th>
          </tr>
        </Thead>
        <tbody>
          {invoices.map((inv) => (
            <Tr key={inv.id}>
              <Td>
                <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium text-brand-600 hover:underline">
                  {inv.number}
                </Link>
              </Td>
              <Td>{inv.client.fullName}</Td>
              <Td>{new Date(inv.dueDate).toLocaleDateString()}</Td>
              <Td>KES {Number(inv.balanceDue).toLocaleString()}</Td>
              <Td>
                <Badge status={inv.status}>{inv.status}</Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {invoices.length === 0 && <EmptyState message="No invoices yet." />}

      <Modal open={open} onClose={() => setOpen(false)} title="New invoice">
        <form onSubmit={submit}>
          <FieldGroup>
            <Label>Client</Label>
            <Select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Due date</Label>
              <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label>Recurring</Label>
              <Select value={recurringInterval} onChange={(e) => setRecurringInterval(e.target.value)}>
                <option value="NONE">One-time</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUALLY">Annually</option>
              </Select>
            </FieldGroup>
          </div>

          <Label>Line items</Label>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-5"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => setItems(items.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => setItems(items.map((it, i) => (i === idx ? { ...it, quantity: Number(e.target.value) } : it)))}
                />
                <Input
                  className="col-span-3"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Unit price"
                  value={item.unitPrice}
                  onChange={(e) => setItems(items.map((it, i) => (i === idx ? { ...it, unitPrice: Number(e.target.value) } : it)))}
                />
                <Input
                  className="col-span-1"
                  type="number"
                  min={0}
                  placeholder="VAT%"
                  value={item.taxRate}
                  onChange={(e) => setItems(items.map((it, i) => (i === idx ? { ...it, taxRate: Number(e.target.value) } : it)))}
                />
                <button
                  type="button"
                  className="col-span-1 text-ink-muted hover:text-status-critical"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setItems([...items, emptyItem()])}>
            + Add line item
          </Button>

          {error && <p className="mb-4 mt-4 text-sm text-status-critical">{error}</p>}
          <Button type="submit" className="mt-4 w-full" disabled={loading}>
            {loading ? "Saving…" : "Create invoice"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
