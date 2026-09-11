"use client";

import { Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  organizationNameSchema,
  organizationSlugSchema,
} from "@notra/schemas/dashboard/organization";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import { uploadFile } from "@/lib/upload/client";
import { errorMessageOr } from "@/lib/utils";
import type { OrganizationDetailsCardProps } from "@/types/settings/general";
import { setLastVisitedOrganization } from "@/utils/cookies";
import { QUERY_KEYS } from "@/utils/query-keys";

function slugOrFallback(
  data: { slug?: string | null } | null | undefined,
  fallbackSlug: string
): string {
  return data?.slug ?? fallbackSlug;
}

export function OrganizationDetailsCard({
  organization,
  slug,
}: OrganizationDetailsCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";

    setIsUploadingLogo(true);
    try {
      const { url } = await uploadFile({ file, type: "logo" });
      const result = await authClient.organization.update({
        organizationId: organization.id,
        data: { logo: url },
      });

      if (result.error) {
        toast.error(
          errorMessageOr(
            result.error.message,
            "Failed to update organization logo"
          )
        );
        setIsUploadingLogo(false);
        return;
      }

      toast.success("Organization logo updated");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AUTH.organizations,
        }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AUTH.activeOrganization,
        }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: QUERY_KEYS.AUTH.organizations,
          type: "active",
        }),
        queryClient.refetchQueries({
          queryKey: QUERY_KEYS.AUTH.activeOrganization,
          type: "active",
        }),
      ]);
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload organization logo"
      );
    }
    setIsUploadingLogo(false);
  }

  const form = useForm({
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
    onSubmit: async ({ value }) => {
      setIsUpdating(true);
      try {
        const result = await authClient.organization.update({
          organizationId: organization.id,
          data: {
            name: value.name,
            slug: value.slug,
          },
        });

        if (result.error) {
          toast.error(
            errorMessageOr(
              result.error.message,
              "Failed to update organization"
            )
          );
          setIsUpdating(false);
          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AUTH.organizations,
          }),
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AUTH.activeOrganization,
          }),
        ]);

        await Promise.all([
          queryClient.refetchQueries({
            queryKey: QUERY_KEYS.AUTH.organizations,
            type: "active",
          }),
          queryClient.refetchQueries({
            queryKey: QUERY_KEYS.AUTH.activeOrganization,
            type: "active",
          }),
        ]);

        const updatedSlug = slugOrFallback(result.data, value.slug);

        await setLastVisitedOrganization(updatedSlug);

        if (updatedSlug !== slug) {
          router.replace(`/${updatedSlug}?settings=general`);
        }

        toast.success("Organization updated successfully");
      } catch {
        toast.error("Failed to update organization");
      }
      setIsUpdating(false);
    },
  });

  useEffect(() => {
    form.reset({
      name: organization.name,
      slug: organization.slug,
    });
  }, [form, organization.name, organization.slug]);

  return (
    <TitleCard heading="Organization Details">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <div className="flex items-center gap-4">
          <input
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
            className="hidden"
            disabled={isUploadingLogo}
            onChange={handleLogoChange}
            ref={logoInputRef}
            type="file"
          />
          <button
            aria-label="Upload organization logo"
            className="group group/logo relative cursor-pointer disabled:cursor-not-allowed"
            disabled={isUploadingLogo}
            onClick={() => logoInputRef.current?.click()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            type="button"
          >
            <Avatar className="group-hover/logo:ring-muted-foreground/20 group-focus-visible:ring-ring size-16 rounded-lg ring-2 ring-transparent transition-shadow after:rounded-lg">
              <AvatarImage
                alt={organization.name}
                className="rounded-lg"
                src={organization.logo ?? undefined}
              />
              <AvatarFallback className="rounded-lg text-xl">
                {organization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
              {isUploadingLogo && (
                <span className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-lg">
                  <Loader2Icon className="size-6 animate-spin" />
                </span>
              )}
              <span className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-lg opacity-0 transition-opacity group-hover/logo:opacity-100">
                <HugeiconsIcon className="size-6" icon={Upload01Icon} />
              </span>
            </Avatar>
          </button>
          <div className="space-y-1">
            <p className="text-sm font-medium">Logo</p>
            <p className="text-muted-foreground text-xs">
              {isUploadingLogo ? "Uploading..." : "Click to upload a new logo"}
            </p>
          </div>
        </div>

        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) =>
              organizationNameSchema.safeParse(value).error?.issues[0]?.message,
          }}
        >
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Name</Label>{" "}
              <p className="text-muted-foreground text-xs">
                This is the name of your organization as it appears across the
                platform
              </p>
              <Input
                aria-invalid={field.state.meta.errors.length > 0}
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="My Organization"
                value={field.state.value}
              />
              {field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-xs">
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
              organizationSlugSchema.safeParse(value).error?.issues[0]?.message,
          }}
        >
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Slug</Label>
              <p className="text-muted-foreground text-xs">
                Used in URLs: https://app.usenotra.com/
                {field.state.value || "your-slug"}
              </p>
              <Input
                aria-invalid={field.state.meta.errors.length > 0}
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="my-organization"
                value={field.state.value}
              />
              {field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-xs">
                  {field.state.meta.errors[0]}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <div className="space-y-2">
          <Label htmlFor="organization-id">ID</Label>
          <Input id="organization-id" value={organization.id} />
        </div>

        <Button disabled={isUpdating} type="submit">
          {isUpdating ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </form>
    </TitleCard>
  );
}
