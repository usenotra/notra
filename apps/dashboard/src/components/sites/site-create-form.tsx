"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import {
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteCreateDeploy } from "@/components/sites/site-create-deploy";
import { SiteCreateSourceFields } from "@/components/sites/site-create-source-fields";
import { SiteCreateStage } from "@/components/sites/site-create-stage";
import { SiteCreateStep } from "@/components/sites/site-create-step";
import { SiteCreateStepList } from "@/components/sites/site-create-step-list";
import { SiteImportList } from "@/components/sites/site-import-list";
import {
  SITE_CREATE_CONFIG_VARIANTS,
  SITE_CREATE_FIELD_INPUT_SUFFIXES,
  SITE_CREATE_FOCUS_DELAY_MS,
  SITE_CREATE_FORM_DEFAULTS,
  SITE_CREATE_STEP_IDS,
  SITE_CREATE_VALUE_FIELDS,
} from "@/constants/site-create";
import { useActiveProject } from "@/lib/hooks/use-active-project";
import { useCreateSite } from "@/lib/hooks/use-create-site";
import {
  useConnectSiteRepository,
  useImportableRepositories,
} from "@/lib/hooks/use-importable-repositories";
import { useRepositorySuggestions } from "@/lib/hooks/use-repository-suggestions";
import type {
  SiteCreateFormProps,
  SiteCreateStepState,
} from "@/types/components/sites";
import type {
  SiteCreateFieldErrors,
  SiteCreateFormValues,
  SiteCreateStepId,
  SiteImportableRepository,
  SiteRepository,
} from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import {
  hasSiteCreateSection,
  isSiteCreateReady,
  isSiteCreateSlugInvalid,
  siteCreateErrorField,
  siteCreateInput,
  siteCreateSectionPlan,
  withSiteRepository,
} from "@/utils/site-create";

