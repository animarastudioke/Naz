"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  incurredAt: string;
}
interface Payout {
  id: string;
  vendorName?: string;
  description: string;
  amount: string;
  status: string;
  vendor?: { user: { fullName: string } };
}

const CATEGORIES = ["SUPPLIES", "TRAVEL", "MARKETING", "SOFTWARE", "VENDOR_PAYOUT", "UTILITIES", "RENT", "OTHER"];

export default function ExpensesPage() {
  const [tab, setTab] = useState<"expenses" | "payouts">("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: "SUPPLIES", description: "", amount: "", incurredAt: "" });
  const [payoutForm, setPayoutForm] = useState({ vendorName: "", description: "", amount: "" });

  const loadExpenses = () => api.get<Expense[]>("/expenses").then(setExpenses).catch(() => undefined);
  const loadPayouts = () => api.get<Payout[]>("/vendor-payouts").then(setPayouts).catch(() => undefined);

  useEffect(() => {
    loadExpenses();
    loadPayouts();
  }, []);

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/expenses", { ...form, amount: Number(form.amount), incurredAt: new Date(form.incurredAt).toISOString() });
      setOpen(false);
      loadExpenses();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/vendor-payouts", { ...payoutForm, amount: Number(payoutForm.amount) });
      setOpen(false);
      loadPayouts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (id: string) => {
    await api.patch(`/vendor-payouts/${id}/status`, { status: "PAID" }).catch(() => undefined);
    loadPayouts();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Expenses &amp; payouts</h1>
          <p className="mt-1 text-sm text-ink-secondary">Track spend and what you owe vendors or team members.</p>
        </div>
        <Button onClick={() => setOpen(true)}>{tab === "expenses" ? "Add expense" : "Add payout"}</Button>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("expenses")}
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === "expenses" ? "bg-brand-500 text-white" : "bg-white text-ink-secondary"}`}
        >
          Expenses
        </button>
        <button
          onClick={() => setTab("payouts")}
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === "payouts" ? "bg-brand-500 text-white" : "bg-white text-ink-secondary"}`}
        >
          Vendor payouts
        </button>
      </div>

      {tab === "expenses" ? (
        <Table>
          <Thead>
            <tr>
              <Th>Date</Th>
              <Th>Category</Th>
              <Th>Description</Th>
              <Th>Amount</Th>
            </tr>
          </Thead>
          <tbody>
            {expenses.map((e) => (
              <Tr key={e.id}>
                <Td>{new Date(e.incurredAt).toLocaleDateString()}</Td>
                <Td>{e.category}</Td>
                <Td>{e.description}</Td>
                <Td>KES {Number(e.amount).toLocaleString()}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Vendor</Th>
              <Th>Description</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {payouts.map((p) => (
              <Tr key={p.id}>
                <Td>{p.vendor?.user.fullName ?? p.vendorName}</Td>
                <Td>{p.description}</Td>
                <Td>KES {Number(p.amount).toLocaleString()}</Td>
                <Td>
                  <Badge status={p.status}>{p.status}</Badge>
                </Td>
                <Td>
                  {p.status !== "PAID" && (
                    <button className="text-xs text-brand-600" onClick={() => markPaid(p.id)}>
                      Mark paid
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {(tab === "expenses" ? expenses.length : payouts.length) === 0 && <EmptyState message="Nothing here yet." />}

      <Modal open={open} onClose={() => setOpen(false)} title={tab === "expenses" ? "Add expense" : "Add vendor payout"}>
        {tab === "expenses" ? (
          <form onSubmit={submitExpense}>
            <FieldGroup>
              <Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>Description</Label>
              <Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label>Amount (KES)</Label>
              <Input type="number" required min={0.01} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label>Date incurred</Label>
              <Input type="date" required value={form.incurredAt} onChange={(e) => setForm({ ...form, incurredAt: e.target.value })} />
            </FieldGroup>
            {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Add expense"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitPayout}>
            <FieldGroup>
              <Label>Vendor / team member name</Label>
              <Input required value={payoutForm.vendorName} onChange={(e) => setPayoutForm({ ...payoutForm, vendorName: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label>Description</Label>
              <Input required value={payoutForm.description} onChange={(e) => setPayoutForm({ ...payoutForm, description: e.target.value })} />
            </FieldGroup>
            <FieldGroup>
              <Label>Amount (KES)</Label>
              <Input type="number" required min={0.01} step="0.01" value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} />
            </FieldGroup>
            {error && <p className="mb-4 text-sm text-status-critical">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Add payout"}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
