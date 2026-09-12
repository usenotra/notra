"use client";

import {
  GEO_SHELF_SOURCE_KINDS,
  GEO_SHELF_TITLE_MAX_LENGTH,
  GEO_SHELF_URL_INVALID_MESSAGE,
  GEO_SHELF_URL_MAX_LENGTH,
} from "@notra/schemas/constants/dashboard/geo-shelf";
import {
  canonicalizeShelfUrl,
  isAllowedShelfUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useForm, useStore } from "@tanstack/react-form";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/button";
import { ShelfPresenceFields } from "@/components/geo/shelf/shelf-presence-fields";
import { ShelfTicketForm } from "@/components/geo/shelf/shelf-ticket-form";
import { ShelfTitleField } from "@/components/geo/shelf/shelf-title-field";
import {
  GEO_SHELF_DUPLICATE_URL_MESSAGE,
  GEO_SHELF_PREVIEW_DEBOUNCE_MS,
  GEO_SHELF_PREVIEW_RATE_LIMIT_MESSAGE,
  GEO_SHELF_PREVIEW_UNAVAILABLE_MESSAGE,
  GEO_SHELF_SOURCE_KIND_LABELS,
  GEO_SHELF_TITLE_TOO_LONG_MESSAGE,
  GEO_SHELF_URL_TOO_LONG_MESSAGE,
} from "@/constants/geo-shelf";
import { useGeoShelfPreview } from "@/lib/hooks/use-geo-shelf";
import type {
  GeoShelfAddDialogProps,
  GeoShelfNewSourceDraft,
  GeoShelfOpportunity,
  GeoShelfSourceKind,
} from "@/types/geo-shelf";
import { toErrorMessage } from "@/utils/error-message";

function toKind(value: string): GeoShelfSourceKind {
  return GEO_SHELF_SOURCE_KINDS.find((kind) => kind === value) ?? "other";
}

/** Stored rows may predate canonicalization, so compare both sides canonical. */
function canonicalizeShelfUrlSafe(raw: string): string {
  return isAllowedShelfUrl(raw) ? canonicalizeShelfUrl(raw) : raw;
}

function validateShelfUrl(
  value: string,
  existingUrls: readonly string[]
): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (value.length > GEO_SHELF_URL_MAX_LENGTH) {
    return GEO_SHELF_URL_TOO_LONG_MESSAGE;
  }
  if (!isAllowedShelfUrl(trimmed)) {
    return GEO_SHELF_URL_INVALID_MESSAGE;
  }
  const canonical = canonicalizeShelfUrl(trimmed);
  const isDuplicate = existingUrls.some(
    (existing) => canonicalizeShelfUrlSafe(existing) === canonical
  );
  return isDuplicate ? GEO_SHELF_DUPLICATE_URL_MESSAGE : undefined;
}

function validateShelfTitle(value: string): string | undefined {
  return value.length > GEO_SHELF_TITLE_MAX_LENGTH
    ? GEO_SHELF_TITLE_TOO_LONG_MESSAGE
    : undefined;
}

/**
 * The preview is a nice-to-have: surface the rate limit verbatim, and keep every
 * other failure as a hint that the title can be typed by hand.
 */
function previewErrorHint(error: unknown): string {
  const message = toErrorMessage(error, GEO_SHELF_PREVIEW_UNAVAILABLE_MESSAGE);
  return message === GEO_SHELF_PREVIEW_RATE_LIMIT_MESSAGE
    ? message
    : GEO_SHELF_PREVIEW_UNAVAILABLE_MESSAGE;
}

function toPreviewOpportunity(
  draft: GeoShelfNewSourceDraft["opportunity"]
): GeoShelfOpportunity {
  return {
    id: "draft",
    ...draft,
    createdByUserId: null,
    resolvedAt: null,
    createdAt: "",
    updatedAt: "",
  };
}

