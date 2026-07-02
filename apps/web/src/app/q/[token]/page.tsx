"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PublicQuotation {
  number: string;
  title: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  currency: string;
  expiresAt?: string;
  items: { id: string; description: string; quantity: string; unitPrice: string; lineTotal: string }[];
  client: { fullName: string };
  business: { name: string; logoUrl?: string; kraPin?: string };
}

export default function QuotationApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [quotation, setQuotation] = useState<PublicQuotation | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.public.get<PublicQuotation>(`/quotations/public/${token}`).then(setQuotation).catch(() => undefined);
  useEffect(() => { load(); }, [token]);

  const approve = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.public.post(`/quotations/public/${token}/approve`, { signatureName });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      await api.public.post(`/quotations/public/${token}/decline`, {});
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!quotation) return <p className="p-10 text-center text-sm text-ink-muted">Loading…</p>;

  const canDecide = quotation.status === "SENT" || quotation.status === "VIEWED";

  return (
    <main className="min-h-screen bg-plane px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-ink">{quotation.business.name}</h1>
          <Badge status={quotation.status}>{quotation.status}</Badge>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-ink">
            Quotation {quotation.number} — {quotation.title}
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">Prepared for {quotation.client.fullName}</p>

          <table className="mt-4 w-full text-sm">
            <tbody>
              {quotation.items.map((item) => (
                <tr key={item.id} className="border-b border-line-hairline last:border-0">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right font-medium">
                    {quotation.currency} {Number(item.lineTotal).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-right text-sm">
            <p className="font-semibold text-ink">
              Total: {quotation.currency} {Number(quotation.total).toLocaleString()}
            </p>
          </div>

          {canDecide ? (
            <form onSubmit={approve} className="mt-6 border-t border-line-hairline pt-6">
              <FieldGroup>
                <Label>Type your full name to sign &amp; approve</Label>
                <Input required value={signatureName} onChange={(e) => setSignatureName(e.target.value)} />
              </FieldGroup>
              {error && <p className="mb-3 text-sm text-status-critical">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={busy} className="flex-1">
                  {busy ? "Submitting…" : "Approve & sign"}
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={decline}>
                  Decline
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-6 border-t border-line-hairline pt-6 text-sm text-ink-secondary">
              This quotation has already been {quotation.status.toLowerCase()}.
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
