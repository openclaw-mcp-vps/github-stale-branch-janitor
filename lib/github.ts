import { Octokit } from "@octokit/rest";
import { differenceInDays } from "date-fns";

export type RepoSummary = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  pushedAt: string | null;
  htmlUrl: string;
};

export type StaleBranch = {
  name: string;
  sha: string;
  lastCommitDate: string;
  lastCommitAuthor: string;
  lastCommitAuthorLogin: string | null;
  daysStale: number;
  htmlUrl: string;
};

function parseRepoFullName(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error("Repository must be in owner/name format.");
  }

  return { owner, repo };
}

export function createGithubClient(accessToken: string) {
  return new Octokit({
    auth: accessToken
  });
}

export async function fetchUserRepositories(accessToken: string): Promise<RepoSummary[]> {
  const octokit = createGithubClient(accessToken);

  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "updated",
    affiliation: "owner,collaborator,organization_member"
  });

  return repos.map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    private: repo.private,
    defaultBranch: repo.default_branch,
    pushedAt: repo.pushed_at,
    htmlUrl: repo.html_url
  }));
}

async function mapBranchesWithCommitMetadata(input: {
  octokit: Octokit;
  owner: string;
  repo: string;
  branchNames: { name: string; sha: string }[];
}) {
  const concurrency = 6;
  const result: StaleBranch[] = [];

  for (let index = 0; index < input.branchNames.length; index += concurrency) {
    const batch = input.branchNames.slice(index, index + concurrency);

    const mapped = await Promise.all(
      batch.map(async (branch) => {
        const commit = await input.octokit.repos.getCommit({
          owner: input.owner,
          repo: input.repo,
          ref: branch.sha
        });

        const authoredAt =
          commit.data.commit.author?.date ?? commit.data.commit.committer?.date ?? new Date(0).toISOString();

        const authoredBy =
          commit.data.author?.login ??
          commit.data.commit.author?.name ??
          commit.data.commit.committer?.name ??
          "Unknown";

        return {
          name: branch.name,
          sha: branch.sha,
          lastCommitDate: authoredAt,
          lastCommitAuthor: authoredBy,
          lastCommitAuthorLogin: commit.data.author?.login ?? null,
          daysStale: differenceInDays(new Date(), new Date(authoredAt)),
          htmlUrl: commit.data.html_url
        } satisfies StaleBranch;
      })
    );

    result.push(...mapped);
  }

  return result;
}

export async function fetchStaleBranches(input: {
  accessToken: string;
  repoFullName: string;
  thresholdDays: number;
}) {
  const { owner, repo } = parseRepoFullName(input.repoFullName);
  const octokit = createGithubClient(input.accessToken);

  const repoResponse = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoResponse.data.default_branch;

  const branches = await octokit.paginate(octokit.repos.listBranches, {
    owner,
    repo,
    per_page: 100
  });

  const candidates = branches
    .filter((branch) => branch.name !== defaultBranch)
    .filter((branch) => !branch.name.startsWith("archive/"))
    .map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha
    }));

  const enriched = await mapBranchesWithCommitMetadata({
    octokit,
    owner,
    repo,
    branchNames: candidates
  });

  return enriched
    .filter((branch) => branch.daysStale >= input.thresholdDays)
    .sort((a, b) => b.daysStale - a.daysStale);
}

function sanitizeArchiveName(branchName: string) {
  return branchName.replace(/[^a-zA-Z0-9/_-]/g, "-");
}

export async function archiveBranch(input: {
  accessToken: string;
  repoFullName: string;
  branchName: string;
}) {
  const { owner, repo } = parseRepoFullName(input.repoFullName);
  const octokit = createGithubClient(input.accessToken);

  const repoResponse = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoResponse.data.default_branch;

  if (input.branchName === defaultBranch) {
    throw new Error("Default branch cannot be archived.");
  }

  if (input.branchName.startsWith("archive/")) {
    throw new Error("Branch is already archived.");
  }

  const originalRef = `heads/${input.branchName}`;
  const currentRef = await octokit.git.getRef({
    owner,
    repo,
    ref: originalRef
  });

  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const archiveBase = `archive/${sanitizeArchiveName(input.branchName)}-${dateTag}`;

  let archiveRef = `refs/heads/${archiveBase}`;
  let suffix = 1;

  while (true) {
    try {
      await octokit.git.createRef({
        owner,
        repo,
        ref: archiveRef,
        sha: currentRef.data.object.sha
      });
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("Reference already exists")) {
        throw error;
      }

      suffix += 1;
      archiveRef = `refs/heads/${archiveBase}-${suffix}`;
    }
  }

  await octokit.git.deleteRef({
    owner,
    repo,
    ref: originalRef
  });

  return {
    archivedBranch: archiveRef.replace("refs/heads/", "")
  };
}
