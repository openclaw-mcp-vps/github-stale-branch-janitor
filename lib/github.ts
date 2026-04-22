import { randomBytes } from "node:crypto";

import { differenceInDays } from "date-fns";
import { cookies } from "next/headers";
import { Octokit } from "@octokit/rest";

export const GITHUB_TOKEN_COOKIE = "github_access_token";
export const GITHUB_STATE_COOKIE = "github_oauth_state";

export type GitHubViewer = {
  login: string;
  id: number;
  avatarUrl: string;
  profileUrl: string;
};

export type RepositorySummary = {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
};

export type StaleBranch = {
  name: string;
  sha: string;
  branchUrl: string;
  commitDate: string;
  commitAuthor: string;
  commitMessage: string;
  daysSinceCommit: number;
  protected: boolean;
};

export type ArchiveBranchResult = {
  branch: string;
  status: "archived" | "skipped" | "failed";
  detail: string;
  archivedAs?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export function parseRepositoryFullName(fullName: string): { owner: string; repo: string } {
  const trimmed = fullName.trim();
  const match = /^([^/]+)\/([^/]+)$/.exec(trimmed);
  if (!match) {
    throw new Error("Repository must be in owner/repo format");
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const currentIndex = cursor;
      cursor += 1;

      if (currentIndex >= items.length) {
        return;
      }

      output[currentIndex] = await mapper(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return output;
}

export function createOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function getGitHubAuthUrl(state: string): string {
  const clientId = requireEnv("GITHUB_CLIENT_ID");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/github/callback`;

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "repo read:user");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const clientId = requireEnv("GITHUB_CLIENT_ID");
  const clientSecret = requireEnv("GITHUB_CLIENT_SECRET");

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub OAuth exchange failed (${response.status})`);
  }

  const json = (await response.json()) as { access_token?: string; error_description?: string };
  if (!json.access_token) {
    throw new Error(json.error_description ?? "GitHub OAuth did not return an access token");
  }

  return json.access_token;
}

export async function getViewer(token: string): Promise<GitHubViewer> {
  const octokit = createOctokit(token);
  const { data } = await octokit.users.getAuthenticated();

  return {
    login: data.login,
    id: data.id,
    avatarUrl: data.avatar_url,
    profileUrl: data.html_url,
  };
}

export async function getGitHubTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GITHUB_TOKEN_COOKIE)?.value ?? null;
}

export async function listRepositories(token: string): Promise<RepositorySummary[]> {
  const octokit = createOctokit(token);

  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    affiliation: "owner,collaborator,organization_member",
    sort: "updated",
    per_page: 100,
  });

  return repos
    .filter((repo) => !repo.archived && !repo.disabled)
    .map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at ?? repo.created_at ?? new Date(0).toISOString(),
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function findStaleBranches(
  token: string,
  repository: string,
  thresholdDays: number,
): Promise<StaleBranch[]> {
  const { owner, repo } = parseRepositoryFullName(repository);
  const octokit = createOctokit(token);

  const [{ data: repoData }, branches] = await Promise.all([
    octokit.repos.get({ owner, repo }),
    octokit.paginate(octokit.repos.listBranches, {
      owner,
      repo,
      per_page: 100,
    }),
  ]);

  const defaultBranch = repoData.default_branch;

  const candidateBranches = branches.filter(
    (branch) => branch.name !== defaultBranch && !branch.name.startsWith("archive/"),
  );

  if (candidateBranches.length === 0) {
    return [];
  }

  const now = new Date();

  const branchInfo = await mapWithConcurrency(candidateBranches, 8, async (branch) => {
    const { data: commit } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: branch.commit.sha,
    });

    const commitDateRaw = commit.commit.committer?.date ?? commit.commit.author?.date;
    const commitDate = commitDateRaw ? new Date(commitDateRaw) : new Date(0);
    const daysSinceCommit = differenceInDays(now, commitDate);

    return {
      name: branch.name,
      sha: branch.commit.sha,
      branchUrl: `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch.name)}`,
      commitDate: commitDate.toISOString(),
      commitAuthor:
        commit.commit.author?.name ??
        commit.author?.login ??
        commit.commit.committer?.name ??
        "Unknown",
      commitMessage: commit.commit.message.split("\n")[0] ?? "No commit message",
      daysSinceCommit,
      protected: branch.protected,
    } satisfies StaleBranch;
  });

  return branchInfo
    .filter((branch) => branch.daysSinceCommit >= thresholdDays)
    .sort((left, right) => right.daysSinceCommit - left.daysSinceCommit);
}

async function resolveArchiveRefName(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const baseRef = `heads/archive/${branch}`;

  try {
    await octokit.git.getRef({ owner, repo, ref: baseRef });
    return `${baseRef}-${Date.now()}`;
  } catch {
    return baseRef;
  }
}

export async function archiveBranches(
  token: string,
  repository: string,
  branches: string[],
): Promise<ArchiveBranchResult[]> {
  const { owner, repo } = parseRepositoryFullName(repository);
  const octokit = createOctokit(token);

  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const results: ArchiveBranchResult[] = [];

  for (const branch of branches) {
    if (branch === defaultBranch) {
      results.push({
        branch,
        status: "skipped",
        detail: "Default branch cannot be archived",
      });
      continue;
    }

    if (branch.startsWith("archive/")) {
      results.push({
        branch,
        status: "skipped",
        detail: "Branch is already in archive namespace",
      });
      continue;
    }

    try {
      const { data: branchData } = await octokit.repos.getBranch({ owner, repo, branch });

      if (branchData.protected) {
        results.push({
          branch,
          status: "skipped",
          detail: "Protected branch cannot be archived",
        });
        continue;
      }

      const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
      const archiveRef = await resolveArchiveRefName(octokit, owner, repo, branch);

      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/${archiveRef}`,
        sha: refData.object.sha,
      });

      await octokit.git.deleteRef({ owner, repo, ref: `heads/${branch}` });

      results.push({
        branch,
        status: "archived",
        detail: "Archived successfully",
        archivedAs: archiveRef.replace(/^heads\//, ""),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown GitHub error";
      results.push({
        branch,
        status: "failed",
        detail: message,
      });
    }
  }

  return results;
}
