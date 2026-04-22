import { addDays } from "date-fns";

export type CleanupCadence = "daily" | "weekly";

export function getNextRunAt(cadence: CleanupCadence, from = new Date()): string {
  return addDays(from, cadence === "daily" ? 1 : 7).toISOString();
}
