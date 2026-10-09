export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

/** A finite number, so NaN and Infinity from bad input read as missing. */
export function readNumber(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
