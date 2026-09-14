"use client";

import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Switch } from "@notra/ui/components/ui/switch";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/button";
import {
  ALL_USAGE_FEATURES_VALUE,
  DEFAULT_USAGE_ALERT,
  USAGE_ALERT_THRESHOLD_OPTIONS,
} from "@/constants/usage-alerts";
import type {
  UsageAlert,
  UsageAlertFormProps,
  UsageAlertThresholdType,
} from "@/types/billing/usage-alerts";
import { isUsageAlertThresholdType } from "@/utils/usage-alerts";

export function UsageAlertForm({
  features,
  initialAlert,
  onCancel,
  onSubmit,
  pending,
}: UsageAlertFormProps) {
  const enabledId = useId();
  const featureLabelId = useId();
  const nameId = useId();
  const thresholdId = useId();
  const thresholdTypeLabelId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [featureId, setFeatureId] = useState(
    initialAlert?.featureId ?? ALL_USAGE_FEATURES_VALUE
  );
  const [enabled, setEnabled] = useState<boolean>(
    initialAlert?.enabled ?? DEFAULT_USAGE_ALERT.enabled
  );
  const [name, setName] = useState(initialAlert?.name ?? "");
  const [threshold, setThreshold] = useState(
    String(initialAlert?.threshold ?? DEFAULT_USAGE_ALERT.threshold)
  );
  const [thresholdType, setThresholdType] = useState<UsageAlertThresholdType>(
    initialAlert?.thresholdType ?? DEFAULT_USAGE_ALERT.thresholdType
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const selectedThreshold = USAGE_ALERT_THRESHOLD_OPTIONS.find(
    (option) => option.value === thresholdType
  );
  const editing = initialAlert !== undefined;
  let submitLabel = editing ? "Save changes" : "Add alert";
  if (pending) {
    submitLabel = editing ? "Saving…" : "Adding…";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (threshold.trim().length === 0) {
      setError("Enter a threshold.");
      return;
    }
    const numericThreshold = Number(threshold);
    const isPercentage = thresholdType.endsWith("_percentage");

    if (!Number.isFinite(numericThreshold) || numericThreshold < 0) {
      setError("Enter a threshold of 0 or more.");
      return;
    }
    if (isPercentage && numericThreshold > 100) {
      setError("Enter a percentage between 0 and 100.");
      return;
    }

    const alert: UsageAlert = {
      enabled,
      threshold: numericThreshold,
      thresholdType,
      ...(featureId === ALL_USAGE_FEATURES_VALUE ? {} : { featureId }),
      ...(name.trim() ? { name: name.trim() } : {}),
    };
    const saved = await onSubmit(alert);
    if (saved) {
      onCancel();
    }
  }

  return (
    <section className="w-full space-y-6">
      <div className="space-y-4">
        <Button
          className="-ms-2.5"
          onClick={onCancel}
          size="sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            aria-hidden="true"
            icon={ArrowLeft02Icon}
            strokeWidth={2}
          />
          Usage alerts
        </Button>
        <div className="space-y-1">
          <h2
            className="text-lg font-semibold outline-none"
            ref={headingRef}
            tabIndex={-1}
          >
            {editing ? "Edit usage alert" : "Add usage alert"}
          </h2>
          <p className="text-muted-foreground text-sm text-pretty">
            Choose when this organization should trigger a usage alert.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label id={featureLabelId}>Feature</Label>
          <Select
            onValueChange={(value) =>
              setFeatureId(value ?? ALL_USAGE_FEATURES_VALUE)
            }
            value={featureId}
          >
            <SelectTrigger aria-labelledby={featureLabelId} className="w-full">
              <SelectValue>
                {(value: string) =>
                  value === ALL_USAGE_FEATURES_VALUE
                    ? "All features"
                    : (features.find((feature) => feature.id === value)?.name ??
                      value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value={ALL_USAGE_FEATURES_VALUE}>
                All features
              </SelectItem>
              {features.map((feature) => (
                <SelectItem key={feature.id} value={feature.id}>
                  {feature.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Leave this on all features to apply the alert across every usage
            balance.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor={enabledId}>Enabled</Label>
            <p className="text-muted-foreground text-xs">
              Disabled alerts stay saved but do not trigger.
            </p>
          </div>
          <Switch
            checked={enabled}
            id={enabledId}
            onCheckedChange={setEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Optional label for this alert"
            value={name}
          />
        </div>

        <div className="space-y-2">
          <Label id={thresholdTypeLabelId}>Threshold type</Label>
          <Select
            onValueChange={(value) => {
              if (isUsageAlertThresholdType(value)) {
                setThresholdType(value);
                setError(null);
              }
            }}
            value={thresholdType}
          >
            <SelectTrigger
              aria-labelledby={thresholdTypeLabelId}
              className="w-full"
            >
              <SelectValue>
                {(value: UsageAlertThresholdType) =>
                  USAGE_ALERT_THRESHOLD_OPTIONS.find(
                    (option) => option.value === value
                  )?.label ?? value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {USAGE_ALERT_THRESHOLD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {selectedThreshold?.description}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={thresholdId}>Threshold</Label>
          <Input
            aria-describedby={error ? `${thresholdId}-error` : undefined}
            aria-invalid={error ? true : undefined}
            id={thresholdId}
            inputMode="decimal"
            min={0}
            onChange={(event) => {
              setThreshold(event.target.value);
              setError(null);
            }}
            required
            step="any"
            type="number"
            value={threshold}
          />
          {error ? (
            <p
              className="text-destructive text-xs"
              id={`${thresholdId}-error`}
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            disabled={pending}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={pending} type="submit">
            {submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
