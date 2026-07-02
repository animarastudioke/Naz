"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";

interface PaymentLink {
  amount: string;
  status: string;
  invoice: { number: string; currency: string; business: { name: string } };
}

export default function PaymentLinkPage() {
  const { token } = useParams<{ token: string }>();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.public.get<PaymentLink>(`/payments/links/${token}`).then(setLink).catch(() => undefined);
  }, [token]);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.public.post(`/payments/public/links/${token}/mpesa-stk-push`, { phoneNumber: phone });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (!link) return <p className="p-10 text-center text-sm text-ink-muted">Loading…</p>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-plane px-4">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold text-ink">{link.invoice.business.name}</h1>
        <p className="mt-2 text-2xl font-semibold text-ink">
          {link.invoice.currency} {Number(link.amount).toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-ink-secondary">Invoice {link.invoice.number}</p>

        {sent ? (
          <p className="mt-6 text-sm text-status-good">STK push sent — check your phone to complete payment.</p>
        ) : (
          <form onSubmit={pay} className="mt-6 text-left">
            <FieldGroup>
              <Label>M-Pesa phone number</Label>
              <Input required placeholder="2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FieldGroup>
            {error && <p className="mb-3 text-sm text-status-critical">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Pay with M-Pesa"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
