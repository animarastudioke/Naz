"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface InvoiceDetail {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  currency: string;
  dueDate: string;
  publicToken: string;
  client: { fullName: string; phone: string; email?: string };
  items: { id: string; description: string; quantity: string; unitPrice: string; lineTotal: string }[];
  payments: { id: string; method: string; status: string; amount: string; createdAt: string }[];
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [phone, setPhone] = useState("");

  const load = () => api.get<InvoiceDetail>(`/invoices/${id}`).then(setInvoice).catch(() => undefined);
  useEffect(() => { load(); }, [id]);

  if (!invoice) return <p className="text-sm text-ink-muted">Loading…</p>;

  const send = async (channel: "email" | "whatsapp" | "both") => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/invoices/${id}/send?channel=${channel}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const stkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/payments/mpesa/stk-push", {
        invoiceId: invoice.id,
        phoneNumber: phone,
        amount: Number(invoice.balanceDue),
        accountReference: invoice.number,
      });
      setMpesaOpen(false);
      alert("STK push sent — ask your client to check their phone.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const recordManual = async (method: "CASH" | "BANK_TRANSFER") => {
    setBusy(true);
    try {
      await api.post("/payments/manual", { invoiceId: invoice.id, amount: Number(invoice.balanceDue), method });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Invoice {invoice.number}</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {invoice.client.fullName} · Due {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>
        <Badge status={invoice.status}>{invoice.status}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-line-hairline last:border-0">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{invoice.currency} {Number(item.unitPrice).toLocaleString()}</td>
                <td className="py-2 text-right font-medium">{invoice.currency} {Number(item.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 space-y-1 text-right text-sm">
          <p>Total: {invoice.currency} {Number(invoice.total).toLocaleString()}</p>
          <p>Paid: {invoice.currency} {Number(invoice.amountPaid).toLocaleString()}</p>
          <p className="font-semibold text-ink">Balance due: {invoice.currency} {Number(invoice.balanceDue).toLocaleString()}</p>
        </div>
      </Card>

      {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}

      <div className="mb-6 flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => send("whatsapp")}>
          Send via WhatsApp
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => send("email")}>
          Send via email
        </Button>
        <a href={`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
          <Button variant="secondary">Download PDF</Button>
        </a>
        {Number(invoice.balanceDue) > 0 && (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setMpesaOpen(true)}>
              Collect via M-Pesa
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => recordManual("BANK_TRANSFER")}>
              Record bank transfer
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => recordManual("CASH")}>
              Record cash payment
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        {invoice.payments.length === 0 && <p className="text-sm text-ink-muted">No payments recorded yet</p>}
        <ul className="space-y-2">
          {invoice.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span>
                {p.method} — {invoice.currency} {Number(p.amount).toLocaleString()}
              </span>
              <Badge status={p.status}>{p.status}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={mpesaOpen} onClose={() => setMpesaOpen(false)} title="Collect via M-Pesa STK push">
        <form onSubmit={stkPush}>
          <FieldGroup>
            <Label>Client phone number</Label>
            <Input required placeholder="2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FieldGroup>
          <p className="mb-4 text-sm text-ink-secondary">
            We&apos;ll send an STK push for {invoice.currency} {Number(invoice.balanceDue).toLocaleString()}.
          </p>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send STK push"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
