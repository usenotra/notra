"use client";

import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Loading03Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type {
  ContentDataPointSettings,
  OnDemandContentType,
  SelectedItems,
} from "@notra/schemas/dashboard/content";
import {
  type CreateContentFormValues,
  createContentFormSchema,
} from "@notra/schemas/dashboard/content/create-content-form";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Button } from "@notra/ui/components/ui/button";
import { cn } from "@notra/ui/lib/utils";
import { useForm, useStore } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CreateContentButton } from "@/components/content/create-content-button";
import { StepActivity } from "@/components/content/create/step-activity";
import { StepBrandIdentities } from "@/components/content/create/step-brand-identities";
import { StepFormats } from "@/components/content/create/step-formats";
import { AddRepositoryDialog } from "@/components/integrations/add-repository-dialog";
import { LegacyAddIntegrationDialog as AddIntegrationDialog } from "@/components/integrations/legacy/add-integration-dialog";
import { DEFAULT_DATA_POINTS } from "@/constants/content-preview";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useActiveProject } from "@/lib/hooks/use-active-project";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ContentCreateEntry } from "@/types/analytics/studio-events";
import type {
  IntegrationOption,
  StepProgressProps,
  WizardStep,
} from "@/types/content/create";
import type { PrSelection, ReleaseSelection } from "@/types/content/preview";
import {
  prSelectionFromKey,
  prSelectionToKey,
  releaseSelectionFromKey,
  releaseSelectionToKey,
} from "@/utils/content-preview";

interface CreateContentDialogProps {
  entry: ContentCreateEntry;
  hideTrigger?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  organizationId: string;
}

const STEP_ORDER: WizardStep[] = ["formats", "activity", "identities"];

const STEP_TITLES: Record<WizardStep, string> = {
  formats: "Create Content",
  activity: "Activity",
  identities: "Brand Identity",
};

const STEP_LABELS: Record<WizardStep, string> = {
  formats: "Formats",
  activity: "Activity",
  identities: "Identity",
};

function getDefaultContentFormValues(): CreateContentFormValues {
  return {
    formats: [],
    repositoryIds: [],
    brandVoiceIds: [],
    lookbackWindow: "last_7_days",
    dataPoints: DEFAULT_DATA_POINTS,
  };
}

