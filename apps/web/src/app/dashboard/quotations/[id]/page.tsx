"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

interface QuotationDetail {
  id: string;
  number: string;
  title: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  depositAmount: string;
  currency: string;
  publicToken: string;
  client: { fullName: string; phone: string; email?: string };
  items: { id: string; description: string; quantity: string; unitPrice: string; lineTotal: string }[];
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const load = () => api.get<QuotationDetail>(`/quotations/${id}`).then(setQuotation).catch(() => undefined);
  useEffect(() => { load(); }, [id]);

  if (!quotation) return <p className="text-sm text-ink-muted">Loading…</p>;

  const send = async (channel: "email" | "whatsapp" | "both") => {
    setBusy(true);
    try {
      await api.post(`/quotations/${id}/send?channel=${channel}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const convert = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const invoice = await api.post<{ id: string }>(`/quotations/${id}/convert-to-invoice`, {
        dueDate: new Date(dueDate).toISOString(),
      });
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const approvalLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/q/${quotation.publicToken}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {quotation.number} — {quotation.title}
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">{quotation.client.fullName}</p>
        </div>
        <Badge status={quotation.status}>{quotation.status}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.id} className="border-b border-line-hairline last:border-0">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{quotation.currency} {Number(item.unitPrice).toLocaleString()}</td>
                <td className="py-2 text-right font-medium">{quotation.currency} {Number(item.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 space-y-1 text-right text-sm">
          <p>Subtotal: {quotation.currency} {Number(quotation.subtotal).toLocaleString()}</p>
          <p>Tax: {quotation.currency} {Number(quotation.taxAmount).toLocaleString()}</p>
          <p className="font-semibold text-ink">Total: {quotation.currency} {Number(quotation.total).toLocaleString()}</p>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Client approval link</CardTitle>
        </CardHeader>
        <p className="break-all text-sm text-brand-600">{approvalLink}</p>
        <p className="mt-1 text-xs text-ink-muted">Share this via WhatsApp for one-tap client approval and e-signature.</p>
      </Card>

      {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => send("whatsapp")}>
          Send via WhatsApp
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => send("email")}>
          Send via email
        </Button>
        {quotation.status === "APPROVED" && (
          <Button variant="secondary" onClick={() => setConvertOpen(true)}>
            Convert to invoice
          </Button>
        )}
      </div>

      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert to invoice">
        <form onSubmit={convert}>
          <FieldGroup>
            <Label>Due date</Label>
            <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Converting…" : "Create invoice"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
