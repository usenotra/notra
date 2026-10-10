import {
  TELEMETRY_CODE_FIELDS,
  TELEMETRY_CODE_PATTERN,
  TELEMETRY_ENUM_FIELDS,
  TELEMETRY_IDENTIFIER_FIELDS,
  TELEMETRY_IDENTIFIER_PATTERN,
  TELEMETRY_INTEGER_FIELDS,
  TELEMETRY_MODEL_PATTERN,
  TELEMETRY_NUMBER_FIELDS,
  TELEMETRY_PROVIDERS,
  TELEMETRY_ROUTE_SEGMENT_PATTERN,
  TELEMETRY_ROUTE_SENTINELS,
  TELEMETRY_SECRET_PATTERN,
} from "@notra/ai/constants/telemetry";

/** Validate values as well as field names at the second-destination boundary. */
export function telemetryValue(key: string, value: unknown): boolean {
  if (key === "timestamp") {
    return (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) &&
      Number.isFinite(Date.parse(value))
    );
  }
  if (key === "isByok") {
    return typeof value === "boolean";
  }
  if (key === "status") {
    return (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 100 &&
      value <= 599
    );
  }
  if (TELEMETRY_NUMBER_FIELDS.has(key)) {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (key === "balance" || value >= 0) &&
      (!TELEMETRY_INTEGER_FIELDS.has(key) || Number.isSafeInteger(value))
    );
  }
  const choices = Object.hasOwn(TELEMETRY_ENUM_FIELDS, key)
    ? TELEMETRY_ENUM_FIELDS[key]
    : undefined;
  if (choices) {
    return typeof value === "string" && choices.has(value);
  }
  if (key === "model" || key === "requestedModel") {
    return (
      typeof value === "string" &&
      value.length <= 128 &&
      TELEMETRY_MODEL_PATTERN.test(value) &&
      (!value.includes("/") ||
        TELEMETRY_PROVIDERS.has(value.split("/")[0] ?? "")) &&
      !TELEMETRY_SECRET_PATTERN.test(value)
    );
  }
  if (key === "routeId") {
    return (
      typeof value === "string" &&
      value.length <= 256 &&
      !TELEMETRY_SECRET_PATTERN.test(value) &&
      (TELEMETRY_ROUTE_SENTINELS.has(value) ||
        (value.startsWith("/") &&
          !value.startsWith("//") &&
          (value === "/" ||
            value
              .slice(1)
              .replace(/\/$/, "")
              .split("/")
              .every((segment) =>
                TELEMETRY_ROUTE_SEGMENT_PATTERN.test(segment)
              ))))
    );
  }
  return (
    typeof value === "string" &&
    !TELEMETRY_SECRET_PATTERN.test(value) &&
    (TELEMETRY_IDENTIFIER_FIELDS.has(key)
      ? TELEMETRY_IDENTIFIER_PATTERN.test(value)
      : TELEMETRY_CODE_FIELDS.has(key) && TELEMETRY_CODE_PATTERN.test(value))
  );
}
