"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.public.post("/users/accept-invite", { token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <h1 className="mb-1 text-xl font-semibold text-ink">Set your password</h1>
      <p className="mb-6 text-sm text-ink-secondary">Finish joining your team&apos;s workspace</p>
      {done ? (
        <p className="text-sm text-status-good">Password set — redirecting you to sign in…</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </FieldGroup>
          {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? "Saving…" : "Set password & continue"}
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-plane px-4">
      <Suspense>
        <AcceptInviteForm />
      </Suspense>
    </main>
  );
}