export function CreateContentDialog({
  entry,
  hideTrigger = false,
  onOpenChange,
  open: controlledOpen,
  organizationId,
}: CreateContentDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { projectId: activeProjectId, isResolved: isProjectResolved } =
    useActiveProject();
  const open = controlledOpen ?? uncontrolledOpen;
  const setDialogOpen = useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange]
  );
  const hotkeyEntryRef = useRef<ContentCreateEntry | null>(null);
  const trackedOpenRef = useRef(false);

  useHotkey(
    "C",
    () => {
      if (organizationId && isProjectResolved) {
        hotkeyEntryRef.current = "hotkey";
        setDialogOpen(true);
      }
    },
    { enabled: !open }
  );

  useEffect(() => {
    if (!open) {
      trackedOpenRef.current = false;
      return;
    }
    if (trackedOpenRef.current) {
      return;
    }
    trackedOpenRef.current = true;
    trackEvent(POSTHOG_EVENTS.CONTENT_CREATE_DIALOG_OPENED, {
      entry: hotkeyEntryRef.current ?? entry,
    });
    hotkeyEntryRef.current = null;
  }, [entry, open]);

  const queryClient = useQueryClient();

  const [step, setStep] = useState<WizardStep>("formats");

  const submitHandlerRef = useRef<
    (value: CreateContentFormValues) => Promise<void>
  >(async () => {
    return;
  });

  const form = useForm({
    defaultValues: getDefaultContentFormValues(),
    validators: {
      onSubmit: ({ value }) => {
        const result = createContentFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues[0]?.message ?? "Form is invalid";
        }
        return;
      },
    },
    onSubmit: async ({ value }) => {
      await submitHandlerRef.current(value);
    },
  });

  const selectedFormats = useStore(form.store, (s) => s.values.formats);
  const selectedRepoIds = useStore(form.store, (s) => s.values.repositoryIds);
  const selectedBrandVoiceIds = useStore(
    form.store,
    (s) => s.values.brandVoiceIds
  );
  const lookbackWindow = useStore(form.store, (s) => s.values.lookbackWindow);
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );
  const dataPoints = useStore(form.store, (s) => s.values.dataPoints);

  const [selectedCommitKeys, setSelectedCommitKeys] = useState<Set<string>>(
    new Set()
  );
  const [selectedPrKeys, setSelectedPrKeys] = useState<Set<string>>(new Set());
  const [selectedReleaseKeys, setSelectedReleaseKeys] = useState<Set<string>>(
    new Set()
  );
  const [selectedLinearKeys, setSelectedLinearKeys] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const integrationsInitializedRef = useRef(false);

  const selectionsTouchedRef = useRef(false);
  const lastInitializedParamsRef = useRef("");
  const previewWarningKeyRef = useRef("");

  const [addRepoOpen, setAddRepoOpen] = useState(false);
  const [addRepoMode, setAddRepoMode] = useState<
    "integration" | "repository" | null
  >(null);
  const [waitingForWebhookSetup, setWaitingForWebhookSetup] = useState(false);
  const openingAddRepoFlowRef = useRef(false);

  const { data: brandResponse, isLoading: isLoadingVoices } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId },
      enabled: open && !!organizationId,
    })
  );
  const brandVoices = brandResponse?.voices ?? [];

  const { data: integrationsResponse, isLoading: isLoadingRepos } = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId },
      enabled: open && !!organizationId,
    })
  );

  const { integrationOptions, githubIntegrationId } = useMemo(() => {
    const githubIntegrations =
      integrationsResponse?.integrations.filter(
        (i) => i.type === "github" && i.enabled
      ) ?? [];
    const linearIntegrationsList =
      integrationsResponse?.integrations.filter(
        (i) => i.type === "linear" && i.enabled
      ) ?? [];
    const repos = githubIntegrations.flatMap((i) =>
      i.repositories.filter((r) => r.enabled)
    );

    const options: IntegrationOption[] = [
      ...repos.map((r) => ({
        value: r.id,
        label: r.defaultBranch
          ? `${r.owner}/${r.repo} · ${r.defaultBranch}`
          : `${r.owner}/${r.repo}`,
        ownerRepo: `${r.owner}/${r.repo}`,
        type: "github" as const,
      })),
      ...linearIntegrationsList.map((i) => ({
        value: `linear:${i.id}`,
        label: i.displayName,
        ownerRepo: null,
        type: "linear" as const,
      })),
    ];

    return {
      integrationOptions: options,
      githubIntegrationId: githubIntegrations[0]?.id,
    };
  }, [integrationsResponse]);

  const githubRepoIds = useMemo(
    () => selectedRepoIds.filter((id) => !id.startsWith("linear:")),
    [selectedRepoIds]
  );

  const selectedLinearIds = useMemo(
    () =>
      selectedRepoIds
        .filter((id) => id.startsWith("linear:"))
        .map((id) => id.replace("linear:", "")),
    [selectedRepoIds]
  );

  const previewParamsKey = useMemo(
    () =>
      JSON.stringify({
        repositoryIds: githubRepoIds,
        linearIntegrationIds: selectedLinearIds,
        lookbackWindow,
        includeCommits: dataPoints.includeCommits,
        includePullRequests: dataPoints.includePullRequests,
        includeReleases: dataPoints.includeReleases,
      }),
    [githubRepoIds, selectedLinearIds, lookbackWindow, dataPoints]
  );

  const previewQueryOptions = dashboardOrpc.content.preview.queryOptions({
    input: {
      organizationId,
      repositoryIds: githubRepoIds,
      lookbackWindow,
      timezone,
      includeCommits: dataPoints.includeCommits,
      includePullRequests: dataPoints.includePullRequests,
      includeReleases: dataPoints.includeReleases,
      linearIntegrationIds:
        selectedLinearIds.length > 0 ? selectedLinearIds : undefined,
    },
  });

  const {
    data: previewResponse,
    isFetching: isLoadingPreview,
    isError: isPreviewError,
    refetch: refetchPreview,
  } = useQuery({
    ...previewQueryOptions,
    enabled:
      open &&
      step === "activity" &&
      (githubRepoIds.length > 0 || selectedLinearIds.length > 0),
    staleTime: 60_000,
  });

  const handleRetryPreview = useCallback(() => {
    refetchPreview();
  }, [refetchPreview]);

  const previewData = useMemo(
    () =>
      previewResponse?.repositories.map((r) => ({
        repositoryId: r.repositoryId,
        owner: r.owner,
        repo: r.repo,
        commits: r.commits ?? [],
        pullRequests: r.pullRequests ?? [],
        releases: r.releases ?? [],
      })),
    [previewResponse]
  );

  const previewFailures = previewResponse?.failures;

  useEffect(() => {
    if (
      (!previewData && !previewResponse?.linearIntegrations) ||
      lastInitializedParamsRef.current === previewParamsKey
    ) {
      return;
    }
    lastInitializedParamsRef.current = previewParamsKey;
    selectionsTouchedRef.current = false;
    const commitKeys = new Set<string>();
    const prKeys = new Set<string>();
    const relKeys = new Set<string>();
    const linearKeys = new Set<string>();
    for (const repo of previewData ?? []) {
      for (const commit of repo.commits) {
        commitKeys.add(commit.sha);
      }
      for (const pr of repo.pullRequests) {
        prKeys.add(
          prSelectionToKey({
            repositoryId: repo.repositoryId,
            number: pr.number,
          })
        );
      }
      for (const rel of repo.releases) {
        relKeys.add(
          releaseSelectionToKey({
            repositoryId: repo.repositoryId,
            tagName: rel.tagName,
          })
        );
      }
    }
    for (const li of previewResponse?.linearIntegrations ?? []) {
      for (const issue of li.issues) {
        linearKeys.add(`${li.integrationId}:${issue.id}`);
      }
    }
    setSelectedCommitKeys(commitKeys);
    setSelectedPrKeys(prKeys);
    setSelectedReleaseKeys(relKeys);
    setSelectedLinearKeys(linearKeys);
  }, [previewData, previewParamsKey, previewResponse?.linearIntegrations]);

  useEffect(() => {
    if (!previewFailures?.length) {
      return;
    }
    const warningKey = `${previewParamsKey}:${previewFailures
      .map((failure) => `${failure.repositoryId}:${failure.stage}`)
      .sort()
      .join("|")}`;
    if (previewWarningKeyRef.current === warningKey) {
      return;
    }
    previewWarningKeyRef.current = warningKey;
    toast.warning(
      `${previewFailures.length} repository preview ${previewFailures.length === 1 ? "issue was" : "issues were"} detected.`
    );
  }, [previewFailures, previewParamsKey]);

  const mutation = useMutation<
    { succeeded: number; total: number },
    Error,
    {
      formats: OnDemandContentType[];
      voiceIds: string[];
      selectedItems: SelectedItems;
    }
  >({
    mutationFn: async ({ formats, voiceIds, selectedItems }) => {
      if (!isProjectResolved) {
        throw new Error("Project is still loading");
      }
      const hasLinear = selectedLinearIds.length > 0;
      const calls = formats.flatMap((format) =>
        voiceIds.map((voiceId) => ({ format, voiceId }))
      );
      // TODO: replace this client-side fan-out with a single boss agent
      // that delegates to N sub-agents (one per format), with the boss
      // deciding the angle / topic each sub-agent writes about so the
      // outputs are coordinated instead of independently drafted.
      const { collectionId } =
        await dashboardOrpc.content.createCollection.call({
          organizationId,
          projectId: activeProjectId ?? undefined,
          contentTypes: formats,
          expectedPostCount: calls.length,
        });

      const results = await Promise.allSettled(
        calls.map(({ format, voiceId }) =>
          dashboardOrpc.content.generate.call({
            organizationId,
            collectionId,
            contentType: format,
            lookbackWindow,
            timezone,
            repositoryIds: githubRepoIds,
            linearIntegrationIds: hasLinear ? selectedLinearIds : undefined,
            brandVoiceId: voiceId || undefined,
            dataPoints: { ...dataPoints, includeLinearData: hasLinear },
            selectedItems,
          })
        )
      );
      const failures = results.filter((r) => r.status === "rejected");
      const succeeded = results.length - failures.length;
      if (succeeded === 0) {
        await dashboardOrpc.content.collections.delete
          .call({
            organizationId,
            collectionId,
          })
          .catch(() => null);
        const reason = failures[0];
        const message =
          reason &&
          reason.status === "rejected" &&
          reason.reason instanceof Error
            ? reason.reason.message
            : "Failed to start any content generation";
        throw new Error(message);
      }
      if (succeeded < results.length) {
        await dashboardOrpc.content.collections.updateExpectedPostCount.call({
          organizationId,
          collectionId,
          expectedPostCount: succeeded,
        });
      }
      return { succeeded, total: results.length };
    },
    onSuccess: ({ succeeded, total }) => {
      setDialogOpen(false);
      if (succeeded === total) {
        toast.success(
          succeeded === 1
            ? "Content generation started"
            : `${succeeded} content generations started`
        );
      } else {
        toast.warning(
          `${succeeded} of ${total} content generations started; ${total - succeeded} failed`
        );
      }
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.activeGenerations.list.queryKey({
          input: { organizationId },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.collections.list.key(),
      });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const resetWizard = useCallback(() => {
    setStep("formats");
    form.reset();
    setSelectedCommitKeys(new Set());
    setSelectedPrKeys(new Set());
    setSelectedReleaseKeys(new Set());
    setSelectedLinearKeys(new Set());
    setSearchQuery("");
    setAttemptedAdvance(false);
    lastInitializedParamsRef.current = "";
    selectionsTouchedRef.current = false;
    integrationsInitializedRef.current = false;
  }, [form]);

  useEffect(() => {
    if (
      integrationsInitializedRef.current ||
      integrationOptions.length === 0 ||
      selectedRepoIds.length > 0
    ) {
      return;
    }
    integrationsInitializedRef.current = true;
    form.setFieldValue(
      "repositoryIds",
      integrationOptions.map((opt) => opt.value)
    );
  }, [integrationOptions, selectedRepoIds.length, form]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setDialogOpen(next);
      if (!next) {
        const preserveState =
          openingAddRepoFlowRef.current || addRepoMode !== null;
        openingAddRepoFlowRef.current = false;
        if (preserveState) {
          return;
        }
        setAddRepoOpen(false);
        setAddRepoMode(null);
        setWaitingForWebhookSetup(false);
        resetWizard();
      }
    },
    [addRepoMode, resetWizard, setDialogOpen]
  );

  const toggleFormat = useCallback(
    (format: OnDemandContentType) => {
      const current = form.state.values.formats;
      form.setFieldValue(
        "formats",
        current.includes(format)
          ? current.filter((f) => f !== format)
          : [...current, format]
      );
    },
    [form]
  );

  const handleDataPointChange = useCallback(
    (key: keyof ContentDataPointSettings, value: boolean) => {
      form.setFieldValue("dataPoints", {
        ...form.state.values.dataPoints,
        [key]: value,
      });
    },
    [form]
  );

  const handleLookbackChange = useCallback(
    (window: CreateContentFormValues["lookbackWindow"]) => {
      form.setFieldValue("lookbackWindow", window);
    },
    [form]
  );

  const toggleRepoId = useCallback(
    (value: string) => {
      const current = form.state.values.repositoryIds;
      form.setFieldValue(
        "repositoryIds",
        current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
      );
    },
    [form]
  );

  const toggleAllRepoIds = useCallback(() => {
    const allIds = integrationOptions.map((opt) => opt.value);
    const current = form.state.values.repositoryIds;
    form.setFieldValue(
      "repositoryIds",
      allIds.length > 0 && allIds.every((id) => current.includes(id))
        ? []
        : allIds
    );
  }, [form, integrationOptions]);

  const toggleVoiceId = useCallback(
    (id: string) => {
      const current = form.state.values.brandVoiceIds;
      form.setFieldValue(
        "brandVoiceIds",
        current.includes(id)
          ? current.filter((v) => v !== id)
          : [...current, id]
      );
    },
    [form]
  );

  const eventCounts = useMemo(() => {
    let total = 0;
    let selected = 0;
    for (const repo of previewData ?? []) {
      if (dataPoints.includeCommits) {
        total += repo.commits.length;
        for (const c of repo.commits) {
          if (selectedCommitKeys.has(c.sha)) {
            selected++;
          }
        }
      }
      if (dataPoints.includePullRequests) {
        total += repo.pullRequests.length;
        for (const pr of repo.pullRequests) {
          if (
            selectedPrKeys.has(
              prSelectionToKey({
                repositoryId: repo.repositoryId,
                number: pr.number,
              })
            )
          ) {
            selected++;
          }
        }
      }
      if (dataPoints.includeReleases) {
        total += repo.releases.length;
        for (const r of repo.releases) {
          if (
            selectedReleaseKeys.has(
              releaseSelectionToKey({
                repositoryId: repo.repositoryId,
                tagName: r.tagName,
              })
            )
          ) {
            selected++;
          }
        }
      }
    }
    for (const li of previewResponse?.linearIntegrations ?? []) {
      total += li.issues.length;
      for (const issue of li.issues) {
        if (selectedLinearKeys.has(`${li.integrationId}:${issue.id}`)) {
          selected++;
        }
      }
    }
    return { total, selected };
  }, [
    previewData,
    previewResponse?.linearIntegrations,
    dataPoints,
    selectedCommitKeys,
    selectedPrKeys,
    selectedReleaseKeys,
    selectedLinearKeys,
  ]);

  const [attemptedAdvance, setAttemptedAdvance] = useState(false);

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx >= STEP_ORDER.length - 1) {
      return;
    }
    if (step === "formats" && selectedFormats.length === 0) {
      setAttemptedAdvance(true);
      return;
    }
    if (step === "activity") {
      if (isLoadingPreview) {
        return;
      }
      if (selectedRepoIds.length === 0 || eventCounts.selected === 0) {
        setAttemptedAdvance(true);
        return;
      }
    }
    setAttemptedAdvance(false);
    trackEvent(POSTHOG_EVENTS.CONTENT_CREATE_STEP_COMPLETED, {
      step,
      format_count: selectedFormats.length,
      repo_count: selectedRepoIds.length,
      lookback: lookbackWindow,
      event_count: eventCounts.selected,
    });
    setStep(STEP_ORDER[idx + 1] as WizardStep);
  }, [
    step,
    selectedFormats.length,
    selectedRepoIds.length,
    lookbackWindow,
    isLoadingPreview,
    eventCounts.selected,
  ]);

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) {
      setAttemptedAdvance(false);
      setStep(STEP_ORDER[idx - 1] as WizardStep);
    }
  }, [step]);

  const goToStep = useCallback(
    (idx: number) => {
      const target = STEP_ORDER[idx];
      if (target !== undefined && idx < STEP_ORDER.indexOf(step)) {
        setAttemptedAdvance(false);
        setStep(target);
      }
    },
    [step]
  );

  const buildSelectedItems = useCallback((): SelectedItems => {
    if (!selectionsTouchedRef.current) {
      return undefined;
    }
    const hasLinear = selectedLinearIds.length > 0;
    const commitShas = dataPoints.includeCommits
      ? Array.from(selectedCommitKeys)
      : undefined;
    const pullRequestNumbers = dataPoints.includePullRequests
      ? Array.from(selectedPrKeys)
          .map((key) => prSelectionFromKey(key))
          .filter((sel): sel is PrSelection => sel !== null)
      : undefined;
    const releaseTagNames = dataPoints.includeReleases
      ? Array.from(selectedReleaseKeys)
          .map((key) => releaseSelectionFromKey(key))
          .filter((sel): sel is ReleaseSelection => sel !== null)
      : undefined;
    const linearIssueIds =
      hasLinear && selectedLinearKeys.size > 0
        ? Array.from(selectedLinearKeys).map((key) => {
            const sep = key.indexOf(":");
            return {
              integrationId: key.slice(0, sep),
              issueId: key.slice(sep + 1),
            };
          })
        : undefined;

    if (
      !(
        commitShas?.length ||
        pullRequestNumbers?.length ||
        releaseTagNames?.length ||
        linearIssueIds?.length
      )
    ) {
      return undefined;
    }
    return {
      commitShas,
      pullRequestNumbers,
      releaseTagNames,
      linearIssueIds,
    };
  }, [
    dataPoints,
    selectedCommitKeys,
    selectedPrKeys,
    selectedReleaseKeys,
    selectedLinearKeys,
    selectedLinearIds,
  ]);

  useEffect(() => {
    submitHandlerRef.current = async (value: CreateContentFormValues) => {
      const voiceIds =
        value.brandVoiceIds.length > 0 ? value.brandVoiceIds : [""];
      trackEvent(POSTHOG_EVENTS.CONTENT_CREATE_STEP_COMPLETED, {
        step,
        format_count: value.formats.length,
        repo_count: value.repositoryIds.length,
        lookback: value.lookbackWindow,
        event_count: eventCounts.selected,
        voice_count: value.brandVoiceIds.length,
      });
      await mutation.mutateAsync({
        formats: value.formats,
        voiceIds,
        selectedItems: buildSelectedItems(),
      });
    };
  }, [buildSelectedItems, eventCounts.selected, mutation, step]);

  const handleCreate = useCallback(() => {
    setAttemptedAdvance(true);
    form.handleSubmit();
  }, [form]);

  const handleOpenAddRepositoryFlow = useCallback(() => {
    openingAddRepoFlowRef.current = true;
    setAddRepoMode(githubIntegrationId ? "repository" : "integration");
    setWaitingForWebhookSetup(false);
    setAddRepoOpen(true);
    setDialogOpen(false);
  }, [githubIntegrationId, setDialogOpen]);

  const handleAddRepoOpenChange = useCallback(
    (isOpen: boolean) => {
      setAddRepoOpen(isOpen);
      if (isOpen) {
        return;
      }
      if (addRepoMode === "integration" && waitingForWebhookSetup) {
        return;
      }
      setAddRepoMode(null);
      setWaitingForWebhookSetup(false);
      setDialogOpen(true);
    },
    [addRepoMode, setDialogOpen, waitingForWebhookSetup]
  );

  const handleIntegrationSuccess = useCallback(() => {
    setWaitingForWebhookSetup(true);
  }, []);

  const handleIntegrationFlowComplete = useCallback(() => {
    setAddRepoMode(null);
    setWaitingForWebhookSetup(false);
    setDialogOpen(true);
  }, [setDialogOpen]);

  const identityButtonLabel =
    selectedBrandVoiceIds.length === 0
      ? "Skip & start creating"
      : `Start creating with ${selectedBrandVoiceIds.length} ${selectedBrandVoiceIds.length === 1 ? "identity" : "identities"}`;

  const stepIndex = STEP_ORDER.indexOf(step);

  const footerLeft = useMemo<{
    text: string;
    tone: "warning" | "muted";
  }>(() => {
    if (
      attemptedAdvance &&
      step === "formats" &&
      selectedFormats.length === 0
    ) {
      return {
        text: "Select at least one content format",
        tone: "warning",
      };
    }
    if (attemptedAdvance && step === "activity") {
      if (selectedRepoIds.length === 0) {
        return { text: "Select at least one source", tone: "warning" };
      }
      if (eventCounts.selected === 0) {
        return { text: "Select at least one event", tone: "warning" };
      }
    }
    if (
      attemptedAdvance &&
      step === "identities" &&
      selectedFormats.length === 0
    ) {
      return {
        text: "Select a content format before creating",
        tone: "warning",
      };
    }
    if (step === "formats") {
      return {
        text: `${selectedFormats.length} format${selectedFormats.length === 1 ? "" : "s"} selected`,
        tone: "muted",
      };
    }
    if (step === "activity") {
      if (selectedRepoIds.length === 0) {
        return { text: "No sources selected yet", tone: "muted" };
      }
      return {
        text: `${eventCounts.selected} / ${eventCounts.total} events · ${selectedRepoIds.length} source${selectedRepoIds.length === 1 ? "" : "s"}`,
        tone: "muted",
      };
    }
    return {
      text:
        selectedBrandVoiceIds.length === 0
          ? "No identities selected"
          : `${selectedBrandVoiceIds.length} ${selectedBrandVoiceIds.length === 1 ? "identity" : "identities"} selected`,
      tone: "muted",
    };
  }, [
    attemptedAdvance,
    step,
    selectedFormats.length,
    selectedRepoIds.length,
    eventCounts,
    selectedBrandVoiceIds.length,
  ]);

  return (
    <>
      <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
        {!hideTrigger && (
          <ResponsiveDialogTrigger
            render={
              <CreateContentButton
                disabled={!organizationId || !isProjectResolved}
              />
            }
          />
        )}
        <ResponsiveDialogContent className="flex h-[85vh] max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <ResponsiveDialogHeader className="shrink-0 border-b p-4 pr-14">
            <div className="flex items-center justify-between gap-4">
              <ResponsiveDialogTitle className="text-base">
                {STEP_TITLES[step]}
              </ResponsiveDialogTitle>
              <StepProgress activeIndex={stepIndex} onStepSelect={goToStep} />
            </div>
          </ResponsiveDialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {step === "formats" && (
                <StepFormats
                  dataPoints={dataPoints}
                  lookbackWindow={lookbackWindow}
                  onDataPointChange={handleDataPointChange}
                  onLookbackChange={handleLookbackChange}
                  onToggle={toggleFormat}
                  selected={selectedFormats}
                  timezone={timezone}
                />
              )}
              {step === "activity" && (
                <StepActivity
                  dataPoints={dataPoints}
                  integrationOptions={integrationOptions}
                  isLoadingIntegrations={isLoadingRepos}
                  isLoadingPreview={isLoadingPreview}
                  isPreviewError={isPreviewError}
                  onConnect={handleOpenAddRepositoryFlow}
                  onRetryPreview={handleRetryPreview}
                  onSearchQueryChange={setSearchQuery}
                  onToggleAllIntegrations={toggleAllRepoIds}
                  onToggleCommit={(key) => {
                    selectionsTouchedRef.current = true;
                    setSelectedCommitKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) {
                        next.delete(key);
                      } else {
                        next.add(key);
                      }
                      return next;
                    });
                  }}
                  onToggleIntegration={toggleRepoId}
                  onToggleLinear={(key) => {
                    selectionsTouchedRef.current = true;
                    setSelectedLinearKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) {
                        next.delete(key);
                      } else {
                        next.add(key);
                      }
                      return next;
                    });
                  }}
                  onTogglePr={(key) => {
                    selectionsTouchedRef.current = true;
                    setSelectedPrKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) {
                        next.delete(key);
                      } else {
                        next.add(key);
                      }
                      return next;
                    });
                  }}
                  onToggleRelease={(key) => {
                    selectionsTouchedRef.current = true;
                    setSelectedReleaseKeys((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) {
                        next.delete(key);
                      } else {
                        next.add(key);
                      }
                      return next;
                    });
                  }}
                  organizationId={organizationId}
                  preview={previewResponse}
                  repositories={previewData}
                  searchQuery={searchQuery}
                  selectedCommitKeys={selectedCommitKeys}
                  selectedIntegrationIds={selectedRepoIds}
                  selectedLinearKeys={selectedLinearKeys}
                  selectedPrKeys={selectedPrKeys}
                  selectedReleaseKeys={selectedReleaseKeys}
                />
              )}
              {step === "identities" && (
                <StepBrandIdentities
                  isLoading={isLoadingVoices}
                  onToggle={toggleVoiceId}
                  organizationId={organizationId}
                  selected={selectedBrandVoiceIds}
                  voices={brandVoices}
                />
              )}
            </div>

            <div className="bg-muted/30 shrink-0 border-t px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {step !== "formats" && (
                    <Button
                      disabled={mutation.isPending}
                      onClick={goBack}
                      type="button"
                      variant="outline"
                    >
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={ArrowLeft01Icon}
                      />
                      Back
                    </Button>
                  )}
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      footerLeft.tone === "warning"
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {footerLeft.tone === "warning" && (
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={AlertCircleIcon}
                      />
                    )}
                    {footerLeft.text}
                  </span>
                </div>
                {step === "identities" ? (
                  <Button
                    disabled={mutation.isPending || !isProjectResolved}
                    onClick={handleCreate}
                    type="button"
                  >
                    {mutation.isPending ? (
                      <>
                        <HugeiconsIcon
                          className="size-4 animate-spin"
                          icon={Loading03Icon}
                        />
                        Generating...
                      </>
                    ) : (
                      <>
                        {identityButtonLabel}
                        <HugeiconsIcon
                          className="size-3.5"
                          icon={ArrowRight01Icon}
                        />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    disabled={mutation.isPending}
                    onClick={goNext}
                    type="button"
                  >
                    Continue
                    <HugeiconsIcon
                      className="size-3.5"
                      icon={ArrowRight01Icon}
                    />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      {addRepoMode === "repository" && githubIntegrationId && (
        <AddRepositoryDialog
          integrationId={githubIntegrationId}
          onOpenChange={handleAddRepoOpenChange}
          open={addRepoOpen}
          organizationId={organizationId}
        />
      )}
      {addRepoMode === "integration" && (
        <AddIntegrationDialog
          onFlowComplete={handleIntegrationFlowComplete}
          onOpenChange={handleAddRepoOpenChange}
          onSuccess={handleIntegrationSuccess}
          open={addRepoOpen}
          organizationId={organizationId}
        />
      )}
    </>
  );
}

function StepProgress({ activeIndex, onStepSelect }: StepProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {STEP_ORDER.map((stepKey, idx) => {
        const isCompleted = idx < activeIndex;
        const isActive = idx === activeIndex;
        const indicator = (
          <>
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
                isActive && "bg-foreground text-background",
                isCompleted && "bg-foreground/80 text-background",
                !(isActive || isCompleted) && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <HugeiconsIcon className="size-3" icon={Tick01Icon} />
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={cn(
                "hidden text-xs sm:inline",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {STEP_LABELS[stepKey]}
            </span>
          </>
        );
        return (
          <div className="flex items-center gap-2" key={stepKey}>
            {isCompleted ? (
              <button
                className="hover:bg-muted -m-1 flex cursor-pointer items-center gap-2 rounded-md p-1 transition-colors"
                onClick={() => onStepSelect(idx)}
                type="button"
              >
                {indicator}
              </button>
            ) : (
              <div className="flex items-center gap-2">{indicator}</div>
            )}
            {idx < STEP_ORDER.length - 1 && (
              <div
                className={cn(
                  "hidden h-px w-4 sm:block",
                  isCompleted ? "bg-foreground/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
