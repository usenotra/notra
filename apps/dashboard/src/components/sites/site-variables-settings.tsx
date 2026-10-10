"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { Input } from "@notra/ui/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import Link from "@/components/framework/link";
import { useSite } from "@/components/sites/site-context";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SiteVariableRow,
  SiteVariablesFormProps,
} from "@/types/site-variables";
import { toErrorMessage } from "@/utils/error-message";
import { siteHref } from "@/utils/site-links";
import {
  patchSiteVariables,
  readSiteVariablesConfig,
  siteVariablesFromRows,
} from "@/utils/site-variables";

function useSiteConfigDocument() {
  const { organizationId, siteId } = useSite();
  return useQuery(
    dashboardOrpc.sites.editor.read.queryOptions({
      input: { organizationId, siteId, path: SITE_CONFIG_FILENAME },
      refetchOnWindowFocus: false,
    })
  );
}

/** Number of variables in blog.json, or null while loading or when it can't be read. */
export function useSiteVariablesCount(): number | null {
  const query = useSiteConfigDocument();
  if (!query.data) {
    return null;
  }
  try {
    return Object.keys(readSiteVariablesConfig(query.data.content).variables)
      .length;
  } catch {
    return null;
  }
}

export function SiteVariablesSettings() {
  const { organizationSlug, siteId } = useSite();
  const t = useTranslations("sites.variables");
  const query = useSiteConfigDocument();
  if (query.isPending) {
    return (
      <div className="space-y-3 text-sm">
        <p aria-busy="true">{t("loading")}</p>
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="space-y-3 text-sm">
        <p role="alert">{toErrorMessage(query.error, t("loadFailed"))}</p>
        <Button onClick={() => query.refetch()} type="button" variant="outline">
          {t("retry")}
        </Button>
      </div>
    );
  }
  try {
    readSiteVariablesConfig(query.data.content);
  } catch {
    return (
      <div className="space-y-3 text-sm">
        <p role="alert">{t("invalidConfig")}</p>
        <Link
          className="text-sm underline underline-offset-4"
          href={siteHref(organizationSlug, siteId, "editor")}
        >
          {t("openEditor")}
        </Link>
      </div>
    );
  }
  return (
    <SiteVariablesForm
      document={query.data}
      key={`${siteId}:${query.data.content}:${query.data.draftRevision}`}
    />
  );
}

function emptyRow(): SiteVariableRow {
  return { id: crypto.randomUUID(), name: "", value: "" };
}

function SiteVariablesForm({ document }: SiteVariablesFormProps) {
  const { organizationId, organizationSlug, siteId } = useSite();
  const t = useTranslations("sites.variables");
  const id = useId();
  const queryClient = useQueryClient();
  const initial = readSiteVariablesConfig(document.content).variables;
  const initialRows = (): SiteVariableRow[] => {
    const existing = Object.entries(initial).map(([name, value]) => ({
      id: name,
      name,
      value,
    }));
    return existing.length > 0 ? existing : [emptyRow()];
  };
  const [rows, setRows] = useState<SiteVariableRow[]>(initialRows);
  const [error, setError] = useState<string | null>(null);
  // A row with neither name nor value is a blank slot, not a variable.
  const filled = rows.filter((row) => row.name.trim() || row.value);
  const dirty =
    JSON.stringify(filled.map(({ name, value }) => [name.trim(), value])) !==
    JSON.stringify(Object.entries(initial));
  const updateRow = (rowId: string, patch: Partial<SiteVariableRow>) =>
    setRows((current) =>
      current.map((item) => (item.id === rowId ? { ...item, ...patch } : item))
    );
  const save = useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.editor.saveDraft.call({
        organizationId,
        siteId,
        path: SITE_CONFIG_FILENAME,
        content: patchSiteVariables(document.content, filled),
        baseBlobSha: document.blobSha,
        baseCommitSha: null,
        draftId: document.draftId,
        draftRevision: document.draftRevision,
        sourceContext: document.sourceContext,
      }),
    onSuccess: async () => {
      toast.success(t("saved"));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.sites.editor.read.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.sites.editor.files.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.sites.get.key(),
        }),
      ]);
    },
    onError: (cause) => setError(toErrorMessage(cause, t("saveFailed"))),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!dirty || save.isPending) {
          return;
        }
        try {
          siteVariablesFromRows(filled);
        } catch (cause) {
          setError(
            cause instanceof Error && cause.message === "duplicate"
              ? t("duplicate")
              : t("invalid")
          );
          return;
        }
        setError(null);
        save.mutate();
      }}
    >
      <fieldset className="max-w-2xl" disabled={save.isPending}>
        <legend className="sr-only">{t("title")}</legend>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_2rem] items-center gap-x-2 gap-y-2">
          <span
            className="text-muted-foreground px-1 text-xs"
            id={`${id}-name`}
          >
            {t("name")}
          </span>
          <span
            className="text-muted-foreground px-1 text-xs"
            id={`${id}-value`}
          >
            {t("value")}
          </span>
          <span />
          {rows.map((row, index) => (
            <Fragment key={row.id}>
              <Input
                aria-invalid={
                  error &&
                  row.name.trim() &&
                  filled.some(
                    (other) =>
                      other.id !== row.id &&
                      other.name.trim() === row.name.trim()
                  )
                    ? true
                    : undefined
                }
                aria-labelledby={`${id}-name`}
                autoCapitalize="none"
                autoComplete="off"
                maxLength={40}
                onChange={(event) =>
                  updateRow(row.id, { name: event.target.value })
                }
                pattern="[A-Za-z][A-Za-z0-9_-]{0,39}"
                placeholder="product_name"
                spellCheck={false}
                value={row.name}
              />
              <Input
                aria-labelledby={`${id}-value`}
                maxLength={500}
                onChange={(event) =>
                  updateRow(row.id, { value: event.target.value })
                }
                placeholder="Acme"
                value={row.value}
              />
              <Button
                aria-label={t("removeLabel", { number: index + 1 })}
                onClick={() =>
                  setRows((current) => {
                    const next = current.filter((item) => item.id !== row.id);
                    return next.length > 0 ? next : [emptyRow()];
                  })
                }
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Delete02Icon}
                  strokeWidth={1.75}
                />
              </Button>
            </Fragment>
          ))}
        </div>
        <Button
          className="mt-2"
          onClick={() => setRows((current) => [...current, emptyRow()])}
          size="sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            aria-hidden="true"
            data-icon="inline-start"
            icon={Add01Icon}
            strokeWidth={1.75}
          />
          {t("add")}
        </Button>
      </fieldset>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
        <div className="flex items-center gap-2">
          {document.hasDraft && !dirty && !save.isPending ? (
            <Link
              className="text-sm underline underline-offset-4"
              href={siteHref(organizationSlug, siteId, "editor")}
            >
              {t("reviewAndPublish")}
            </Link>
          ) : null}
          {dirty ? (
            <Button
              disabled={save.isPending}
              onClick={() => {
                setRows(initialRows());
                setError(null);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {t("reset")}
            </Button>
          ) : null}
          <Button
            disabled={!dirty}
            loading={save.isPending}
            size="sm"
            type="submit"
          >
            {t("saveDraft")}
          </Button>
        </div>
      </div>
    </form>
  );
}
