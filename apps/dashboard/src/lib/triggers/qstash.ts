import type { TriggerSourceConfig } from "@/types/triggers";

const QSTASH_API_BASE = "https://qstash.upstash.io/v2";

function getQstashToken() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured");
  }
  return token;
}

function getAppUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!url) {
    throw new Error(
      "App URL not configured. Set NEXT_PUBLIC_APP_URL, APP_URL, or VERCEL_URL.",
    );
  }
  return url;
}

export function buildCronExpression(config?: TriggerSourceConfig["cron"]) {
  if (!config) {
    return null;
  }

  const minute = config.minute ?? 0;
  const hour = config.hour ?? 0;

  if (config.cadence === "weekly") {
    const dayOfWeek = config.dayOfWeek ?? 1;
    return `${minute} ${hour} * * ${dayOfWeek}`;
  }

  if (config.cadence === "monthly") {
    const dayOfMonth = config.dayOfMonth ?? 1;
    return `${minute} ${hour} ${dayOfMonth} * *`;
  }

  return `${minute} ${hour} * * *`;
}

export async function createQstashSchedule({
  triggerId,
  cron,
}: {
  triggerId: string;
  cron: string;
}) {
  const token = getQstashToken();
  const appUrl = getAppUrl();

  if (!appUrl) {
    throw new Error("APP_URL is not configured");
  }

  const destination = `${appUrl}/api/triggers/run/${triggerId}`;

  const response = await fetch(`${QSTASH_API_BASE}/schedules`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      destination,
      schedule: cron,
      method: "POST",
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to create QStash schedule");
  }

  return payload.scheduleId as string;
}

export async function deleteQstashSchedule(scheduleId: string) {
  const token = getQstashToken();

  const response = await fetch(`${QSTASH_API_BASE}/schedules/${scheduleId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Failed to delete QStash schedule");
  }
}
