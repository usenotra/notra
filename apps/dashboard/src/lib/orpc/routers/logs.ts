import { webhookLogsQuerySchema } from "@notra/schemas/dashboard/api-params";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  listWebhookLogsInputSchema,
  webhookLogDetailInputSchema,
} from "@notra/schemas/dashboard/logs";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { notFound } from "@/lib/orpc/utils/errors";
import { listWebhookLogs } from "@/lib/webhooks/logging";
import type { Log, LogsResponse } from "@/types/webhooks/webhooks";

function paginateLogs(logs: Log[], page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return logs.slice(startIndex, endIndex);
}

function filterLogs(
  logs: Log[],
  filters: {
    source: z.infer<typeof webhookLogsQuerySchema.shape.source>;
    status: z.infer<typeof webhookLogsQuerySchema.shape.status>;
    search: string;
  }
) {
  const search = filters.search.trim().toLowerCase();
  return logs.filter((log) => {
    if (filters.source !== "all" && log.integrationType !== filters.source) {
      return false;
    }
    if (filters.status !== "all" && log.status !== filters.status) {
      return false;
    }
    if (search.length > 0) {
      const inTitle = log.title.toLowerCase().includes(search);
      const inError = log.errorMessage?.toLowerCase().includes(search) ?? false;
      if (!(inTitle || inError)) {
        return false;
      }
    }
    return true;
  });
}

export const logsRouter = {
  webhooks: {
    overview: authorizedProcedure
      .input(organizationIdInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });
        const logs = await listWebhookLogs(
          input.organizationId,
          "github",
          null
        );
        return {
          logs: logs.map(({ payload, ...log }) => ({
            ...log,
            hasPayload: Boolean(payload && Object.keys(payload).length > 0),
          })),
        };
      }),
    get: authorizedProcedure
      .input(webhookLogDetailInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });
        const logs = await listWebhookLogs(
          input.organizationId,
          "github",
          null
        );
        const log = logs.find((entry) => entry.id === input.logId);
        if (!log) {
          throw notFound(
            "This log is no longer available. It may have expired."
          );
        }
        return log;
      }),
    list: authorizedProcedure
      .input(listWebhookLogsInputSchema)
      .handler(async ({ context, input }) => {
        await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });

        const logs = await listWebhookLogs(
          input.organizationId,
          input.integrationType,
          input.integrationId === "all" ? null : (input.integrationId ?? null)
        );

        const filteredLogs = filterLogs(logs, {
          source: input.source,
          status: input.status,
          search: input.search,
        });

        const paginatedLogs = paginateLogs(
          filteredLogs,
          input.page,
          input.pageSize
        );

        const response: LogsResponse = {
          logs: paginatedLogs,
          pagination: {
            page: input.page,
            pageSize: input.pageSize,
            totalCount: filteredLogs.length,
            totalPages: Math.max(
              1,
              Math.ceil(filteredLogs.length / input.pageSize)
            ),
          },
        };

        return response;
      }),
  },
};
