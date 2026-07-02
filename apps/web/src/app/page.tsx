import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-plane px-6 text-center">
      <div className="max-w-2xl">
        <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-brand-500" />
        <h1 className="text-4xl font-semibold tracking-tight text-ink">
          Run bookings, quotes, invoices &amp; payments — from one place
        </h1>
        <p className="mt-4 text-lg text-ink-secondary">
          KaziHQ is the all-in-one business platform built for African freelancers, agencies, photographers and
          service businesses — with WhatsApp-first communication and M-Pesa built in.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/register" className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
            Start free
          </Link>
          <Link href="/login" className="rounded-lg border border-line-hairline bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
