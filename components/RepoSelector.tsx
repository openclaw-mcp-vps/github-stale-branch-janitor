"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RepoSummary } from "@/lib/github";

type RepoSelectorProps = {
  repos: RepoSummary[];
  selectedRepo: string;
  onChange: (repoFullName: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
};

export function RepoSelector({ repos, selectedRepo, onChange, onRefresh, isRefreshing }: RepoSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos;
    const term = search.toLowerCase();
    return repos.filter((repo) => repo.fullName.toLowerCase().includes(term));
  }, [repos, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Scope</CardTitle>
        <CardDescription>Choose the repository to scan for stale branches.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="repo-search">Search repos</Label>
          <Input
            id="repo-search"
            placeholder="owner/repo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="repo-select">Repository</Label>
          <select
            id="repo-select"
            className="h-10 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-[#c9d1d9] focus:border-[#2f81f7] focus:outline-none"
            value={selectedRepo}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">Select a repository</option>
            {filteredRepos.map((repo) => (
              <option key={repo.id} value={repo.fullName}>
                {repo.fullName}
              </option>
            ))}
          </select>
        </div>

        <Button type="button" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Repositories"}
        </Button>
      </CardContent>
    </Card>
  );
}
