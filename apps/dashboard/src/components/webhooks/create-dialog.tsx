"use client";
import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { WEBHOOK_EVENTS } from "@/constants/outbound-webhooks";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  WebhookCreateProps,
  WebhookEventName,
} from "@/types/webhooks/outbound";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";

export function WebhookCreateDialog({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: WebhookCreateProps) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEventName[]>([
    "post.generation.completed",
  ]);
  const [secret, setSecret] = useState<string | null>(null);
  const create = useMutation(
    dashboardOrpc.outboundWebhooks.create.mutationOptions({
      onSuccess: (result) => {
        setSecret(result.secret);
        onCreated();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const toggleEvent = (name: WebhookEventName, checked: boolean) => {
    setEvents(
      checked ? [...events, name] : events.filter((value) => value !== name)
    );
  };
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!create.isPending) {
          onOpenChange(next);
        }
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {secret ? "Your endpoint is ready" : "Add an endpoint"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {secret
              ? "Copy the signing secret now. It will not be shown again."
              : "Send Notra events to any public HTTPS endpoint."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {secret ? (
          <div className="space-y-3">
            <Label htmlFor="webhook-secret">Signing secret</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-secret"
                readOnly
                value={secret}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy signing secret"
                onClick={() =>
                  copyTextToClipboard(secret, "Signing secret copied")
                }
              >
                <HugeiconsIcon icon={Copy01Icon} className="size-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Use this secret to verify each request signature before processing
              it.
            </p>
          </div>
        ) : (
          <form
            id="create-webhook"
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate({ organizationId, url, events });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                type="url"
                required
                placeholder="https://your-app.com/webhooks/notra"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                autoComplete="off"
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Listen for</legend>
              {WEBHOOK_EVENTS.map((name) => (
                <label
                  key={name}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    checked={events.includes(name)}
                    onChange={(event) =>
                      toggleEvent(name, event.target.checked)
                    }
                  />
                  <span className="font-mono text-xs">{name}</span>
                </label>
              ))}
            </fieldset>
          </form>
        )}
        <ResponsiveDialogFooter>
          {secret ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={create.isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-webhook"
                disabled={create.isPending || events.length === 0}
              >
                {create.isPending ? "Creating…" : "Create endpoint"}
              </Button>
            </>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
