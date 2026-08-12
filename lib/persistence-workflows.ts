export type SubmissionLock = { current: boolean };

export type PersistedRefreshResult = {
  committed: true;
  refreshed: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function reconcileSelection<T extends { id: string }>(
  selected: T | null,
  reloaded: T[],
): T | null {
  if (!selected || !isUuid(selected.id)) return null;
  return reloaded.find((item) => item.id === selected.id) ?? null;
}

export async function persistThenRefresh(
  persist: () => Promise<unknown>,
  refresh: () => Promise<unknown>,
): Promise<PersistedRefreshResult> {
  await persist();
  try {
    await refresh();
    return { committed: true, refreshed: true };
  } catch {
    return { committed: true, refreshed: false };
  }
}

export async function runSingleFlight(
  lock: SubmissionLock,
  submit: () => Promise<unknown>,
): Promise<boolean> {
  if (lock.current) return false;
  lock.current = true;
  try {
    await submit();
    return true;
  } finally {
    lock.current = false;
  }
}
