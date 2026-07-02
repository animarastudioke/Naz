"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Quotation {
  id: string;
  number: string;
  title: string;
  status: string;
  total: string;
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

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [conversation, setConversation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const load = () => api.get<Quotation[]>("/quotations").then(setQuotations).catch(() => undefined);
  useEffect(() => {
    load();
    api.get<Client[]>("/clients").then(setClients).catch(() => undefined);
  }, []);

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (1 + i.taxRate / 100), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/quotations", { clientId, title, items });
      setOpen(false);
      setItems([emptyItem()]);
      setTitle("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const generateFromConversation = async () => {
    setAiLoading(true);
    try {
      const draft = await api.post<{ title: string; items: LineItem[] }>("/ai/quote-from-conversation", {
        conversationText: conversation,
      });
      setTitle(draft.title);
      setItems(draft.items.length ? draft.items.map((i) => ({ ...i, taxRate: i.taxRate ?? 16 })) : [emptyItem()]);
      setAiOpen(false);
      setOpen(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate a draft");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Quotations</h1>
          <p className="mt-1 text-sm text-ink-secondary">Send branded quotes clients can approve on WhatsApp.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAiOpen(true)}>
            ✨ Generate from WhatsApp chat
          </Button>
          <Button onClick={() => setOpen(true)}>New quotation</Button>
        </div>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Number</Th>
            <Th>Client</Th>
            <Th>Title</Th>
            <Th>Total</Th>
            <Th>Status</Th>
          </tr>
        </Thead>
        <tbody>
          {quotations.map((q) => (
            <Tr key={q.id}>
              <Td>
                <Link href={`/dashboard/quotations/${q.id}`} className="font-medium text-brand-600 hover:underline">
                  {q.number}
                </Link>
              </Td>
              <Td>{q.client.fullName}</Td>
              <Td>{q.title}</Td>
              <Td>KES {Number(q.total).toLocaleString()}</Td>
              <Td>
                <Badge status={q.status}>{q.status}</Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {quotations.length === 0 && <EmptyState message="No quotations yet." />}

      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="Generate quotation from WhatsApp conversation">
        <FieldGroup>
          <Label>Paste the conversation</Label>
          <Textarea
            rows={8}
            placeholder="Client: Hi, I need a wedding photographer for 200 guests on Dec 12...&#10;You: Sure! We'd recommend our full day package plus drone coverage..."
            value={conversation}
            onChange={(e) => setConversation(e.target.value)}
          />
        </FieldGroup>
        {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
        <Button className="w-full" disabled={aiLoading || conversation.length < 20} onClick={generateFromConversation}>
          {aiLoading ? "Reading conversation…" : "Generate draft"}
        </Button>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="New quotation">
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
          <FieldGroup>
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </FieldGroup>

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

          <div className="mt-4 flex justify-end text-sm font-semibold text-ink">Total: KES {total.toLocaleString()}</div>

          {error && <p className="mb-4 mt-2 text-sm text-status-critical">{error}</p>}
          <Button type="submit" className="mt-4 w-full" disabled={loading}>
            {loading ? "Saving…" : "Create quotation"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
