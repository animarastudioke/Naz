"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";

interface Business {
  id: string;
  name: string;
  kraPin?: string;
  vatRegistered: boolean;
  vatRate: string;
  invoicePrefix: string;
  quotePrefix: string;
  currency: string;
}
interface Integrations {
  mpesaConfigured: boolean;
  mpesaEnv: string;
  stripeConfigured: boolean;
  whatsappConfigured: boolean;
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpesa, setMpesa] = useState({ mpesaShortcode: "", mpesaConsumerKey: "", mpesaConsumerSecret: "", mpesaPasskey: "" });
  const [whatsapp, setWhatsapp] = useState({ whatsappPhoneNumberId: "", whatsappAccessToken: "" });
  const [stripe, setStripe] = useState({ stripeSecretKey: "" });

  useEffect(() => {
    api.get<Business>("/business/me").then(setBusiness).catch(() => undefined);
    api.get<Integrations>("/business/integrations").then(setIntegrations).catch(() => undefined);
  }, []);

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setError(null);
    try {
      await api.patch("/business/me", {
        name: business.name,
        kraPin: business.kraPin,
        vatRegistered: business.vatRegistered,
        vatRate: Number(business.vatRate),
        invoicePrefix: business.invoicePrefix,
        quotePrefix: business.quotePrefix,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  const saveIntegration = async (payload: Record<string, string>) => {
    try {
      const updated = await api.patch<Integrations>("/business/integrations", payload);
      setIntegrations(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  if (!business) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-secondary">Business profile, tax settings and integrations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <form onSubmit={saveBusiness}>
          <FieldGroup>
            <Label>Business name</Label>
            <Input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <Label>KRA PIN</Label>
            <Input value={business.kraPin ?? ""} onChange={(e) => setBusiness({ ...business, kraPin: e.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <Label>VAT rate (%)</Label>
            <Input type="number" value={business.vatRate} onChange={(e) => setBusiness({ ...business, vatRate: e.target.value })} />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Invoice prefix</Label>
              <Input value={business.invoicePrefix} onChange={(e) => setBusiness({ ...business, invoicePrefix: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label>Quote prefix</Label>
              <Input value={business.quotePrefix} onChange={(e) => setBusiness({ ...business, quotePrefix: e.target.value })} />
            </FieldGroup>
          </div>
          {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
          <Button type="submit">{saved ? "Saved ✓" : "Save changes"}</Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>M-Pesa (Daraja STK push) {integrations?.mpesaConfigured && "· Connected"}</CardTitle>
        </CardHeader>
        <FieldGroup>
          <Label>Shortcode</Label>
          <Input value={mpesa.mpesaShortcode} onChange={(e) => setMpesa({ ...mpesa, mpesaShortcode: e.target.value })} />
        </FieldGroup>
        <FieldGroup>
          <Label>Consumer key</Label>
          <Input value={mpesa.mpesaConsumerKey} onChange={(e) => setMpesa({ ...mpesa, mpesaConsumerKey: e.target.value })} />
        </FieldGroup>
        <FieldGroup>
          <Label>Consumer secret</Label>
          <Input type="password" value={mpesa.mpesaConsumerSecret} onChange={(e) => setMpesa({ ...mpesa, mpesaConsumerSecret: e.target.value })} />
        </FieldGroup>
        <FieldGroup>
          <Label>Passkey</Label>
          <Input type="password" value={mpesa.mpesaPasskey} onChange={(e) => setMpesa({ ...mpesa, mpesaPasskey: e.target.value })} />
        </FieldGroup>
        <Button onClick={() => saveIntegration(mpesa)}>Save M-Pesa credentials</Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Cloud API {integrations?.whatsappConfigured && "· Connected"}</CardTitle>
        </CardHeader>
        <FieldGroup>
          <Label>Phone number ID</Label>
          <Input value={whatsapp.whatsappPhoneNumberId} onChange={(e) => setWhatsapp({ ...whatsapp, whatsappPhoneNumberId: e.target.value })} />
        </FieldGroup>
        <FieldGroup>
          <Label>Access token</Label>
          <Input type="password" value={whatsapp.whatsappAccessToken} onChange={(e) => setWhatsapp({ ...whatsapp, whatsappAccessToken: e.target.value })} />
        </FieldGroup>
        <Button onClick={() => saveIntegration(whatsapp)}>Save WhatsApp credentials</Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe {integrations?.stripeConfigured && "· Connected"}</CardTitle>
        </CardHeader>
        <FieldGroup>
          <Label>Secret key</Label>
          <Input type="password" value={stripe.stripeSecretKey} onChange={(e) => setStripe({ stripeSecretKey: e.target.value })} />
        </FieldGroup>
        <Button onClick={() => saveIntegration(stripe)}>Save Stripe credentials</Button>
      </Card>
    </div>
  );
}
