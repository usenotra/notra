"use client";

import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
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

export function SiteVariablesSettings() {
  const { organizationId, organizationSlug, siteId } = useSite();
  const t = useTranslations("sites.variables");
  const query = useQuery(
    dashboardOrpc.sites.editor.read.queryOptions({
      input: { organizationId, siteId, path: SITE_CONFIG_FILENAME },
      refetchOnWindowFocus: false,
    })
  );
  if (query.isPending) {
    return (
      <TitleCard as="section" heading={t("title")} headingAs="h2">
        <p aria-busy="true">{t("loading")}</p>
      </TitleCard>
    );
  }
  if (query.isError) {
    return (
      <TitleCard as="section" heading={t("title")} headingAs="h2">
        <p role="alert">{toErrorMessage(query.error, t("loadFailed"))}</p>
        <Button onClick={() => query.refetch()} type="button" variant="outline">
          {t("retry")}
        </Button>
      </TitleCard>
    );
  }
  try {
    readSiteVariablesConfig(query.data.content);
  } catch {
    return (
      <TitleCard as="section" heading={t("title")} headingAs="h2">
        <p role="alert">{t("invalidConfig")}</p>
        <Link
          className="text-sm underline underline-offset-4"
          href={siteHref(organizationSlug, siteId, "editor")}
        >
          {t("openEditor")}
        </Link>
      </TitleCard>
    );
  }
  return (
    <SiteVariablesForm
      document={query.data}
      key={`${siteId}:${query.data.content}:${query.data.draftRevision}`}
    />
  );
}

function SiteVariablesForm({ document }: SiteVariablesFormProps) {
  const { organizationId, organizationSlug, siteId } = useSite();
  const t = useTranslations("sites.variables");
  const id = useId();
  const queryClient = useQueryClient();
  const initial = readSiteVariablesConfig(document.content).variables;
  const [rows, setRows] = useState<SiteVariableRow[]>(() =>
    Object.entries(initial).map(([name, value]) => ({ id: name, name, value }))
  );
  const [error, setError] = useState<string | null>(null);
  const dirty =
    JSON.stringify(rows.map(({ name, value }) => [name.trim(), value])) !==
    JSON.stringify(Object.entries(initial));
  const save = useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.editor.saveDraft.call({
        organizationId,
        siteId,
        path: SITE_CONFIG_FILENAME,
        content: patchSiteVariables(document.content, rows),
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
    <TitleCard as="section" heading={t("title")} headingAs="h2">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!dirty || save.isPending) {
            return;
          }
          try {
            siteVariablesFromRows(rows);
          } catch (cause) {
            setError(
              cause instanceof Error && cause.message === "duplicate"
                ? t("duplicate")
                : t("invalid")
            );
            const names = rows.map((row) => row.name.trim());
            const index = names.findIndex(
              (name, position) => names.indexOf(name) !== position
            );
            event.currentTarget
              .querySelectorAll("input")
              .item(Math.max(index, 0) * 2)
              ?.focus();
            return;
          }
          setError(null);
          save.mutate();
        }}
      >
        <p className="text-muted-foreground text-sm" id={`${id}-hint`}>
          {t("description")}
        </p>
        <p className="text-sm">{t("publicWarning")}</p>
        <fieldset className="space-y-3" disabled={save.isPending}>
          <legend className="sr-only">{t("title")}</legend>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : null}
          {rows.map((row, index) => (
            <div
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              key={row.id}
            >
              <Field className="sm:w-1/3">
                <FieldLabel htmlFor={`${id}-${row.id}-name`}>
                  {t("name")}
                </FieldLabel>
                <Input
                  aria-describedby={
                    error ? `${id}-hint ${id}-error` : `${id}-hint`
                  }
                  aria-invalid={
                    error &&
                    rows.some(
                      (other) =>
                        other.id !== row.id &&
                        other.name.trim() === row.name.trim()
                    )
                      ? true
                      : undefined
                  }
                  autoCapitalize="none"
                  autoComplete="off"
                  id={`${id}-${row.id}-name`}
                  maxLength={40}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.id === row.id
                          ? { ...item, name: event.target.value }
                          : item
                      )
                    )
                  }
                  pattern="[A-Za-z][A-Za-z0-9_-]{0,39}"
                  placeholder="product_name"
                  required
                  spellCheck={false}
                  value={row.name}
                />
              </Field>
              <Field className="flex-1">
                <FieldLabel htmlFor={`${id}-${row.id}-value`}>
                  {t("value")}
                </FieldLabel>
                <Input
                  id={`${id}-${row.id}-value`}
                  maxLength={500}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.id === row.id
                          ? { ...item, value: event.target.value }
                          : item
                      )
                    )
                  }
                  value={row.value}
                />
              </Field>
              <Button
                aria-label={t("removeLabel", { number: index + 1 })}
                onClick={() =>
                  setRows((current) =>
                    current.filter((item) => item.id !== row.id)
                  )
                }
                type="button"
                variant="outline"
              >
                {t("remove")}
              </Button>
            </div>
          ))}
          <Button
            onClick={() =>
              setRows((current) => [
                ...current,
                { id: crypto.randomUUID(), name: "", value: "" },
              ])
            }
            type="button"
            variant="outline"
          >
            {t("add")}
          </Button>
        </fieldset>
        {error ? (
          <p
            className="text-destructive text-sm"
            id={`${id}-error`}
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!dirty} loading={save.isPending} type="submit">
            {t("saveDraft")}
          </Button>
          {dirty ? (
            <Button
              disabled={save.isPending}
              onClick={() => {
                setRows(
                  Object.entries(initial).map(([name, value]) => ({
                    id: name,
                    name,
                    value,
                  }))
                );
                setError(null);
              }}
              type="button"
              variant="ghost"
            >
              {t("reset")}
            </Button>
          ) : null}
          {document.hasDraft ? (
            <Link
              className="text-sm underline underline-offset-4"
              href={siteHref(organizationSlug, siteId, "editor")}
            >
              {t("reviewAndPublish")}
            </Link>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">{t("publishHint")}</p>
      </form>
    </TitleCard>
  );
}
