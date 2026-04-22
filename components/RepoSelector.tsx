"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Repo = {
  id: number;
  fullName: string;
  updatedAt: string;
};

type RepoSelectorProps = {
  repos: Repo[];
  selectedRepo: string;
  onSelectRepo: (repo: string) => void;
  thresholdDays: number;
  onThresholdDaysChange: (days: number) => void;
  scanning: boolean;
  onScan: () => void;
};

export function RepoSelector({
  repos,
  selectedRepo,
  onSelectRepo,
  thresholdDays,
  onThresholdDaysChange,
  scanning,
  onScan,
}: RepoSelectorProps) {
  return (
    <section className="surface rounded-2xl p-5 md:p-6">
      <h2 className="text-xl font-semibold text-[#f0f6fc]">Scan Repository</h2>
      <p className="mt-2 text-sm text-[#8b949e]">
        Choose a repository and staleness threshold to find old branches that are safe to archive.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_160px_auto] md:items-end">
        <label className="space-y-2 text-sm">
          <span className="mono text-xs uppercase tracking-[0.12em] text-[#8b949e]">Repository</span>
          <select
            value={selectedRepo}
            onChange={(event) => onSelectRepo(event.target.value)}
            className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] outline-none focus:border-[#58a6ff]"
          >
            {repos.length === 0 ? <option value="">No repositories available</option> : null}
            {repos.map((repo) => (
              <option key={repo.id} value={repo.fullName}>
                {repo.fullName}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="mono text-xs uppercase tracking-[0.12em] text-[#8b949e]">Stale After (Days)</span>
          <input
            type="number"
            min={1}
            max={3650}
            value={thresholdDays}
            onChange={(event) => onThresholdDaysChange(Number(event.target.value))}
            className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] outline-none focus:border-[#58a6ff]"
          />
        </label>

        <Button type="button" onClick={onScan} disabled={!selectedRepo || scanning}>
          <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning" : "Find Stale Branches"}
        </Button>
      </div>
    </section>
  );
}