export function SiteCreateForm({
  organizationId,
  organizationSlug,
  hostingDomain,
}: SiteCreateFormProps) {
  const t = useTranslations("sites.new");
  const id = useId();
  const reduceMotion = useReducedMotion();

  const importable = useImportableRepositories(organizationId);
  const connect = useConnectSiteRepository(organizationId);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [repository, setRepository] = useState<SiteRepository | null>(null);
  const [activeStep, setActiveStep] = useState<SiteCreateStepId>("repository");
  const [form, setForm] = useState<SiteCreateFormValues>(
    SITE_CREATE_FORM_DEFAULTS
  );
  const [errors, setErrors] = useState<SiteCreateFieldErrors>({});
  const [starterPullRequestUrl, setStarterPullRequestUrl] = useState<
    string | null
  >(null);

  const { projectId } = useActiveProject();
  const createMutation = useCreateSite();
  const isCreating = createMutation.isPending;
  const created = createMutation.data?.site ?? null;
  const suggestions = useRepositorySuggestions({
    organizationId,
    repositoryId: form.repositoryId,
    branch: form.branch.trim(),
  });
  const sections = siteCreateSectionPlan(form, suggestions.contentCounts);
  const isReady =
    isSiteCreateReady(form, repository) &&
    hasSiteCreateSection(sections) &&
    !suggestions.isLoading;

  const activeIndex = SITE_CREATE_STEP_IDS.indexOf(activeStep);
  const stateOf = (step: SiteCreateStepId): SiteCreateStepState => {
    if (step === "configure" && !repository) {
      return "locked";
    }
    const index = SITE_CREATE_STEP_IDS.indexOf(step);
    if (index === activeIndex) {
      return "active";
    }
    return index < activeIndex ? "done" : "locked";
  };

  const clearErrors = (fields: (keyof SiteCreateFieldErrors)[]) =>
    setErrors((current) => {
      const next = { ...current };
      for (const field of fields) {
        delete next[field];
      }
      return next;
    });

  const update = <K extends keyof SiteCreateFormValues>(
    key: K,
    value: SiteCreateFormValues[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    const field = SITE_CREATE_VALUE_FIELDS[key];
    if (field) {
      clearErrors(
        key === "name" && !form.slug.trim() ? [field, "slug"] : [field]
      );
    }
  };

  const goTo = (step: SiteCreateStepId, focusId?: string) => {
    if (createMutation.isSuccess && step !== "deploy") {
      return;
    }
    setActiveStep(step);
    if (focusId) {
      window.setTimeout(
        () => document.getElementById(focusId)?.focus({ preventScroll: true }),
        reduceMotion ? 0 : SITE_CREATE_FOCUS_DELAY_MS
      );
    }
  };

  const importRepository = async (candidate: SiteImportableRepository) => {
    setImportingId(candidate.githubRepositoryId);
    try {
      const picked: SiteRepository = candidate.integrationId
        ? {
            id: candidate.integrationId,
            owner: candidate.owner,
            repo: candidate.repo,
            defaultBranch: candidate.defaultBranch,
            private: candidate.private,
          }
        : await connect.mutateAsync(candidate.githubRepositoryId);
      setRepository(picked);
      setStarterPullRequestUrl(null);
      setForm((current) =>
        withSiteRepository({ ...current, name: "", slug: "" }, picked)
      );
      clearErrors(["repository"]);
      goTo("configure", `${id}-name`);
    } catch (error) {
      toast.error(toErrorMessage(error, t("importFailed")));
    } finally {
      setImportingId(null);
    }
  };

  const create = () => {
    if (!(repository && isReady) || isCreating) {
      return;
    }
    createMutation.mutate(
      siteCreateInput(form, sections, {
        organizationId,
        repositoryId: repository.id,
        projectId,
      }),
      {
        onSuccess: () => goTo("deploy"),
        onError: (error) => {
          const field = siteCreateErrorField(error);
          if (!field) {
            return;
          }
          setErrors({ [field]: error.message });
          if (field === "repository") {
            goTo("repository");
            return;
          }
          const suffix = SITE_CREATE_FIELD_INPUT_SUFFIXES[field];
          goTo("configure", suffix ? `${id}-${suffix}` : undefined);
        },
      }
    );
  };

  const steps = SITE_CREATE_STEP_IDS.map((step) => ({
    id: step,
    label: t(`stepLabels.${step}`),
    state: stateOf(step),
  }));
  const configureDescription = repository
    ? t("stepConfigureDescription", {
        repository: `${repository.owner}/${repository.repo}`,
      })
    : undefined;
  const sideTitle = {
    repository: {
      title: t("stepRepository"),
      description: t("stepRepositoryDescription"),
    },
    configure: {
      title: t("stepConfigure"),
      description: configureDescription,
    },
    deploy: {
      title: t("stepDeploy"),
      description: t("stepDeployDescription"),
    },
  }[activeStep];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6" data-site-fill>
      <PageHeading description={t("description")} title={t("title")} />
      <div className="flex min-h-[32rem] min-w-0 flex-1 flex-col">
        <SiteCreateStage
          activeIndex={activeIndex}
          left={
            <div
              aria-hidden="true"
              className="animate-in fade-in motion-safe:slide-in-from-bottom-1 space-y-1.5 pt-1 duration-500"
              key={activeStep}
            >
              <p className="text-lg font-semibold tracking-tight">
                {sideTitle.title}
              </p>
              {sideTitle.description ? (
                <p className="text-muted-foreground text-sm text-pretty">
                  {sideTitle.description}
                </p>
              ) : null}
            </div>
          }
          right={
            <SiteCreateStepList onSelect={(step) => goTo(step)} steps={steps} />
          }
        >
          <SiteCreateStep
            description={t("stepRepositoryDescription")}
            onActivate={() => goTo("repository")}
            state={stateOf("repository")}
            title={t("stepRepository")}
          >
            <SiteImportList
              importingId={importingId}
              installed={importable.data?.installed ?? false}
              isLoading={importable.isPending}
              onImport={importRepository}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              repositories={importable.data?.repositories ?? []}
            />
            {errors.repository ? (
              <p className="text-destructive mt-3 text-sm" role="alert">
                {errors.repository}
              </p>
            ) : null}
          </SiteCreateStep>

          <SiteCreateStep
            description={configureDescription}
            footer={
              <Button
                disabled={!isReady}
                loading={isCreating}
                onClick={create}
                type="button"
              >
                {t("create")}
              </Button>
            }
            onActivate={() => goTo("configure", `${id}-name`)}
            state={stateOf("configure")}
            title={t("stepConfigure")}
          >
            <MotionConfig reducedMotion="user">
              <LazyMotion features={domAnimation} strict>
                <m.div
                  animate="shown"
                  className="space-y-4"
                  initial={repository ? "hidden" : false}
                  key={repository?.id ?? "locked"}
                  variants={SITE_CREATE_CONFIG_VARIANTS}
                >
                  <SiteCreateSourceFields
                    errors={errors}
                    form={form}
                    hostingDomain={hostingDomain}
                    idPrefix={id}
                    onChange={update}
                    onStarterPullRequestOpened={setStarterPullRequestUrl}
                    organizationId={organizationId}
                    repository={repository}
                    sections={sections}
                    slugInvalid={isSiteCreateSlugInvalid(form)}
                    starterPullRequestUrl={starterPullRequestUrl}
                    suggestions={suggestions}
                  />
                </m.div>
              </LazyMotion>
            </MotionConfig>
          </SiteCreateStep>

          <SiteCreateStep state={stateOf("deploy")} title={t("stepDeploy")}>
            {created ? (
              <SiteCreateDeploy
                deploymentQueued={createMutation.data?.deploymentQueued ?? true}
                organizationId={organizationId}
                organizationSlug={organizationSlug}
                site={created}
                starterPullRequestUrl={starterPullRequestUrl}
              />
            ) : (
              <div className="h-80" />
            )}
          </SiteCreateStep>
        </SiteCreateStage>
      </div>
    </div>
  );
}
