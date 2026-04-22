import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/DashboardClient";
import { UnlockAccessForm } from "@/components/UnlockAccessForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/paywall";

const checkoutLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect("/api/auth/github");
  }

  const cookieStore = await cookies();
  const paidAccess = hasPaidAccess(cookieStore);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 pb-16 pt-10 md:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Stale Branch Dashboard</h1>
          <p className="text-sm text-[#8b949e]">Scan repositories, schedule recurring cleanup, and archive dead refs safely.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={paidAccess ? "bg-[#13233b] text-[#79c0ff]" : "bg-[#3a1515] text-[#ffa198]"}>
            {paidAccess ? "Paid access active" : "Paywall locked"}
          </Badge>
          <Link
            href="/api/auth/signout"
            className="inline-flex h-10 items-center rounded-xl border border-[#30363d] px-4 text-sm text-[#c9d1d9] hover:bg-[#161b22]"
          >
            Sign out
          </Link>
        </div>
      </header>

      {paidAccess ? (
        <DashboardClient userEmail={session.user?.email ?? ""} />
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Unlock Dashboard Access</CardTitle>
            <CardDescription>
              Complete checkout, then confirm the same email used at payment. Access is stored as a secure cookie on this browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {checkoutLink ? (
              <a href={checkoutLink} className="inline-flex h-11 items-center rounded-xl bg-[#2f81f7] px-6 font-medium text-white hover:bg-[#1f6feb]">
                Open Stripe Checkout
              </a>
            ) : (
              <p className="rounded-xl border border-[#3d1f1f] bg-[#2b1414] p-3 text-sm text-[#ffa198]">
                Missing NEXT_PUBLIC_STRIPE_PAYMENT_LINK. Set it to your hosted Stripe Payment Link.
              </p>
            )}

            <UnlockAccessForm defaultEmail={session.user?.email ?? ""} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
