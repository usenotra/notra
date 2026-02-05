"use client";

import { Button } from "@notra/ui/components/ui/button";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { use, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { TitleCard } from "@/components/title-card";
import { authClient } from "@/lib/auth/client";
import { QUERY_KEYS } from "@/utils/query-keys";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function GeneralSettingsPage({ params }: PageProps) {
  const { slug } = use(params);
  const queryClient = useQueryClient();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const organization =
    activeOrganization?.slug === slug
      ? activeOrganization
      : getOrganization(slug);
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm({
    defaultValues: {
      name: organization?.name ?? "",
    },
    onSubmit: async ({ value }) => {
      if (!organization?.id) return;

      setIsUpdating(true);
      try {
        const result = await authClient.organization.update({
          organizationId: organization.id,
          data: {
            name: value.name,
          },
        });

        if (result.error) {
          toast.error(result.error.message ?? "Failed to update organization");
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AUTH.organizations,
        });
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AUTH.activeOrganization,
        });

        toast.success("Organization updated successfully");
      } catch {
        toast.error("Failed to update organization");
      } finally {
        setIsUpdating(false);
      }
    },
  });

  if (!organization) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-64 rounded-[20px]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">General</h1>
          <p className="text-muted-foreground">
            Manage your organization settings
          </p>
        </div>

        <TitleCard heading="Organization Details">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Organization Name</Label>
                  <Input
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="My Organization"
                    value={field.state.value}
                  />
                  <p className="text-muted-foreground text-xs">
                    This is the name of your organization as it appears across
                    the platform
                  </p>
                </div>
              )}
            </form.Field>

            <div className="space-y-2">
              <Label>Organization URL</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  https://app.usenotra.com/{organization.slug}
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Your organization URL cannot be changed
              </p>
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

        <TitleCard heading="Danger Zone">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Delete Organization</p>
                <p className="text-muted-foreground text-xs">
                  Permanently delete this organization and all its data
                </p>
              </div>
              <Button disabled size="sm" variant="destructive">
                Delete Organization
              </Button>
            </div>
          </div>
        </TitleCard>
      </div>
    </PageContainer>
  );
}
