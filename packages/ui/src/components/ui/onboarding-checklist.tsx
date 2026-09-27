"use client";

import Link from "next/link";
import { createContext, use, type ComponentProps } from "react";

import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { cn } from "@notra/ui/lib/utils";

import { Button } from "./button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "./card";
import { Progress } from "./progress";

const OnboardingChecklistContext = createContext<{
  onClose?: () => void;
}>({});

function OnboardingChecklist({
  className,
  onClose,
  ...props
}: ComponentProps<"div"> & { onClose?: () => void }) {
  return (
    <OnboardingChecklistContext value={{ onClose }}>
      <Card
        className={cn(className)}
        data-slot="onboarding-checklist"
        size="sm"
        {...props}
      />
    </OnboardingChecklistContext>
  );
}

function OnboardingChecklistHeader({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { onClose } = use(OnboardingChecklistContext);
  const labels = useUiLabels();
  return (
    <CardHeader
      className={cn("-mt-3 rounded-t-xl border-b bg-muted/50 pb-3 pt-3", className)}
      data-slot="onboarding-checklist-header"
      {...props}
    >
      {children}
      {onClose && (
        <CardAction>
          <Button
            aria-label={labels.close}
            onClick={onClose}
            size="icon-xs"
            variant="ghost"
          >
            <svg
              aria-hidden="true"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <title>{labels.close}</title>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </CardAction>
      )}
    </CardHeader>
  );
}

function OnboardingChecklistTitle({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <CardTitle
      className={cn(className)}
      data-slot="onboarding-checklist-title"
      {...props}
    />
  );
}

function OnboardingChecklistContent({
  className,
  title,
  description,
  children,
  ...props
}: ComponentProps<"div"> & { title: string; description?: string }) {
  return (
    <CardContent
      className={cn("space-y-3", className)}
      data-slot="onboarding-checklist-content"
      {...props}
    >
      <div className="space-y-1">
        <div className="font-medium text-sm">{title}</div>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      {children}
    </CardContent>
  );
}

function OnboardingChecklistProgress({
  className,
  value,
  ...props
}: ComponentProps<"div"> & { value: number }) {
  return (
    <div
      className={cn("space-y-1", className)}
      data-slot="onboarding-checklist-progress"
      {...props}
    >
      <Progress value={value} />
      <p className="text-muted-foreground text-xs tabular-nums">{Math.round(value)}% Completed</p>
    </div>
  );
}

function OnboardingChecklistItems({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      className={cn("space-y-1", className)}
      data-slot="onboarding-checklist-items"
      {...props}
    />
  );
}

function OnboardingChecklistItem({
  className,
  href,
  completed,
  children,
  ...props
}: ComponentProps<"li"> & { href: string; completed?: boolean }) {
  const labels = useUiLabels();
  return (
    <li
      className={cn("text-sm", className)}
      data-slot="onboarding-checklist-item"
      {...props}
    >
      <Link
        className={cn(
          "flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted",
          completed && "text-muted-foreground line-through"
        )}
        href={href}
      >
        {completed ? (
          <svg
            aria-hidden="true"
            className="size-4 shrink-0 text-primary"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <title>{labels.completed}</title>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <title>{labels.incomplete}</title>
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
        {children}
      </Link>
    </li>
  );
}

export {
  OnboardingChecklist,
  OnboardingChecklistContent,
  OnboardingChecklistHeader,
  OnboardingChecklistItem,
  OnboardingChecklistItems,
  OnboardingChecklistProgress,
  OnboardingChecklistTitle,
};
