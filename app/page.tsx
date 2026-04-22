import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, FolderGit2, ShieldCheck, Timer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const painPoints = [
  "Branches pile up after every feature flag experiment, hotfix, and release train.",
  "Teams lose confidence in what can be safely deleted, so everything gets left behind.",
  "Reviewing stale branches by hand burns engineering hours and still misses edge cases.",
];

const outcomes = [
  {
    icon: FolderGit2,
    title: "Real stale-branch inventory",
    description:
      "Scan any connected repository and get stale branches ranked by age, with commit author and date attached.",
  },
  {
    icon: ShieldCheck,
    title: "Safer archiving workflow",
    description:
      "Archive branch references under an archive namespace before deleting originals, so cleanup is auditable.",
  },
  {
    icon: CalendarClock,
    title: "Recurring branch hygiene",
    description:
      "Set daily or weekly cleanup schedules so stale branches stop growing between sprint cycles.",
  },
];

const faq = [
  {
    question: "What does “archive” do in GitHub Stale Branch Janitor?",
    answer:
      "The tool copies each selected branch into an archive namespace and then removes the original branch name. You retain a recoverable branch reference while keeping your primary branch list clean.",
  },
  {
    question: "Can this run automatically without manual scans?",
    answer:
      "Yes. You can save a cleanup schedule per repository with a staleness threshold. A scheduled run endpoint can be triggered by cron so cleanup stays consistent.",
  },
  {
    question: "How is access controlled after payment?",
    answer:
      "After checkout, your purchase email is validated against Stripe webhook records. Once confirmed, a secure access cookie unlocks the dashboard.",
  },
  {
    question: "Will protected or default branches be archived?",
    answer:
      "No. The API explicitly skips default branches and protected branches to avoid destructive changes to active workflows.",
  },
];

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-12 md:px-10">
      <header className="surface overflow-hidden rounded-2xl border p-8 shadow-[0_0_0_1px_rgba(56,139,253,0.12)] md:p-12">
        <div className="grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:items-end">
          <div className="space-y-6">
            <p className="mono inline-flex items-center gap-2 rounded-full border border-[#1f6feb]/40 bg-[#1f6feb]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#7fb3ff]">
              Dev Tools • GitHub Hygiene
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[#f0f6fc] md:text-6xl">
              Find and archive stale GitHub branches older than N days.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-[#9ba7b4]">
              Keep repositories clean without manual branch hunting. Connect GitHub, set your threshold, review stale branches,
              and archive in one click.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={paymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#238636] px-6 py-3 font-semibold text-white transition hover:bg-[#2ea043]"
              >
                Start Branch Cleanup for $9/mo
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-[#30363d] bg-[#161b22] px-6 py-3 font-semibold text-[#c9d1d9] transition hover:border-[#58a6ff]"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
          <div className="surface rounded-xl p-6">
            <p className="mono text-xs uppercase tracking-[0.16em] text-[#8b949e]">Why teams buy</p>
            <ul className="mt-4 space-y-4 text-sm text-[#c9d1d9]">
              <li className="flex items-start gap-3">
                <Timer className="mt-0.5 h-4 w-4 text-[#58a6ff]" />
                Avoid recurring cleanup chores across active repos.
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#58a6ff]" />
                Understand stale branches with author/date context before archiving.
              </li>
              <li className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-4 w-4 text-[#58a6ff]" />
                Turn branch hygiene into a scheduled maintenance task.
              </li>
            </ul>
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {painPoints.map((point) => (
          <Card key={point}>
            <CardHeader>
              <CardTitle className="text-lg">The branch sprawl problem</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm leading-relaxed text-[#9ba7b4]">{point}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold tracking-tight text-[#f0f6fc] md:text-4xl">Purpose-built solution</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {outcomes.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-[#58a6ff]" />
                <CardTitle className="mt-2 text-xl">{title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed text-[#9ba7b4]">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="surface rounded-2xl border p-8 md:p-10">
        <h2 className="text-3xl font-semibold tracking-tight text-[#f0f6fc]">Simple pricing for engineering teams</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#9ba7b4]">
          One plan. Full access to GitHub stale-branch scanning, archive actions, and scheduled cleanup jobs.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mono text-xs uppercase tracking-[0.14em] text-[#8b949e]">Plan</p>
            <p className="mt-2 text-5xl font-semibold text-[#f0f6fc]">$9<span className="text-lg text-[#8b949e]">/month</span></p>
            <ul className="mt-4 space-y-2 text-sm text-[#c9d1d9]">
              <li>Unlimited repository scans</li>
              <li>Branch author/date visibility before action</li>
              <li>Daily or weekly cleanup scheduling</li>
              <li>Cookie-based access after payment verification</li>
            </ul>
          </div>
          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#238636] px-6 py-3 font-semibold text-white transition hover:bg-[#2ea043]"
          >
            Buy Now on Stripe
          </a>
        </div>
      </section>

      <section className="space-y-4 pb-14">
        <h2 className="text-3xl font-semibold tracking-tight text-[#f0f6fc]">FAQ</h2>
        <div className="grid gap-4">
          {faq.map((item) => (
            <article key={item.question} className="surface rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#f0f6fc]">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9ba7b4]">{item.answer}</p>
            </article>
          ))}
        </div>
        <p className="pt-2 text-sm text-[#8b949e]">
          Already purchased? Visit{" "}
          <Link href="/purchase/success" className="text-[#58a6ff] underline underline-offset-4">
            purchase access
          </Link>{" "}
          to unlock your dashboard.
        </p>
      </section>
    </main>
  );
}
