import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { DashboardApp } from "@/components/DashboardApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccessSession } from "@/lib/paywall";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const access = await getAccessSession();

  if (!access) {
    const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Card className="text-center">
          <CardHeader>
            <LockKeyhole className="mx-auto h-10 w-10 text-[#58a6ff]" />
            <CardTitle className="mt-5 text-3xl">Dashboard is behind the paywall</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-[#8b949e]">
              This feature is available to paid subscribers. Complete checkout, then claim access with your purchase email.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={paymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-[#238636] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2ea043]"
              >
                Buy on Stripe for $9/mo
              </a>
              <Link
                href="/purchase/success"
                className="inline-flex items-center justify-center rounded-xl border border-[#30363d] bg-[#161b22] px-5 py-2.5 text-sm font-semibold text-[#c9d1d9] transition hover:border-[#58a6ff]"
              >
                I already purchased
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
      <DashboardApp accessEmail={access.email} />
    </main>
  );
}
