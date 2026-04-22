import Link from "next/link";
import { ArrowRight, Clock3, GitBranch, Shield, Sparkles, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "Will this delete active feature branches?",
    answer:
      "No. Every branch candidate is shown with the last commit author and date before any action. You can archive one-by-one or set conservative thresholds first."
  },
  {
    question: "What does archive mean in this tool?",
    answer:
      "The tool preserves commit history by moving stale branches under an archive/ namespace and then removing the original branch ref. Nothing is squashed or rewritten."
  },
  {
    question: "How does scheduled cleanup work?",
    answer:
      "You save a per-repository policy (threshold + frequency). Your cron endpoint runs scans on that cadence and publishes fresh recommendations in the dashboard."
  },
  {
    question: "Can I use this across multiple organizations?",
    answer:
      "Yes. GitHub OAuth scopes include repositories you can access, so private repos and organization repos appear in one unified selector."
  }
];

const checkoutLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-20 pt-10 md:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-sm font-semibold tracking-wide text-[#79c0ff]">
          GitHub Stale Branch Janitor
        </Link>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/auth/github"
            className="inline-flex h-10 items-center rounded-xl border border-[#30363d] bg-[#161b22] px-4 text-sm text-[#c9d1d9] hover:bg-[#21262d]"
          >
            Connect GitHub
          </a>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-xl bg-[#2f81f7] px-4 text-sm font-medium text-white hover:bg-[#1f6feb]"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Badge className="bg-[#13233b] text-[#79c0ff]">Dev-tools • $9/month per workspace</Badge>
          <h1 className="text-balance text-4xl font-semibold leading-tight text-white md:text-6xl">
            Find and archive stale GitHub branches before they become repo debt.
          </h1>
          <p className="max-w-2xl text-lg text-[#8b949e]">
            Engineering teams accumulate hundreds of dead refs. This janitor scans every repository, exposes stale branches with owner/date context, and lets you archive safely with one click.
          </p>
          <div className="flex flex-wrap gap-3">
            {checkoutLink ? (
              <a href={checkoutLink} className="inline-flex h-11 items-center rounded-xl bg-[#2f81f7] px-6 font-medium text-white hover:bg-[#1f6feb]">
                Buy Access
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            ) : (
              <span className="inline-flex h-11 items-center rounded-xl bg-[#21262d] px-6 text-sm text-[#8b949e]">
                Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK to enable checkout
              </span>
            )}
            <a
              href="/api/auth/github"
              className="inline-flex h-11 items-center rounded-xl border border-[#30363d] px-6 font-medium text-[#c9d1d9] hover:bg-[#161b22]"
            >
              Connect GitHub
            </a>
          </div>
        </div>

        <Card className="bg-[#101721]/90">
          <CardHeader>
            <CardTitle>What you get</CardTitle>
            <CardDescription>Purpose-built for teams shipping quickly across many repos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#c9d1d9]">
            <p className="flex items-start gap-2">
              <GitBranch className="mt-0.5 h-4 w-4 text-[#79c0ff]" />
              Org-wide repository selector with stale branch detection by commit age.
            </p>
            <p className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 text-[#79c0ff]" />
              Adjustable threshold in days to match your branch policy per repo.
            </p>
            <p className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 text-[#79c0ff]" />
              Archive action preserves branch history under `archive/*` refs.
            </p>
            <p className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-[#79c0ff]" />
              Scheduled cleanup recommendations that show up directly in dashboard.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">The Problem</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#8b949e]">
            Active repositories create stale branches faster than humans can clean them. The clutter slows branch navigation and increases accidental merges.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">The Solution</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#8b949e]">
            Scan once or run on schedule, identify branches older than policy, inspect author/date context, then archive safely in seconds.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Why Teams Pay</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[#8b949e]">
            A clean branch list is operational hygiene. Teams pay because manual branch hunting never happens when release pressure is high.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Simple hosted checkout. No seats, no usage tiers, no implementation overhead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-5xl font-semibold text-white">
              $9<span className="text-lg text-[#8b949e]">/month</span>
            </p>
            <p className="max-w-2xl text-sm text-[#8b949e]">
              Includes GitHub OAuth, stale branch scans, commit metadata, one-click archive actions, and recurring cleanup scheduling.
            </p>
            {checkoutLink ? (
              <a href={checkoutLink} className="inline-flex h-11 items-center rounded-xl bg-[#2f81f7] px-6 font-medium text-white hover:bg-[#1f6feb]">
                Start Cleanup Now
              </a>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Immediate ROI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#c9d1d9]">
            <p className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-[#79c0ff]" />
              Remove dead branches before they pollute repo navigation.
            </p>
            <p className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-[#79c0ff]" />
              Keep pull request targeting cleaner for busy teams.
            </p>
            <p className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-[#79c0ff]" />
              Enforce branch hygiene without adding manual process.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold text-white">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#8b949e]">{faq.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="flex flex-col items-start justify-between gap-3 border-t border-[#21262d] pt-8 text-sm text-[#6e7681] md:flex-row md:items-center">
        <p>Built for engineering teams that care about clean repositories and fewer branch mistakes.</p>
        <Link href="/dashboard" className="text-[#79c0ff] hover:text-[#a5d6ff]">
          Go to dashboard
        </Link>
      </footer>
    </main>
  );
}
