import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Entitlement = {
  email: string;
  purchasedAt: string;
  sourceEventId?: string;
};

export type StaleBranchRecommendation = {
  name: string;
  sha: string;
  lastCommitDate: string;
  lastCommitAuthor: string;
  daysStale: number;
};

export type CleanupSchedule = {
  id: string;
  userId: string;
  githubAccessToken: string;
  repoFullName: string;
  thresholdDays: number;
  frequencyDays: number;
  enabled: boolean;
  lastRunAt: string | null;
  updatedAt: string;
};

export type RecommendationRecord = {
  id: string;
  userId: string;
  repoFullName: string;
  thresholdDays: number;
  generatedAt: string;
  branches: StaleBranchRecommendation[];
};

export type ArchiveLogRecord = {
  id: string;
  userId: string;
  repoFullName: string;
  originalBranch: string;
  archivedBranch: string;
  archivedAt: string;
};

type StoreShape = {
  entitlements: Entitlement[];
  schedules: CleanupSchedule[];
  recommendations: RecommendationRecord[];
  archiveLogs: ArchiveLogRecord[];
};

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const EMPTY_STORE: StoreShape = {
  entitlements: [],
  schedules: [],
  recommendations: [],
  archiveLogs: []
};

let writeQueue = Promise.resolve();

async function ensureStoreExists() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<StoreShape> {
  await ensureStoreExists();
  const raw = await fs.readFile(STORE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      entitlements: parsed.entitlements ?? [],
      schedules: parsed.schedules ?? [],
      recommendations: parsed.recommendations ?? [],
      archiveLogs: parsed.archiveLogs ?? []
    };
  } catch {
    return EMPTY_STORE;
  }
}

function writeStore(nextStore: StoreShape) {
  writeQueue = writeQueue.then(async () => {
    await ensureStoreExists();
    const tmpPath = `${STORE_PATH}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(nextStore, null, 2), "utf8");
    await fs.rename(tmpPath, STORE_PATH);
  });

  return writeQueue;
}

export async function upsertEntitlement(email: string, sourceEventId?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const store = await readStore();
  const existing = store.entitlements.find((item) => item.email === normalizedEmail);

  if (existing) {
    existing.purchasedAt = new Date().toISOString();
    existing.sourceEventId = sourceEventId;
  } else {
    store.entitlements.push({
      email: normalizedEmail,
      purchasedAt: new Date().toISOString(),
      sourceEventId
    });
  }

  await writeStore(store);
}

export async function hasEntitlement(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;
  const store = await readStore();
  return store.entitlements.some((item) => item.email === normalizedEmail);
}

export async function saveSchedule(input: Omit<CleanupSchedule, "id" | "updatedAt" | "lastRunAt"> & { lastRunAt?: string | null }) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = store.schedules.find(
    (schedule) =>
      schedule.userId === input.userId &&
      schedule.repoFullName.toLowerCase() === input.repoFullName.toLowerCase()
  );

  if (existing) {
    existing.githubAccessToken = input.githubAccessToken;
    existing.thresholdDays = input.thresholdDays;
    existing.frequencyDays = input.frequencyDays;
    existing.enabled = input.enabled;
    existing.updatedAt = now;
    existing.lastRunAt = input.lastRunAt ?? existing.lastRunAt;
  } else {
    store.schedules.push({
      id: randomUUID(),
      userId: input.userId,
      githubAccessToken: input.githubAccessToken,
      repoFullName: input.repoFullName,
      thresholdDays: input.thresholdDays,
      frequencyDays: input.frequencyDays,
      enabled: input.enabled,
      lastRunAt: input.lastRunAt ?? null,
      updatedAt: now
    });
  }

  await writeStore(store);
}

export async function getSchedulesByUser(userId: string) {
  const store = await readStore();
  return store.schedules.filter((schedule) => schedule.userId === userId);
}

export async function getAllEnabledSchedules() {
  const store = await readStore();
  return store.schedules.filter((schedule) => schedule.enabled);
}

export async function updateScheduleLastRun(id: string, lastRunAt: string) {
  const store = await readStore();
  const schedule = store.schedules.find((item) => item.id === id);
  if (!schedule) return;

  schedule.lastRunAt = lastRunAt;
  schedule.updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function upsertRecommendation(input: {
  userId: string;
  repoFullName: string;
  thresholdDays: number;
  branches: StaleBranchRecommendation[];
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = store.recommendations.find(
    (recommendation) =>
      recommendation.userId === input.userId &&
      recommendation.repoFullName.toLowerCase() === input.repoFullName.toLowerCase()
  );

  if (existing) {
    existing.thresholdDays = input.thresholdDays;
    existing.generatedAt = now;
    existing.branches = input.branches;
  } else {
    store.recommendations.push({
      id: randomUUID(),
      userId: input.userId,
      repoFullName: input.repoFullName,
      thresholdDays: input.thresholdDays,
      generatedAt: now,
      branches: input.branches
    });
  }

  await writeStore(store);
}

export async function getRecommendationsByUser(userId: string) {
  const store = await readStore();

  return store.recommendations
    .filter((record) => record.userId === userId)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export async function addArchiveLog(input: Omit<ArchiveLogRecord, "id" | "archivedAt">) {
  const store = await readStore();
  store.archiveLogs.push({
    id: randomUUID(),
    userId: input.userId,
    repoFullName: input.repoFullName,
    originalBranch: input.originalBranch,
    archivedBranch: input.archivedBranch,
    archivedAt: new Date().toISOString()
  });

  await writeStore(store);
}
