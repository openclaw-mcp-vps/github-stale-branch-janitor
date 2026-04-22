"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, ShieldCheck, Sparkles, TimerReset } from "lucide-react";

import { RepoSelector } from "@/components/RepoSelector";
import { StaleBranchList } from "@/components/StaleBranchList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RepoSummary, StaleBranch } from "@/lib/github";

type Recommendation = {
  id: string;
  repoFullName: string;
  thresholdDays: number;
  generatedAt: string;
  branches: Array<{
    name: string;
    daysStale: number;
    lastCommitDate: string;
    lastCommitAuthor: string;
    sha: string;
  }>;
};

type Schedule = {
  repoFullName: string;
  thresholdDays: number;
  frequencyDays: number;
  enabled: boolean;
  lastRunAt: string | null;
};

type DashboardClientProps = {
  userEmail: string;
};

export function DashboardClient({ userEmail }: DashboardClientProps) {
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [thresholdDays, setThresholdDays] = useState(45);
  const [branches, setBranches] = useState<StaleBranch[]>([]);
  const [isRepoLoading, setIsRepoLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scheduleFrequencyDays, setScheduleFrequencyDays] = useState(7);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const chartData = useMemo(
    () =>
      branches
        .slice(0, 10)
        .map((branch) => ({
          name: branch.name.length > 20 ? `${branch.name.slice(0, 17)}...` : branch.name,
          days: branch.daysStale
        })),
    [branches]
  );

  const oldestBranchDays = useMemo(() => {
    return branches.reduce((max, branch) => Math.max(max, branch.daysStale), 0);
  }, [branches]);

  const loadRepos = useCallback(async () => {
    setIsRepoLoading(true);
    setReposError(null);

    try {
      const response = await fetch("/api/repos", { cache: "no-store" });
      const payload = (await response.json()) as { repos?: RepoSummary[]; error?: string };

      if (!response.ok || !payload.repos) {
        throw new Error(payload.error ?? "Unable to load repositories.");
      }

      setRepos(payload.repos);
      if (!selectedRepo && payload.repos.length > 0) {
        setSelectedRepo(payload.repos[0].fullName);
      }
    } catch (caughtError) {
      setReposError(caughtError instanceof Error ? caughtError.message : "Unable to load repositories.");
    } finally {
      setIsRepoLoading(false);
    }
  }, [selectedRepo]);

  const loadSchedules = useCallback(async () => {
    const response = await fetch("/api/schedules", { cache: "no-store" });
    const payload = (await response.json()) as {
      schedules?: Schedule[];
      error?: string;
    };

    if (!response.ok || !payload.schedules) {
      return;
    }

    setSchedules(payload.schedules);
  }, []);

  const loadRecommendations = useCallback(async () => {
    const response = await fetch("/api/recommendations", { cache: "no-store" });
    const payload = (await response.json()) as {
      recommendations?: Recommendation[];
      error?: string;
    };

    if (!response.ok || !payload.recommendations) {
      return;
    }

    setRecommendations(payload.recommendations);
  }, []);

  async function scanSelectedRepo() {
    if (!selectedRepo) {
      setScanError("Pick a repository before scanning.");
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch("/api/branches/stale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoFullName: selectedRepo,
          thresholdDays
        })
      });

      const payload = (await response.json()) as {
        branches?: StaleBranch[];
        error?: string;
      };

      if (!response.ok || !payload.branches) {
        throw new Error(payload.error ?? "Stale branch scan failed.");
      }

      setBranches(payload.branches);
      await loadRecommendations();
    } catch (caughtError) {
      setScanError(caughtError instanceof Error ? caughtError.message : "Stale branch scan failed.");
    } finally {
      setIsScanning(false);
    }
  }

  async function saveSchedule() {
    if (!selectedRepo) {
      setScheduleMessage("Select a repository before scheduling.");
      return;
    }

    setIsSavingSchedule(true);
    setScheduleMessage(null);

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoFullName: selectedRepo,
          thresholdDays,
          frequencyDays: scheduleFrequencyDays,
          enabled: scheduleEnabled
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save schedule.");
      }

      setScheduleMessage("Auto-cleanup schedule saved.");
      await loadSchedules();
    } catch (caughtError) {
      setScheduleMessage(caughtError instanceof Error ? caughtError.message : "Unable to save schedule.");
    } finally {
      setIsSavingSchedule(false);
    }
  }

  useEffect(() => {
    void loadRepos();
    void loadSchedules();
    void loadRecommendations();
  }, [loadRecommendations, loadRepos, loadSchedules]);

  useEffect(() => {
    if (!selectedRepo || schedules.length === 0) return;

    const existing = schedules.find((schedule) => schedule.repoFullName === selectedRepo);
    if (!existing) return;

    setScheduleFrequencyDays(existing.frequencyDays);
    setScheduleEnabled(existing.enabled);
    setThresholdDays(existing.thresholdDays);
  }, [selectedRepo, schedules]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Connected GitHub identity</CardDescription>
            <CardTitle className="truncate text-lg">{userEmail || "GitHub account connected"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-[#13233b] text-[#79c0ff]">OAuth active</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Stale branches detected</CardDescription>
            <CardTitle className="text-3xl">{branches.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-flex items-center gap-1 text-sm text-[#8b949e]">
              <Sparkles className="h-4 w-4" />
              Current threshold: {thresholdDays} days
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Oldest stale branch</CardDescription>
            <CardTitle className="text-3xl">{oldestBranchDays}d</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-flex items-center gap-1 text-sm text-[#8b949e]">
              <ShieldCheck className="h-4 w-4" />
              Archive before merge debt compounds
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <RepoSelector
            repos={repos}
            selectedRepo={selectedRepo}
            onChange={setSelectedRepo}
            onRefresh={() => void loadRepos()}
            isRefreshing={isRepoLoading}
          />

          <Card>
            <CardHeader>
              <CardTitle>Staleness Scan</CardTitle>
              <CardDescription>Scan selected repository for branches older than your policy threshold.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="thresholdDays">Stale threshold (days)</Label>
                <Input
                  id="thresholdDays"
                  type="number"
                  min={7}
                  max={730}
                  value={thresholdDays}
                  onChange={(event) => setThresholdDays(Number(event.target.value || 45))}
                />
              </div>

              <Button onClick={() => void scanSelectedRepo()} disabled={!selectedRepo || isScanning}>
                {isScanning ? "Scanning..." : "Run Stale Branch Scan"}
              </Button>

              {reposError ? <p className="text-sm text-[#f85149]">{reposError}</p> : null}
              {scanError ? <p className="text-sm text-[#f85149]">{scanError}</p> : null}
            </CardContent>
          </Card>

          <StaleBranchList
            repoFullName={selectedRepo}
            branches={branches}
            onBranchArchived={(branchName, _archivedBranch) => {
              setBranches((current) => current.filter((branch) => branch.name !== branchName));
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>Stale Age Distribution</CardTitle>
              <CardDescription>Top stale branches by age in days.</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "0.75rem"
                      }}
                    />
                    <Bar dataKey="days" fill="#2f81f7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-[#8b949e]">Run a scan to populate stale branch analytics.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-4 w-4 text-[#79c0ff]" />
                Auto Cleanup Schedule
              </CardTitle>
              <CardDescription>
                Save a recurring policy so your cron runner can refresh recommendations automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="frequencyDays">Run frequency (days)</Label>
                <Input
                  id="frequencyDays"
                  type="number"
                  min={1}
                  max={30}
                  value={scheduleFrequencyDays}
                  onChange={(event) => setScheduleFrequencyDays(Number(event.target.value || 7))}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#8b949e]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#2f81f7]"
                  checked={scheduleEnabled}
                  onChange={(event) => setScheduleEnabled(event.target.checked)}
                />
                Enable recurring stale scan for this repository
              </label>

              <Button variant="secondary" onClick={() => void saveSchedule()} disabled={isSavingSchedule}>
                {isSavingSchedule ? "Saving..." : "Save Schedule"}
              </Button>

              {scheduleMessage ? <p className="text-sm text-[#79c0ff]">{scheduleMessage}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TimerReset className="h-4 w-4 text-[#79c0ff]" />
                Recent Cleanup Recommendations
              </CardTitle>
              <CardDescription>Generated by scheduled scans and available for one-click archive.</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <p className="text-sm text-[#8b949e]">No recommendations yet. Save a schedule and run your cron endpoint.</p>
              ) : (
                <ul className="space-y-3">
                  {recommendations.slice(0, 6).map((recommendation) => (
                    <li key={recommendation.id} className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3 text-sm text-[#c9d1d9]">
                      <p className="font-medium">{recommendation.repoFullName}</p>
                      <p className="text-xs text-[#8b949e]">
                        {recommendation.branches.length} branches over {recommendation.thresholdDays} days
                      </p>
                      <p className="mt-1 text-xs text-[#6e7681]">
                        Generated: {new Date(recommendation.generatedAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
