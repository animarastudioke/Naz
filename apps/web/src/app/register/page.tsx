"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    industry: "Photography",
    country: "KE",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.public.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; fullName: string; email: string };
        business: { id: string; name: string; slug: string };
      }>("/auth/register", form);
      setSession(res);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-plane px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-semibold text-ink">Create your workspace</h1>
        <p className="mb-6 text-sm text-ink-secondary">Free to start — no credit card required</p>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" required value={form.businessName} onChange={update("businessName")} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="ownerName">Your name</Label>
            <Input id="ownerName" required value={form.ownerName} onChange={update("ownerName")} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={update("email")} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" minLength={8} required value={form.password} onChange={update("password")} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="phone">Phone (WhatsApp number)</Label>
            <Input id="phone" placeholder="2547XXXXXXXX" required value={form.phone} onChange={update("phone")} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="industry">Industry</Label>
            <Select id="industry" value={form.industry} onChange={update("industry")}>
              {["Photography", "Events", "Hospitality", "Consulting", "Agency", "Beauty & Wellness", "Other"].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="country">Country</Label>
            <Select id="country" value={form.country} onChange={update("country")}>
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="TZ">Tanzania</option>
              <option value="RW">Rwanda</option>
              <option value="NG">Nigeria</option>
              <option value="ZA">South Africa</option>
              <option value="OTHER">Other</option>
            </Select>
          </FieldGroup>

          {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating workspace…" : "Create workspace"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
