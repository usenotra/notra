"use client";

import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { generateOrganizationAvatar, slugify } from "@/lib/utils";
import { setLastVisitedOrganization } from "@/utils/cookies";
import { QUERY_KEYS } from "@/utils/query-keys";
import { createOrganizationSchema } from "@/utils/schemas/organization";

interface CreateOrgModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrgModal({ open, onOpenChange }: CreateOrgModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

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
          website: value.website || undefined,
        });

        if (error) {
          toast.error(error.message || "Failed to create organization");
          return;
        }

        if (!data) {
          toast.error("Failed to create organization");
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
        ]);

        toast.success("Organization created successfully");

        onOpenChange(false);

        form.reset();

        router.push(`/${data.slug}`);
      } catch (_error) {
        toast.error("Failed to create organization");
      } finally {
        setIsCreating(false);
      }
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4 py-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  createOrganizationSchema.shape.name.safeParse(value).error
                    ?.issues[0]?.message,
              }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Organization Name{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
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
                    placeholder="Acme Inc"
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
                <div className="grid gap-2">
                  <Label htmlFor="slug">
                    Organization Slug{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
                    disabled={isCreating}
                    id="slug"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="acme-inc"
                    type="text"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-destructive text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    Used in URLs: app.usenotra.com/
                    {field.state.value || "your-slug"}
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
                  return createOrganizationSchema.shape.website.safeParse(value)
                    .error?.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="website">Website (optional)</Label>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
                    disabled={isCreating}
                    id="website"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://usenotra.com"
                    type="url"
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
          </div>

          <DialogFooter>
            <Button
              disabled={isCreating}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isCreating} type="submit">
              {isCreating ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
