import { Client as QStashClient } from "@upstash/qstash";
import { Client as WorkflowClient } from "@upstash/workflow";
import type { TriggerSourceConfig } from "@/types/triggers";

function getQstashToken() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured");
  }
  return token;
}

export function getAppUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!url) {
    throw new Error(
      "App URL not configured. Set NEXT_PUBLIC_APP_URL, APP_URL, or VERCEL_URL."
    );
  }
  return url;
}

export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  );
}

function getQStashClient() {
  return new QStashClient({ token: getQstashToken() });
}

function getWorkflowClient() {
  return new WorkflowClient({ token: getQstashToken() });
}

export function buildCronExpression(config?: TriggerSourceConfig["cron"]) {
  if (!config) {
    return null;
  }

  const minute = config.minute ?? 0;
  const hour = config.hour ?? 0;

  if (config.frequency === "weekly") {
    const dayOfWeek = config.dayOfWeek ?? 1;
    return `${minute} ${hour} * * ${dayOfWeek}`;
  }

  if (config.frequency === "monthly") {
    const dayOfMonth = config.dayOfMonth ?? 1;
    return `${minute} ${hour} ${dayOfMonth} * *`;
  }

  return `${minute} ${hour} * * *`;
}

export async function createQstashSchedule({
  triggerId,
  cron,
  scheduleId,
}: {
  triggerId: string;
  cron: string;
  scheduleId?: string;
}) {
  const client = getQStashClient();
  const appUrl = getAppUrl();

  const destination = `${appUrl}/api/workflows/schedule`;

  const result = await client.schedules.create({
    ...(scheduleId && { scheduleId }),
    destination,
    cron,
    body: JSON.stringify({ triggerId }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return result.scheduleId;
}

export async function deleteQstashSchedule(scheduleId: string) {
  const client = getQStashClient();
  await client.schedules.delete(scheduleId);
}

export async function triggerScheduleNow(triggerId: string) {
  const client = getWorkflowClient();
  const appUrl = getAppUrl();

  const destination = `${appUrl}/api/workflows/schedule`;

  const result = await client.trigger({
    url: destination,
    body: { triggerId },
  });

  return result.workflowRunId;
}
