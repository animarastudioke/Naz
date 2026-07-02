"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";

interface Membership {
  id: string;
  role: string;
  joinedAt?: string;
  user: { fullName: string; email: string };
}

const ROLES = ["ADMIN", "MANAGER", "STAFF", "VENDOR"];

export default function TeamPage() {
  const [team, setTeam] = useState<Membership[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", role: "STAFF" });

  const load = () => api.get<Membership[]>("/users").then(setTeam).catch(() => undefined);
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/users/invite", form);
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Team</h1>
          <p className="mt-1 text-sm text-ink-secondary">Invite staff and control what they can access.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Invite team member</Button>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
          </tr>
        </Thead>
        <tbody>
          {team.map((m) => (
            <Tr key={m.id}>
              <Td>{m.user.fullName}</Td>
              <Td>{m.user.email}</Td>
              <Td>{m.role}</Td>
              <Td>{m.joinedAt ? "Active" : "Invited"}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {team.length === 0 && <EmptyState message="No team members yet." />}

      <Modal open={open} onClose={() => setOpen(false)} title="Invite team member">
        <form onSubmit={submit}>
          <FieldGroup>
            <Label>Full name</Label>
            <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FieldGroup>
          <FieldGroup>
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </FieldGroup>
          {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending invite…" : "Send invite"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
