"use client";

import { Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { userNameSchema } from "@notra/schemas/dashboard/auth/user-actions";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useForm } from "@tanstack/react-form";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import { uploadFile } from "@/lib/upload/client";
import { errorMessageOr } from "@/lib/utils";
import type { ProfileSectionProps } from "@/types/settings/account";
import { getUserAvatarUrl } from "@/utils/avatar";

export function ProfileSection({
  user,
  onSessionRefetch,
}: ProfileSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    e.target.value = "";

    setIsUploadingAvatar(true);
    try {
      const { url } = await uploadFile({ file, type: "avatar" });
      const result = await authClient.updateUser({ image: url });

      if (result.error) {
        toast.error(
          errorMessageOr(
            result.error.message,
            "Failed to update profile picture"
          )
        );
        setIsUploadingAvatar(false);
        return;
      }

      toast.success("Profile picture updated");
      if (onSessionRefetch) {
        await onSessionRefetch();
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload profile picture"
      );
    }
    setIsUploadingAvatar(false);
  }

  const form = useForm({
    defaultValues: {
      name: user.name,
    },
    onSubmit: async ({ value }) => {
      const validated = userNameSchema.safeParse(value.name);

      if (!validated.success) {
        const issue = validated.error?.issues[0];
        toast.error(issue?.message ?? "Invalid name");
        return;
      }

      if (validated.data === user.name) {
        return;
      }

      setIsUpdating(true);
      try {
        const result = await authClient.updateUser({
          name: validated.data,
        });

        if (result.error) {
          toast.error(
            errorMessageOr(result.error.message, "Failed to update profile")
          );
          setIsUpdating(false);
          return;
        }

        toast.success("Profile updated successfully");
        if (onSessionRefetch) {
          await onSessionRefetch();
        }
      } catch {
        toast.error("Failed to update profile");
      }
      setIsUpdating(false);
    },
  });

  return (
    <TitleCard heading="Your Profile">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <input
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
            className="hidden"
            disabled={isUploadingAvatar}
            onChange={handleAvatarChange}
            ref={fileInputRef}
            type="file"
          />
          <button
            aria-label="Upload profile picture"
            className="group group/avatar relative cursor-pointer disabled:cursor-not-allowed"
            disabled={isUploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            type="button"
          >
            <Avatar className="group-hover/avatar:ring-muted-foreground/20 group-focus-visible:ring-ring size-16 rounded-lg ring-2 ring-transparent transition-shadow after:rounded-lg">
              <AvatarImage
                alt={user.name}
                className="rounded-lg"
                src={getUserAvatarUrl(user.image, user.email)}
              />
              <AvatarFallback className="rounded-lg text-xl">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
              {isUploadingAvatar && (
                <span className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-lg">
                  <Loader2Icon className="size-6 animate-spin" />
                </span>
              )}
              <span className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-lg opacity-0 transition-opacity group-hover/avatar:opacity-100">
                <HugeiconsIcon className="size-6" icon={Upload01Icon} />
              </span>
            </Avatar>
          </button>
          <div className="space-y-1">
            <p className="text-sm font-medium">Profile picture</p>
            <p className="text-muted-foreground text-xs">
              {isUploadingAvatar
                ? "Uploading..."
                : "Click to upload a new profile picture"}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Full Name</Label>
                <div className="flex gap-2">
                  <Input
                    autoComplete="name"
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Your name"
                    value={field.state.value}
                  />
                  <Button disabled={isUpdating} size="default" type="submit">
                    {isUpdating ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form.Field>
        </form>
      </div>
    </TitleCard>
  );
}
