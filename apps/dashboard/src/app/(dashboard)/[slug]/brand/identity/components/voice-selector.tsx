import {
  Delete02Icon,
  Edit02Icon,
  MoreVerticalIcon,
  Refresh03Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";

import { AffectedTriggersWarning } from "@/components/affected-triggers-warning";
import { Button } from "@/components/button";
import { IDENTITY_NAME_MAX_LENGTH } from "@/constants/brand-identity";
import type { VoiceSelectorProps } from "@/types/brand-identity";
import { getBrandFaviconUrl } from "@/utils/brand";
import { getWebsiteDisplayText } from "@/utils/brand-identity";
import { truncateText } from "@/utils/format";

import { useUpdateBrandSettings } from "../../../../../../lib/hooks/use-brand-analysis";

export function VoiceSelector({
  voices,
  activeVoiceId,
  onSelect,
  organizationId,
  onReanalyze,
  isReanalyzing,
  onDelete,
  isDeleting,
  onSetDefault,
  isSettingDefault,
  affectedSchedules,
  affectedEvents,
  isLoadingAffected,
  isDeleteDialogOpen,
  onRequestDelete,
  onDeleteDialogChange,
}: VoiceSelectorProps) {
  const updateMutation = useUpdateBrandSettings(organizationId);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [identityName, setIdentityName] = useState("");

  const activeVoice = voices.find((v) => v.id === activeVoiceId);

  const handleIdentityRename = async () => {
    const trimmedName = identityName.trim();

    if (!trimmedName) {
      toast.error("Please enter an identity name");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: activeVoiceId,
        name: trimmedName,
      });
      toast.success("Identity name updated");
      setEditDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update identity"
      );
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {voices.map((voice) => {
          const isActive = voice.id === activeVoiceId;
          const hasTooltipInfo =
            voice.toneProfile || voice.language || voice.isDefault;

          return (
            <button
              className={`group flex min-w-40 shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border py-2.5 pr-2 pl-3 text-left transition-colors ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
              key={voice.id}
              onClick={() => onSelect(voice.id)}
              type="button"
            >
              <Avatar
                className="size-8 shrink-0 rounded-full after:rounded-full"
                size="sm"
              >
                <AvatarImage src={getBrandFaviconUrl(voice.websiteUrl)} />
                <AvatarFallback>
                  {voice.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                {hasTooltipInfo ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="block cursor-help truncate text-sm leading-5 font-medium">
                          {truncateText(voice.name, IDENTITY_NAME_MAX_LENGTH)}
                        </span>
                      }
                    />
                    <TooltipContent className="max-w-64 space-y-1">
                      {voice.toneProfile && (
                        <p>Tone Profile: {voice.toneProfile}</p>
                      )}
                      {voice.language && <p>Language: {voice.language}</p>}
                      {voice.isDefault && (
                        <p>
                          Default brand identity used when no specific identity
                          is selected.
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="block truncate text-sm leading-5 font-medium">
                    {truncateText(voice.name, IDENTITY_NAME_MAX_LENGTH)}
                  </span>
                )}
                {voice.websiteUrl ? (
                  <p className="text-muted-foreground truncate text-xs leading-4">
                    {getWebsiteDisplayText(voice.websiteUrl)}
                  </p>
                ) : null}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`hover:bg-accent flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md ${
                    isActive
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                  disabled={isDeleting || isSettingDefault || isReanalyzing}
                  nativeButton={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isActive) {
                      onSelect(voice.id);
                    }
                  }}
                  render={<span />}
                >
                  <HugeiconsIcon
                    className="text-muted-foreground size-3.5"
                    icon={MoreVerticalIcon}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(voice.id);
                      setIdentityName(voice.name);
                      setEditDialogOpen(true);
                    }}
                  >
                    <HugeiconsIcon className="size-4" icon={Edit02Icon} />
                    Edit identity name
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!voice.websiteUrl?.trim() || isReanalyzing}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(voice.id);
                      if (voice.websiteUrl) {
                        onReanalyze(voice.websiteUrl);
                      }
                    }}
                  >
                    <HugeiconsIcon className="size-4" icon={Refresh03Icon} />
                    Re-analyze
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={voice.isDefault}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(voice.id);
                      onSetDefault();
                    }}
                  >
                    <HugeiconsIcon className="size-4" icon={StarIcon} />
                    {voice.isDefault
                      ? "Already default identity"
                      : "Set as default identity"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={voice.isDefault}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDelete(voice.id);
                    }}
                    variant="destructive"
                  >
                    <HugeiconsIcon className="size-4" icon={Delete02Icon} />
                    Delete identity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </button>
          );
        })}
      </div>

      <ResponsiveDialog
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setIdentityName(activeVoice?.name ?? "");
          }
        }}
        open={isEditDialogOpen}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit identity name</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Update the name used to identify this brand profile.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleIdentityRename();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="identity-name">Identity name</Label>
              <Input
                autoFocus
                id="identity-name"
                onChange={(event) => setIdentityName(event.target.value)}
                placeholder="e.g. Default, Marketing, Technical"
                value={identityName}
              />
            </div>
            <ResponsiveDialogFooter>
              <ResponsiveDialogClose
                disabled={updateMutation.isPending}
                render={
                  <Button
                    className="w-full justify-center sm:w-auto"
                    variant="outline"
                  />
                }
              >
                Cancel
              </ResponsiveDialogClose>
              <Button
                className="w-full justify-center sm:w-auto"
                disabled={!identityName.trim() || updateMutation.isPending}
                type="submit"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog
        onOpenChange={onDeleteDialogChange}
        open={isDeleteDialogOpen}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete identity?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              This removes this brand identity and its saved profile settings.
              This action cannot be undone.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <AffectedTriggersWarning
            events={affectedEvents}
            isLoading={isLoadingAffected}
            resourceLabel="identity"
            schedules={affectedSchedules}
          />

          <ResponsiveDialogFooter>
            <ResponsiveDialogClose
              disabled={isDeleting}
              render={
                <Button
                  className="w-full justify-center sm:w-auto"
                  variant="outline"
                />
              }
            >
              Cancel
            </ResponsiveDialogClose>
            <Button
              className="w-full justify-center sm:w-auto"
              disabled={isDeleting}
              onClick={() => {
                onDelete();
                onDeleteDialogChange(false);
              }}
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete identity"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
