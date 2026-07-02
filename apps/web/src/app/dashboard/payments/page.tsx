"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: string;
  reconciled: boolean;
  createdAt: string;
  client?: { fullName: string };
  invoice?: { number: string };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    api.get<Payment[]>("/payments").then(setPayments).catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Payments</h1>
      <p className="mt-1 text-sm text-ink-secondary">M-Pesa, card, bank transfer and cash — reconciled in one ledger.</p>

      <Table>
        <Thead>
          <tr>
            <Th>Date</Th>
            <Th>Client</Th>
            <Th>Invoice</Th>
            <Th>Method</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Reconciled</Th>
          </tr>
        </Thead>
        <tbody>
          {payments.map((p) => (
            <Tr key={p.id}>
              <Td>{new Date(p.createdAt).toLocaleDateString()}</Td>
              <Td>{p.client?.fullName ?? "—"}</Td>
              <Td>{p.invoice?.number ?? "—"}</Td>
              <Td>{p.method}</Td>
              <Td>KES {Number(p.amount).toLocaleString()}</Td>
              <Td>
                <Badge status={p.status}>{p.status}</Badge>
              </Td>
              <Td>{p.reconciled ? "Yes" : "No"}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {payments.length === 0 && <EmptyState message="No payments recorded yet." />}
    </div>
  );
}
