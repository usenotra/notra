"use client";

import {
  Globe02Icon,
  Link04Icon,
  Route01Icon,
  ServerStack01Icon,
} from "@hugeicons/core-free-icons";
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
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SITE_DOMAIN_URL_SCHEME_PATTERN } from "@/constants/sites";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteDomainAddDialogProps } from "@/types/components/sites";
import type { SiteDomainKind } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { detectSiteDomainKind } from "@/utils/site-domains";
import { mountedPaths } from "@/utils/site-proxy-recipes";

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
  const [value, setValue] = useState("");
  const [override, setOverride] = useState<SiteDomainKind | null>(null);
  const trimmed = value.trim();
  const detected = detectSiteDomainKind(trimmed);
  const kind = detected ? (override ?? detected) : null;
  const hostname = trimmed.split("/")[0] ?? "";
  const urls = mountedPaths(mounts).map((path) =>
    path === "/" ? hostname : `${hostname}${path}`
  );

  const addMutation = useMutation({
    mutationFn: (domainKind: SiteDomainKind) =>
      dashboardOrpc.sites.domains.add.call({
        organizationId,
        siteId,
        kind: domainKind,
        value: trimmed,
      }),
    onSuccess: async () => {
      toast.success(t("added"));
      setValue("");
      setOverride(null);
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
          className="space-y-3"
          id={`${id}-form`}
          onSubmit={(event) => {
            event.preventDefault();
            if (kind && !addMutation.isPending) {
              addMutation.mutate(kind);
            }
          }}
        >
          <InputGroup>
            <InputGroupAddon>
              <HugeiconsIcon
                aria-hidden="true"
                icon={Globe02Icon}
                size={15}
                strokeWidth={1.5}
              />
            </InputGroupAddon>
            <InputGroupInput
              aria-describedby={`${id}-connection`}
              aria-label={t("label")}
              autoCapitalize="none"
              autoComplete="off"
              autoFocus
              inputMode="url"
              onChange={(event) => {
                const next = event.target.value.replace(
                  SITE_DOMAIN_URL_SCHEME_PATTERN,
                  ""
                );
                if (detectSiteDomainKind(next) !== detected) {
                  setOverride(null);
                }
                setValue(next);
              }}
              placeholder={t("placeholder")}
              spellCheck={false}
              value={value}
            />
          </InputGroup>
          <div
            aria-live="polite"
            className="rounded-lg border p-3"
            id={`${id}-connection`}
          >
            {kind ? (
              <div
                className="animate-in fade-in duration-normal ease-emphasized space-y-3"
                key={kind}
              >
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs">{t("liveAt")}</p>
                  <ul className="space-y-1">
                    {urls.map((url) => (
                      <li
                        className="flex items-center gap-2 font-mono text-sm"
                        key={url}
                      >
                        <HugeiconsIcon
                          aria-hidden="true"
                          className="text-muted-foreground shrink-0"
                          icon={Link04Icon}
                          size={13}
                          strokeWidth={1.5}
                        />
                        <span className="truncate">{url}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-border/60 flex items-start gap-2.5 border-t pt-3">
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 shrink-0"
                    icon={
                      kind === "subdomain" ? ServerStack01Icon : Route01Icon
                    }
                    size={15}
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <p className="text-muted-foreground text-pretty">
                      {kind === "subdomain"
                        ? t("subdomainExplain", { hostname })
                        : t("proxyExplain", { hostname })}
                    </p>
                    <button
                      className="text-foreground focus-visible:ring-ring/50 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
                      onClick={() =>
                        setOverride(
                          kind === "subdomain" ? "proxy" : "subdomain"
                        )
                      }
                      type="button"
                    >
                      {kind === "subdomain" ? t("useProxy") : t("useDns")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-pretty">
                {t("hint")}
              </p>
            )}
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
            disabled={!kind}
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