export function ShelfAddDialog({
  open,
  onOpenChange,
  organizationId,
  competitors,
  members,
  currentMemberId,
  ownBrandName,
  existingUrls,
  onSubmit,
}: GeoShelfAddDialogProps) {
  const id = useId();
  const previewTitleRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const form = useForm({
    defaultValues: {
      url: "",
      title: "",
      kind: "listicle",
      ownPresent: false,
      presentCompetitorIds: [],
      opportunity: {
        status: "open",
        priority: null,
        assigneeMemberId: currentMemberId,
        pocMemberId: null,
        notes: null,
        dueAt: null,
      },
    } as GeoShelfNewSourceDraft,
    onSubmit: ({ value }) => {
      const typedTitle = value.title.trim();
      const submittedUrl = value.url.trim();
      const matchingPreviewTitle =
        isAllowedShelfUrl(submittedUrl) &&
        previewUrlRef.current === canonicalizeShelfUrl(submittedUrl)
          ? (previewTitleRef.current ?? "")
          : "";
      onSubmit({
        ...value,
        title: typedTitle.length > 0 ? typedTitle : matchingPreviewTitle,
      });
      form.reset();
      previewTitleRef.current = null;
      previewUrlRef.current = null;
      onOpenChange(false);
    },
  });

  const urlValue = useStore(form.store, (state) => state.values.url);
  const titleValue = useStore(form.store, (state) => state.values.title);
  const [debouncedUrl] = useDebouncedValue(urlValue, {
    wait: GEO_SHELF_PREVIEW_DEBOUNCE_MS,
  });
  const debouncedUrlError = validateShelfUrl(debouncedUrl, existingUrls);
  const previewUrl =
    open && debouncedUrl.trim().length > 0 && debouncedUrlError === undefined
      ? debouncedUrl.trim()
      : null;
  const preview = useGeoShelfPreview(organizationId, previewUrl);
  const previewTitle = preview.data?.title ?? null;
  useEffect(() => {
    if (previewUrl !== null) {
      previewTitleRef.current = previewTitle;
      previewUrlRef.current = canonicalizeShelfUrl(previewUrl);
    }
  }, [previewTitle, previewUrl]);
  const isPreviewLoading = previewUrl !== null && preview.isFetching;
  const showPreviewTitle =
    titleValue.trim().length === 0 && previewTitle !== null;
  const previewError =
    previewUrl !== null && preview.isError
      ? previewErrorHint(preview.error)
      : null;

  const closeDialog = () => {
    form.reset();
    previewTitleRef.current = null;
    previewUrlRef.current = null;
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
          return;
        }
        closeDialog();
      }}
      open={open}
    >
      <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-xl font-semibold">
            Add a shelf
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            A page you want {ownBrandName || "your brand"} to be listed on. Tick
            the competitors already there and hand the ticket to someone.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
            <form.Field
              name="url"
              validators={{
                onChange: ({ value }) => validateShelfUrl(value, existingUrls),
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-url`}>Page URL</Label>
                  <Input
                    aria-describedby={
                      field.state.meta.errors.length > 0
                        ? `${id}-url-error`
                        : undefined
                    }
                    aria-invalid={field.state.meta.errors.length > 0}
                    autoFocus
                    id={`${id}-url`}
                    inputMode="url"
                    maxLength={GEO_SHELF_URL_MAX_LENGTH}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="https://www.g2.com/categories/..."
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p
                      className="text-destructive text-xs"
                      id={`${id}-url-error`}
                    >
                      {String(field.state.meta.errors[0])}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>
            <form.Field name="kind">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-kind`}>Kind</Label>
                  <Select
                    onValueChange={(value) =>
                      field.handleChange(toKind(value ?? "other"))
                    }
                    value={field.state.value}
                  >
                    <SelectTrigger className="w-full" id={`${id}-kind`}>
                      <SelectValue>
                        {GEO_SHELF_SOURCE_KIND_LABELS[field.state.value]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GEO_SHELF_SOURCE_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {GEO_SHELF_SOURCE_KIND_LABELS[kind]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          <form.Field
            name="title"
            validators={{ onChange: ({ value }) => validateShelfTitle(value) }}
          >
            {(field) => (
              <ShelfTitleField
                errors={field.state.meta.errors}
                id={`${id}-title`}
                isPreviewLoading={isPreviewLoading}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                previewError={previewError}
                previewTitle={previewTitle}
                showPreviewTitle={showPreviewTitle}
                value={field.state.value}
              />
            )}
          </form.Field>

          <form.Field name="ownPresent">
            {(ownPresentField) => (
              <form.Field name="presentCompetitorIds">
                {(competitorIdsField) => (
                  <ShelfPresenceFields
                    competitors={competitors}
                    id={id}
                    onOwnPresentChange={ownPresentField.handleChange}
                    onPresentCompetitorIdsChange={
                      competitorIdsField.handleChange
                    }
                    ownBrandName={ownBrandName}
                    ownPresent={ownPresentField.state.value}
                    presentCompetitorIds={competitorIdsField.state.value}
                  />
                )}
              </form.Field>
            )}
          </form.Field>

          <div className="space-y-2">
            <p className="text-sm font-medium">Ticket</p>
            <form.Field name="opportunity">
              {(field) => (
                <ShelfTicketForm
                  currentMemberId={currentMemberId}
                  disabled={false}
                  members={members}
                  onChange={(changes) =>
                    field.handleChange({ ...field.state.value, ...changes })
                  }
                  opportunity={toPreviewOpportunity(field.state.value)}
                />
              )}
            </form.Field>
          </div>

          <ResponsiveDialogFooter className="gap-2 sm:justify-end">
            <Button onClick={closeDialog} type="button" variant="outline">
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.values.url, state.canSubmit] as const}
            >
              {([url, canSubmit]) => (
                <Button
                  disabled={!(canSubmit && isAllowedShelfUrl(url))}
                  type="submit"
                >
                  Add shelf
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
