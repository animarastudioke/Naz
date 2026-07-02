"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: { id: string; fullName: string; email: string };
  business?: { id: string; name: string; slug: string };
  requiresBusinessSelection?: boolean;
  preAuthToken?: string;
  memberships?: { businessId: string; businessName: string; role: string }[];
}

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState<LoginResponse["memberships"]>();
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.public.post<LoginResponse>("/auth/login", { email, password });
      if (res.requiresBusinessSelection) {
        setMemberships(res.memberships);
        setPreAuthToken(res.preAuthToken ?? null);
        return;
      }
      if (res.accessToken && res.refreshToken && res.user && res.business) {
        setSession({ user: res.user, business: res.business, accessToken: res.accessToken, refreshToken: res.refreshToken });
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const selectBusiness = async (businessId: string) => {
    if (!preAuthToken) return;
    setLoading(true);
    try {
      const res = await api.public.post<LoginResponse>("/auth/select-business", { preAuthToken, businessId });
      if (res.accessToken && res.refreshToken && res.user && res.business) {
        setSession({ user: res.user, business: res.business, accessToken: res.accessToken, refreshToken: res.refreshToken });
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-plane px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-ink">Welcome back</h1>
        <p className="mb-6 text-sm text-ink-secondary">Sign in to your KaziHQ workspace</p>

        {memberships ? (
          <div className="space-y-2">
            {memberships.map((m) => (
              <button
                key={m.businessId}
                onClick={() => selectBusiness(m.businessId)}
                className="w-full rounded-lg border border-line-hairline p-3 text-left text-sm hover:bg-plane"
              >
                <div className="font-medium text-ink">{m.businessName}</div>
                <div className="text-xs text-ink-muted">{m.role}</div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </FieldGroup>
            {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand-600">
            Start free
          </Link>
        </p>
      </Card>
    </main>
  );
}
