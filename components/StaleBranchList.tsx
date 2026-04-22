"use client";

import { formatDistanceToNowStrict, formatISO9075 } from "date-fns";
import { AlertTriangle, GitCommitVertical, User } from "lucide-react";

import { ArchiveButton } from "@/components/ArchiveButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StaleBranch } from "@/lib/github";

type StaleBranchListProps = {
  repoFullName: string;
  branches: StaleBranch[];
  onBranchArchived: (branchName: string, archivedBranch: string) => void;
};

export function StaleBranchList({ repoFullName, branches, onBranchArchived }: StaleBranchListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#f7903d]" />
          Stale Branches
        </CardTitle>
        <CardDescription>
          Branches older than your threshold with last commit owner and timestamp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {branches.length === 0 ? (
          <p className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 text-sm text-[#8b949e]">
            Nothing stale right now. Your branch hygiene is healthy.
          </p>
        ) : (
          <ul className="space-y-3">
            {branches.map((branch) => {
              const committedAt = new Date(branch.lastCommitDate);

              return (
                <li
                  key={branch.name}
                  className="flex flex-col gap-3 rounded-xl border border-[#30363d] bg-[#0d1117] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-md bg-[#21262d] px-2 py-1 font-mono text-xs text-[#79c0ff]">{branch.name}</code>
                      <Badge>{branch.daysStale} days stale</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8b949e]">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {branch.lastCommitAuthor}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GitCommitVertical className="h-3.5 w-3.5" />
                        {formatDistanceToNowStrict(committedAt, { addSuffix: true })}
                      </span>
                      <span title={formatISO9075(committedAt)}>{formatISO9075(committedAt)}</span>
                    </div>
                  </div>

                  <ArchiveButton
                    repoFullName={repoFullName}
                    branchName={branch.name}
                    onArchived={(archivedBranch) => onBranchArchived(branch.name, archivedBranch)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
