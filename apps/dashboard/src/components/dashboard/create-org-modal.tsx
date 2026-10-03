"use client";

import { slugSchema } from "@notra/schemas/dashboard/organization";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import { errorMessageOr, generateOrganizationAvatar } from "@/lib/utils";
import { createOrganizationFormSchema } from "@/schemas/create-organization-form";
import { setLastVisitedOrganization } from "@/utils/cookies";
import { QUERY_KEYS } from "@/utils/query-keys";

function slugify(value: string): string {
  return slugSchema.safeParse(value).data ?? "";
}

interface CreateOrgModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrgModal({ open, onOpenChange }: CreateOrgModalProps) {
  const t = useTranslations("nav.createOrg");
  const tNavShared = useTranslations("nav.shared");
  const tCommon2 = useTranslations("common");
  const tValidation = useTranslations("nav.createOrg.validation");
  const tCommon = useTranslations("common.actions");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const createOrganizationSchema = useMemo(
    () => createOrganizationFormSchema(tValidation, tCommon2),
    [tValidation, tCommon2]
  );

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      website: "",
    },
    onSubmit: async ({ value }) => {
      setIsCreating(true);

      try {
        const { data, error } = await authClient.organization.create({
          name: value.name,
          slug: value.slug,
          logo: generateOrganizationAvatar(value.slug),
        });

        if (error) {
          setIsCreating(false);
          toast.error(errorMessageOr(error.message, t("createFailed")));
          return;
        }

        if (!data) {
          setIsCreating(false);
          toast.error(t("createFailed"));
          return;
        }

        await authClient.organization.setActive({
          organizationId: data.id,
        });

        await setLastVisitedOrganization(data.slug);

        await Promise.allSettled([
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AUTH.organizations,
          }),
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AUTH.activeOrganization,
          }),
          queryClient.invalidateQueries({
            queryKey: ["owned-organizations"],
          }),
        ]);

        toast.success(t("created"));

        onOpenChange(false);

        form.reset();

        router.push(`/${data.slug}`);
      } catch (_error) {
        setIsCreating(false);
        toast.error(t("createFailed"));
        return;
      }
      setIsCreating(false);
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tNavShared("createOrganization")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form
          className="min-w-0"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid min-w-0 gap-4 py-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  createOrganizationSchema.shape.name.safeParse(value).error
                    ?.issues[0]?.message,
              }}
            >
              {(field) => (
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="name">
                    {t("nameLabel")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="focus-within:border-ring focus-within:ring-ring/50"
                    disabled={isCreating}
                    id="name"
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      const currentSlug = form.getFieldValue("slug");
                      if (
                        !currentSlug ||
                        currentSlug === slugify(field.state.value)
                      ) {
                        form.setFieldValue("slug", slugify(e.target.value));
                      }
                    }}
                    placeholder={tCommon2("labels.acmeInc")}
                    type="text"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field
              name="slug"
              validators={{
                onChange: ({ value }) =>
                  createOrganizationSchema.shape.slug.safeParse(value).error
                    ?.issues[0]?.message,
              }}
            >
              {(field) => (
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="slug">
                    {t("slugLabel")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="focus-within:border-ring focus-within:ring-ring/50"
                    disabled={isCreating}
                    id="slug"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={tCommon2("labels.acmeIncSlug")}
                    type="text"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-xs break-all">
                    {t("slugHint", {
                      slug: field.state.value || tCommon2("labels.yourSlug"),
                    })}
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field
              name="website"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === "") {
                    return;
                  }
                  const fullUrl = `https://${value}`;
                  return createOrganizationSchema.shape.website.safeParse(
                    fullUrl
                  ).error?.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="website">{t("websiteLabel")}</Label>
                  <div
                    className={`focus-within:border-ring focus-within:ring-ring/50 flex w-full min-w-0 flex-row items-center rounded-lg border transition-colors ${field.state.meta.errors.length > 0 ? "border-destructive" : "border-border"}`}
                  >
                    <label
                      className="border-border text-muted-foreground border-r px-2.5 py-1.5 text-sm transition-colors"
                      htmlFor="website"
                    >
                      https://
                    </label>
                    <input
                      className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isCreating}
                      id="website"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="example.com"
                      type="text"
                      value={field.state.value}
                    />
                  </div>
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button
              disabled={isCreating}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {tCommon("cancel")}
            </Button>
            <Button disabled={isCreating} type="submit">
              {isCreating
                ? tCommon("creating")
                : tNavShared("createOrganization")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
