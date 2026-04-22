"use client";

import { FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PurchaseSuccessPage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/paywall/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Unable to verify purchase email");
      }

      setMessage("Purchase verified. Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="surface rounded-2xl p-8 md:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[#f0f6fc]">Unlock your dashboard after checkout</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#8b949e]">
          Enter the same email you used in Stripe checkout. We verify it against webhook records and set your access cookie.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="mono text-xs uppercase tracking-[0.12em] text-[#8b949e]">Purchase Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-[#e6edf3] outline-none focus:border-[#58a6ff]"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f6feb] px-4 py-2.5 font-semibold text-white transition hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submitting ? "Verifying" : "Verify Purchase and Unlock"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-[#7ee787]">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-[#ff7b72]">{error}</p> : null}

        <div className="mt-8 space-y-3 text-sm text-[#8b949e]">
          <p>
            Need to buy first?{" "}
            <a href={paymentLink} target="_blank" rel="noreferrer" className="text-[#58a6ff] underline underline-offset-4">
              Open Stripe checkout
            </a>
            .
          </p>
          <p>
            Return to the{" "}
            <Link href="/" className="text-[#58a6ff] underline underline-offset-4">
              landing page
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
