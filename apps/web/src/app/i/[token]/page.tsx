"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PublicInvoice {
  number: string;
  status: string;
  total: string;
  balanceDue: string;
  currency: string;
  dueDate: string;
  items: { id: string; description: string; quantity: string; lineTotal: string }[];
  client: { fullName: string };
  business: { name: string };
}

export default function InvoicePublicPage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.public.get<PublicInvoice>(`/invoices/public/${token}`).then(setInvoice).catch(() => undefined);
  }, [token]);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.public.post(`/payments/public/${token}/mpesa-stk-push`, { phoneNumber: phone });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (!invoice) return <p className="p-10 text-center text-sm text-ink-muted">Loading…</p>;

  return (
    <main className="min-h-screen bg-plane px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-ink">{invoice.business.name}</h1>
          <Badge status={invoice.status}>{invoice.status}</Badge>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-ink">Invoice {invoice.number}</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Billed to {invoice.client.fullName} · Due {new Date(invoice.dueDate).toLocaleDateString()}
          </p>

          <table className="mt-4 w-full text-sm">
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-line-hairline last:border-0">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right font-medium">
                    {invoice.currency} {Number(item.lineTotal).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-right text-sm">
            <p className="font-semibold text-ink">
              Balance due: {invoice.currency} {Number(invoice.balanceDue).toLocaleString()}
            </p>
          </div>

          {Number(invoice.balanceDue) > 0 && (
            <div className="mt-6 border-t border-line-hairline pt-6">
              {sent ? (
                <p className="text-sm text-status-good">STK push sent — check your phone to complete payment.</p>
              ) : (
                <form onSubmit={pay}>
                  <FieldGroup>
                    <Label>Pay via M-Pesa — enter your phone number</Label>
                    <Input required placeholder="2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </FieldGroup>
                  {error && <p className="mb-3 text-sm text-status-critical">{error}</p>}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Sending…" : "Pay with M-Pesa"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
