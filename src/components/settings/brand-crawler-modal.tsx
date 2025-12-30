"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { QUERY_KEYS } from "@/utils/query-keys";
import { organizationWebsiteSchema } from "@/utils/schemas/organization";

type CrawlerStep = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
  error?: string;
};

type CrawlerStatus = {
  status: "idle" | "crawling" | "completed" | "error";
  currentStep: string | null;
  steps: CrawlerStep[];
  error: string | null;
  workflowRunId: string | null;
};

const DEFAULT_STEPS: CrawlerStep[] = [
  {
    id: "validate",
    name: "Validating URL",
    description: "Checking if the website is accessible",
    status: "pending",
  },
  {
    id: "crawl",
    name: "Crawling Website",
    description: "Fetching and analyzing website content",
    status: "pending",
  },
  {
    id: "analyze",
    name: "Analyzing Brand",
    description: "AI is analyzing your brand identity",
    status: "pending",
  },
  {
    id: "save",
    name: "Saving Results",
    description: "Storing your brand profile",
    status: "pending",
  },
];

type BrandCrawlerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  websiteUrl: string;
  onSuccess: () => void;
};

function StepTimeline({ steps }: { steps: CrawlerStep[] }) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                step.status === "completed" &&
                  "border-green-500 bg-green-500 text-white",
                step.status === "in_progress" &&
                  "animate-pulse border-blue-500 bg-blue-500 text-white",
                step.status === "error" &&
                  "border-red-500 bg-red-500 text-white",
                step.status === "pending" &&
                  "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {step.status === "completed" ? (
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              ) : step.status === "error" ? (
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mt-1 h-8 w-0.5 transition-colors",
                  step.status === "completed"
                    ? "bg-green-500"
                    : "bg-muted-foreground/30"
                )}
              />
            ) : null}
          </div>
          <div className="flex-1 pb-4">
            <p
              className={cn(
                "font-medium text-sm",
                step.status === "in_progress" && "text-blue-500",
                step.status === "completed" && "text-green-500",
                step.status === "error" && "text-red-500"
              )}
            >
              {step.name}
              {step.status === "in_progress" ? "..." : ""}
            </p>
            <p className="text-muted-foreground text-xs">{step.description}</p>
            {step.error ? (
              <p className="mt-1 text-red-500 text-xs">{step.error}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BrandCrawlerModal({
  open,
  onOpenChange,
  organizationId,
  websiteUrl,
  onSuccess,
}: BrandCrawlerModalProps) {
  const queryClient = useQueryClient();
  const [isCrawling, setIsCrawling] = useState(false);
  const [steps, setSteps] = useState<CrawlerStep[]>(DEFAULT_STEPS);
  const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      websiteUrl: websiteUrl || "",
    },
    onSubmit: async ({ value }) => {
      startCrawler.mutate({ websiteUrl: value.websiteUrl });
    },
  });

  useEffect(() => {
    if (websiteUrl) {
      form.setFieldValue("websiteUrl", websiteUrl);
    }
  }, [websiteUrl, form]);

  const { data: crawlerStatus } = useQuery({
    queryKey: QUERY_KEYS.BRAND_SETTINGS.crawlerStatus(organizationId),
    queryFn: async () => {
      const response = await fetch(
        `/api/organizations/${organizationId}/brand-settings/crawler-status`
      );
      if (!response.ok) {
        return null;
      }
      return response.json() as Promise<CrawlerStatus>;
    },
    enabled: isCrawling && !!workflowRunId,
    refetchInterval: isCrawling ? 2000 : false,
  });

  useEffect(() => {
    if (crawlerStatus?.steps) {
      setSteps(crawlerStatus.steps);
    }

    if (crawlerStatus?.status === "completed") {
      setIsCrawling(false);
      toast.success("Brand profile generated successfully!");
      onSuccess();
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BRAND_SETTINGS.detail(organizationId),
      });
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 1500);
    }

    if (crawlerStatus?.status === "error") {
      setIsCrawling(false);
      toast.error(crawlerStatus.error || "Failed to analyze website");
    }
  }, [
    crawlerStatus,
    onSuccess,
    onOpenChange,
    organizationId,
    queryClient,
  ]);

  const startCrawler = useMutation({
    mutationFn: async ({ websiteUrl }: { websiteUrl: string }) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/brand-settings/crawl/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteUrl }),
        }
      );

      if (!response.ok) {
        let message = "Failed to start crawler";
        try {
          const error = await response.json();
          message = error?.error ? error.error : message;
        } catch {}
        throw new Error(message);
      }

      return response.json() as Promise<{ workflowRunId: string }>;
    },
    onSuccess: (data) => {
      setIsCrawling(true);
      setWorkflowRunId(data.workflowRunId);
      setSteps(
        DEFAULT_STEPS.map((step, index) =>
          index === 0 ? { ...step, status: "in_progress" } : step
        )
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to start analysis"
      );
    },
  });

  const resetState = () => {
    setIsCrawling(false);
    setWorkflowRunId(null);
    setSteps(DEFAULT_STEPS);
    form.reset();
  };

  const handleClose = (open: boolean) => {
    if (!open && !isCrawling) {
      resetState();
    }
    if (!isCrawling) {
      onOpenChange(open);
    }
  };

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isCrawling ? "Analyzing Your Website" : "Brand Analysis"}
          </DialogTitle>
          <DialogDescription>
            {isCrawling
              ? "Please wait while we analyze your website and generate your brand profile"
              : "Enter your website URL to automatically generate your brand profile"}
          </DialogDescription>
        </DialogHeader>

        {isCrawling ? (
          <div className="py-4">
            <StepTimeline steps={steps} />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="grid gap-4 py-4">
              <form.Field
                name="websiteUrl"
                validators={{
                  onChange: ({ value }) => {
                    if (!value || value.trim() === "") {
                      return "Website URL is required";
                    }
                    return organizationWebsiteSchema.safeParse(value).error
                      ?.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor="websiteUrl">
                      Website URL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      aria-invalid={field.state.meta.errors.length > 0}
                      disabled={startCrawler.isPending}
                      id="websiteUrl"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://example.com"
                      type="url"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <p className="text-destructive text-sm">
                        {field.state.meta.errors[0]}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-xs">
                      We'll analyze your homepage and key pages to understand
                      your brand
                    </p>
                  </div>
                )}
              </form.Field>
            </div>

            <DialogFooter>
              <Button
                disabled={startCrawler.isPending}
                onClick={() => handleClose(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={startCrawler.isPending} type="submit">
                {startCrawler.isPending ? "Starting..." : "Analyze Website"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
