"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { CalendarClock, GitBranch, Loader2, LogOut, Repeat, ShieldCheck } from "lucide-react";

import { RepoSelector } from "@/components/RepoSelector";
import { StaleBranchList, type StaleBranchItem } from "@/components/StaleBranchList";

type RepoSummary = {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
};

type Schedule = {
  id: string;
  repo: string;
  thresholdDays: number;
  cadence: "daily" | "weekly";
  timezone: string;
  nextRunAt: string;
  enabled: boolean;
};

type Viewer = {
  login: string;
  avatarUrl: string;
  profileUrl: string;
};

type RepoApiPayload = {
  connected: boolean;
  viewer?: Viewer;
  repos: RepoSummary[];
  schedules?: Schedule[];
  message?: string;
  error?: string;
};

export function DashboardApp({ accessEmail }: { accessEmail: string }) {
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [connected, setConnected] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [thresholdDays, setThresholdDays] = useState(90);
  const [staleBranches, setStaleBranches] = useState<StaleBranchItem[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [cadence, setCadence] = useState<"daily" | "weekly">("weekly");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  useEffect(() => {
    void loadRepositories();
  }, []);

  async function loadRepositories() {
    setLoadingRepos(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/repos", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as RepoApiPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load repositories");
      }

      setConnected(payload.connected);
      setViewer(payload.viewer ?? null);
      setRepos(payload.repos ?? []);
      setSchedules(payload.schedules ?? []);
      setSelectedRepo((current) => current || payload.repos?.[0]?.fullName || "");
      setStatusMessage(payload.message ?? null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load dashboard data");
    } finally {
      setLoadingRepos(false);
    }
  }

  async function scanStaleBranches() {
    if (!selectedRepo) {
      setStatusMessage("Select a repository before scanning.");
      return;
    }

    setScanning(true);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/api/branches/stale?repo=${encodeURIComponent(selectedRepo)}&days=${thresholdDays}`,
      );
      const payload = (await response.json()) as {
        branches?: StaleBranchItem[];
        count?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to scan stale branches");
      }

      const branches = payload.branches ?? [];
      setStaleBranches(branches);
      setStatusMessage(`Scan complete: found ${payload.count ?? branches.length} stale branches.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  function handleArchivedBranches(branchNames: string[]) {
    if (branchNames.length === 0) {
      return;
    }

    setStaleBranches((current) => current.filter((branch) => !branchNames.includes(branch.name)));
  }

  async function createOrUpdateSchedule() {
    if (!selectedRepo) {
      setStatusMessage("Choose a repository before creating a schedule.");
      return;
    }

    setSavingSchedule(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: selectedRepo,
          thresholdDays,
          cadence,
          timezone,
        }),
      });

      const payload = (await response.json()) as {
        schedule?: Schedule;
        error?: string;
      };

      if (!response.ok || !payload.schedule) {
        throw new Error(payload.error ?? "Unable to save schedule");
      }

      setSchedules((current) => {
        const withoutCurrent = current.filter((entry) => entry.id !== payload.schedule?.id);
        return [payload.schedule!, ...withoutCurrent].sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt));
      });

      setStatusMessage(`Saved ${cadence} cleanup schedule for ${selectedRepo}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Schedule save failed");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function removeSchedule(id: string) {
    setStatusMessage(null);

    const response = await fetch(`/api/schedule?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setStatusMessage(payload.error ?? "Unable to remove schedule");
      return;
    }

    setSchedules((current) => current.filter((schedule) => schedule.id !== id));
    setStatusMessage("Schedule removed.");
  }

  async function disconnectGitHub() {
    await fetch("/api/auth/logout", { method: "POST" });
    setConnected(false);
    setViewer(null);
    setRepos([]);
    setStaleBranches([]);
    setSchedules([]);
    setStatusMessage("GitHub disconnected.");
  }

  if (loadingRepos) {
    return (
      <div className="surface flex items-center gap-3 rounded-2xl p-6 text-sm text-[#9ba7b4]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface rounded-2xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mono text-xs uppercase tracking-[0.14em] text-[#8b949e]">Paid Access</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#f0f6fc]">Stale Branch Cleanup Dashboard</h1>
            <p className="mt-2 text-sm text-[#8b949e]">
              Signed in for <span className="text-[#c9d1d9]">{accessEmail}</span>. Connect GitHub, scan stale branches,
              and archive with confidence.
            </p>
          </div>

          {connected && viewer ? (
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={viewer.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-[#c9d1d9]"
              >
                <GitBranch className="h-4 w-4" />
                {viewer.login}
              </a>
              <button
                type="button"
                onClick={disconnectGitHub}
                className="inline-flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-[#c9d1d9] transition hover:border-[#58a6ff]"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/auth/github?next=/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1f6feb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#388bfd]"
            >
              <GitBranch className="h-4 w-4" />
              Connect GitHub
            </a>
          )}
        </div>

        {statusMessage ? <p className="mt-4 text-sm text-[#8b949e]">{statusMessage}</p> : null}
      </section>

      {!connected ? (
        <section className="surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#f0f6fc]">GitHub connection required</h2>
          <p className="mt-2 text-sm text-[#8b949e]">
            Connect your GitHub account to scan repos. OAuth scope includes repository read access and branch management for
            archiving.
          </p>
          <a
            href="/api/auth/github?next=/dashboard"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1f6feb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#388bfd]"
          >
              <GitBranch className="h-4 w-4" />
              Connect GitHub
          </a>
        </section>
      ) : (
        <>
          <RepoSelector
            repos={repos}
            selectedRepo={selectedRepo}
            onSelectRepo={setSelectedRepo}
            thresholdDays={thresholdDays}
            onThresholdDaysChange={setThresholdDays}
            scanning={scanning}
            onScan={scanStaleBranches}
          />

          <section className="surface rounded-2xl p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#f0f6fc]">Auto-Schedule Cleanup</h2>
                <p className="mt-2 text-sm text-[#8b949e]">
                  Save a recurring cleanup job. Trigger <code className="mono">/api/schedule/run</code> from cron using your
                  <code className="mono"> CRON_SECRET</code>.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-2 text-xs text-[#8b949e]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#58a6ff]" />
                Branch deletion skips default and protected branches.
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
              <label className="space-y-2 text-sm">
                <span className="mono text-xs uppercase tracking-[0.12em] text-[#8b949e]">Repository</span>
                <select
                  value={selectedRepo}
                  onChange={(event) => setSelectedRepo(event.target.value)}
                  className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] outline-none focus:border-[#58a6ff]"
                >
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.fullName}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="mono text-xs uppercase tracking-[0.12em] text-[#8b949e]">Cadence</span>
                <select
                  value={cadence}
                  onChange={(event) => setCadence(event.target.value as "daily" | "weekly")}
                  className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] outline-none focus:border-[#58a6ff]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>

              <button
                type="button"
                onClick={createOrUpdateSchedule}
                disabled={savingSchedule}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1f6feb] px-4 font-semibold text-white transition hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Repeat className="h-4 w-4" />
                {savingSchedule ? "Saving" : "Save Schedule"}
              </button>
            </div>

            {schedules.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#30363d] text-left text-xs uppercase tracking-[0.08em] text-[#8b949e]">
                      <th className="px-2 py-2">Repository</th>
                      <th className="px-2 py-2">Threshold</th>
                      <th className="px-2 py-2">Cadence</th>
                      <th className="px-2 py-2">Next Run</th>
                      <th className="px-2 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id} className="border-b border-[#21262d]">
                        <td className="px-2 py-3 text-[#c9d1d9]">{schedule.repo}</td>
                        <td className="px-2 py-3 text-[#c9d1d9]">{schedule.thresholdDays} days</td>
                        <td className="px-2 py-3 text-[#c9d1d9]">{schedule.cadence}</td>
                        <td className="px-2 py-3 text-[#8b949e]">{new Date(schedule.nextRunAt).toUTCString()}</td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              void removeSchedule(schedule.id);
                            }}
                            className="rounded-md border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-xs font-semibold text-[#c9d1d9] transition hover:border-[#58a6ff]"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#8b949e]">No schedules configured yet.</p>
            )}
          </section>

          <StaleBranchList repo={selectedRepo} branches={staleBranches} onArchivedBranches={handleArchivedBranches} />
        </>
      )}

      <section className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 text-xs text-[#8b949e]">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-[#58a6ff]" />
          <span>
            Want to unlock another teammate? Send them to{" "}
            <Link href="/purchase/success" className="text-[#58a6ff] underline underline-offset-4">
              purchase access
            </Link>
            .
          </span>
        </div>
      </section>
    </div>
  );
}
