"use client";

import { Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Spinner } from "@notra/ui/components/ui/spinner";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { z } from "zod";

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
  const t = useTranslations("settings.profile");
  const tCommon2 = useTranslations("common");
  const tSettingsShared = useTranslations("settings.shared");
  const tCommon = useTranslations("common.actions");
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
          errorMessageOr(result.error.message, t("pictureUpdateFailed"))
        );
        setIsUploadingAvatar(false);
        return;
      }

      toast.success(t("pictureUpdated"));
      if (onSessionRefetch) {
        await onSessionRefetch();
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(
        error instanceof Error ? error.message : t("pictureUploadFailed")
      );
    }
    setIsUploadingAvatar(false);
  }

  const form = useForm({
    defaultValues: {
      name: user.name,
    },
    onSubmit: async ({ value }) => {
      const validated = z
        .string()
        .trim()
        .min(1, t("nameEmpty"))
        .safeParse(value.name);

      if (!validated.success) {
        const issue = validated.error?.issues[0];
        toast.error(issue?.message ?? t("nameEmpty"));
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
          toast.error(errorMessageOr(result.error.message, t("updateFailed")));
          setIsUpdating(false);
          return;
        }

        toast.success(t("updated"));
        if (onSessionRefetch) {
          await onSessionRefetch();
        }
      } catch {
        toast.error(t("updateFailed"));
      }
      setIsUpdating(false);
    },
  });

  return (
    <TitleCard heading={t("heading")}>
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
            aria-label={t("uploadPictureAria")}
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
                {(user.name || user.email).charAt(0).toUpperCase()}
              </AvatarFallback>
              {isUploadingAvatar && (
                <span className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-lg">
                  <Spinner className="size-6" />
                </span>
              )}
              <span className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-lg opacity-0 transition-opacity group-hover/avatar:opacity-100">
                <HugeiconsIcon className="size-6" icon={Upload01Icon} />
              </span>
            </Avatar>
          </button>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">{t("picture")}</p>
            <p className="text-muted-foreground text-xs">
              {isUploadingAvatar
                ? tSettingsShared("uploading")
                : t("uploadHint")}
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
                <Label htmlFor={field.name}>{t("fullName")}</Label>
                <div className="flex min-w-0 gap-2">
                  <Input
                    autoComplete="name"
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={tCommon2("labels.yourName")}
                    value={field.state.value}
                  />
                  <Button
                    className="shrink-0"
                    loading={isUpdating}
                    size="default"
                    type="submit"
                  >
                    {tCommon("save")}
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
