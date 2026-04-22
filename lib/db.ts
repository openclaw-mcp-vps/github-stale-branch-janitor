import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

const paidCustomerSchema = z.object({
  email: z.string().email(),
  purchasedAt: z.string(),
  source: z.string().default("stripe"),
});

const scheduleSchema = z.object({
  id: z.string(),
  githubLogin: z.string(),
  repo: z.string(),
  thresholdDays: z.number().int().min(1).max(3650),
  cadence: z.enum(["daily", "weekly"]),
  timezone: z.string(),
  nextRunAt: z.string(),
  enabled: z.boolean(),
  encryptedGithubToken: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const storeSchema = z.object({
  paidCustomers: z.array(paidCustomerSchema).default([]),
  schedules: z.array(scheduleSchema).default([]),
});

export type PaidCustomer = z.infer<typeof paidCustomerSchema>;
export type CleanupSchedule = z.infer<typeof scheduleSchema>;
export type StoreData = z.infer<typeof storeSchema>;

const STORE_FILE_PATH = process.env.STORE_FILE_PATH ?? path.join(process.cwd(), "data", "store.json");

const EMPTY_STORE: StoreData = {
  paidCustomers: [],
  schedules: [],
};

async function ensureStoreExists(): Promise<void> {
  await fs.mkdir(path.dirname(STORE_FILE_PATH), { recursive: true });
  try {
    await fs.access(STORE_FILE_PATH);
  } catch {
    await fs.writeFile(STORE_FILE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

export async function readStore(): Promise<StoreData> {
  await ensureStoreExists();
  const raw = await fs.readFile(STORE_FILE_PATH, "utf8");

  if (!raw.trim()) {
    return EMPTY_STORE;
  }

  try {
    const parsed = JSON.parse(raw);
    return storeSchema.parse(parsed);
  } catch {
    return EMPTY_STORE;
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  await ensureStoreExists();
  const validated = storeSchema.parse(data);
  const tempPath = `${STORE_FILE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(validated, null, 2), "utf8");
  await fs.rename(tempPath, STORE_FILE_PATH);
}

export async function updateStore(
  updater: (current: StoreData) => StoreData | Promise<StoreData>,
): Promise<StoreData> {
  const current = await readStore();
  const next = await updater(current);
  await writeStore(next);
  return next;
}

export async function addOrUpdatePaidCustomer(email: string, source = "stripe"): Promise<PaidCustomer> {
  const normalizedEmail = email.trim().toLowerCase();
  const purchasedAt = new Date().toISOString();
  const customer: PaidCustomer = { email: normalizedEmail, purchasedAt, source };

  await updateStore((store) => {
    const index = store.paidCustomers.findIndex((entry) => entry.email === normalizedEmail);
    if (index === -1) {
      return { ...store, paidCustomers: [...store.paidCustomers, customer] };
    }

    const nextPaidCustomers = [...store.paidCustomers];
    nextPaidCustomers[index] = customer;
    return { ...store, paidCustomers: nextPaidCustomers };
  });

  return customer;
}

export async function hasPaidCustomer(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const store = await readStore();
  return store.paidCustomers.some((entry) => entry.email === normalizedEmail);
}

export async function upsertSchedule(schedule: CleanupSchedule): Promise<CleanupSchedule> {
  await updateStore((store) => {
    const index = store.schedules.findIndex((entry) => entry.id === schedule.id);
    if (index === -1) {
      return { ...store, schedules: [...store.schedules, schedule] };
    }

    const nextSchedules = [...store.schedules];
    nextSchedules[index] = schedule;
    return { ...store, schedules: nextSchedules };
  });

  return schedule;
}

export async function deleteSchedule(id: string): Promise<boolean> {
  let deleted = false;

  await updateStore((store) => {
    const nextSchedules = store.schedules.filter((entry) => entry.id !== id);
    deleted = nextSchedules.length !== store.schedules.length;
    return { ...store, schedules: nextSchedules };
  });

  return deleted;
}

export async function listSchedulesForLogin(githubLogin: string): Promise<CleanupSchedule[]> {
  const store = await readStore();
  return store.schedules
    .filter((entry) => entry.githubLogin === githubLogin)
    .sort((left, right) => left.nextRunAt.localeCompare(right.nextRunAt));
}

export async function listDueSchedules(now: Date): Promise<CleanupSchedule[]> {
  const nowIso = now.toISOString();
  const store = await readStore();

  return store.schedules.filter((entry) => entry.enabled && entry.nextRunAt <= nowIso);
}
