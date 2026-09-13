"use client";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";

import { Button } from "@/components/button";
import { WEBHOOK_METRICS } from "@/constants/outbound-webhooks";
import type {
  WebhookEndpointsProps,
  WebhookMetricsProps,
} from "@/types/webhooks/outbound";

export function WebhookMetrics({ stats }: WebhookMetricsProps) {
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4">
      {WEBHOOK_METRICS.map((metric) => (
        <div key={metric.key} className="bg-background space-y-1 px-4 py-3">
          <p className="text-muted-foreground text-xs">{metric.label}</p>
          {stats ? (
            <p className={cn("font-mono text-2xl tabular-nums", metric.tone)}>
              {stats[metric.key].toLocaleString()}
            </p>
          ) : (
            <Skeleton className="h-8 w-16" />
          )}
        </div>
      ))}
    </div>
  );
}

export function WebhookEndpoints({
  endpoints,
  disabled,
  onRemove,
  onCreate,
}: WebhookEndpointsProps) {
  if (endpoints.length === 0) {
    return (
      <div className="space-y-2 rounded-lg border p-8 text-center">
        <p className="text-sm font-medium">Connect your first endpoint</p>
        <p className="text-muted-foreground text-xs">
          Choose which events to send to your workflow.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onCreate}
        >
          Add endpoint
        </Button>
      </div>
    );
  }
  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {endpoints.map((endpoint) => (
        <li
          key={endpoint.id}
          className="flex items-start justify-between gap-3 p-4"
        >
          <div className="min-w-0 space-y-1">
            <p className="font-mono text-xs break-all">{endpoint.url}</p>
            <p className="text-muted-foreground text-xs">
              {endpoint.events.join(", ")}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onRemove(endpoint.id)}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
