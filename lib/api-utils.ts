export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, init);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function requiredText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function optionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
