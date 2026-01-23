// app/billing/paypal/cancel/page.tsx

export default function PayPalCancelPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold mb-4">Upgrade cancelled</h1>
      <p className="mb-6">
        No worries - your card was not charged and your plan stayed the same.
      </p>
      <a
        href="/settings/billing"
        className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Back to billing
      </a>
    </div>
  );
}
