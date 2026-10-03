"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { SiteChoiceGroup } from "@/components/sites/site-form-fields";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteDomainAddDialogProps, SiteDomainKind } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { mountedPaths } from "@/utils/site-proxy-recipes";

const URL_SCHEME = /^https?:\/\//i;

export function SiteDomainAddDialog({
  organizationId,
  siteId,
  mounts,
  open,
  onOpenChange,
}: SiteDomainAddDialogProps) {
  const t = useTranslations("sites.domainsPage.add");
  const tCommon = useTranslations("common");
  const id = useId();
  const invalidateSites = useInvalidateSites();
  const [kind, setKind] = useState<SiteDomainKind>("subdomain");
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const paths = mountedPaths(mounts).join(", ");

  const addMutation = useMutation({
    mutationFn: () =>
      dashboardOrpc.sites.domains.add.call({
        organizationId,
        siteId,
        kind,
        value: trimmed,
      }),
    onSuccess: async () => {
      toast.success(t("added"));
      setValue("");
      onOpenChange(false);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("addFailed")));
    },
  });

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="space-y-5"
          id={`${id}-form`}
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed && !addMutation.isPending) {
              addMutation.mutate();
            }
          }}
        >
          <SiteChoiceGroup
            label={t("kindLabel")}
            onValueChange={setKind}
            options={[
              {
                value: "subdomain",
                title: t("subdomainTitle"),
                description: t("subdomainDescription"),
              },
              {
                value: "proxy",
                title: t("proxyTitle"),
                description: t("proxyDescription", { paths }),
              },
            ]}
            value={kind}
          />
          <div className="space-y-2">
            <Label htmlFor={`${id}-domain`}>
              {kind === "subdomain" ? t("subdomainLabel") : t("proxyLabel")}
            </Label>
            <InputGroup>
              <InputGroupAddon>https://</InputGroupAddon>
              <InputGroupInput
                aria-describedby={`${id}-hint`}
                autoCapitalize="none"
                autoComplete="off"
                autoFocus
                id={`${id}-domain`}
                inputMode="url"
                onChange={(event) =>
                  setValue(event.target.value.replace(URL_SCHEME, ""))
                }
                placeholder={
                  kind === "subdomain" ? "blog.acme.com" : "acme.com"
                }
                spellCheck={false}
                value={value}
              />
            </InputGroup>
            <p
              className="text-muted-foreground flex items-start gap-1.5 text-xs text-pretty"
              id={`${id}-hint`}
            >
              <HugeiconsIcon
                aria-hidden="true"
                className="mt-px size-3.5 shrink-0"
                icon={InformationCircleIcon}
                strokeWidth={1.5}
              />
              {kind === "subdomain"
                ? t("subdomainHint")
                : t("proxyHint", { paths })}
            </p>
          </div>
        </form>
        <ResponsiveDialogFooter>
          <Button
            disabled={addMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            disabled={!trimmed}
            form={`${id}-form`}
            loading={addMutation.isPending}
            type="submit"
          >
            {t("submit")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
