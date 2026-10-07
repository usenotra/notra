import type { IconSvgElement } from "@hugeicons/react";
import type {
  PostScheduleView,
  ScheduleDestination,
  ScheduledPublicationView,
} from "@notra/ai/types/scheduled-publications";
import type { ScheduleSocialPlatform } from "@notra/ai/utils/schedule-destinations";
import type { ReactNode } from "react";

import type { CalendarEntryState } from "@/types/content/calendar";
import type { GitHubPublishRepositorySelectionFieldProps } from "@/types/content/detail";
import type { ConnectedAccount } from "@/types/hooks/connected-accounts";

/** What every schedule call of the dashboard answers with. */
export interface PostScheduleResponse {
  schedule: PostScheduleView | null;
}

export interface ScheduleContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationSlug: string;
  contentId: string;
  contentType: string;
  title: string;
  schedule: PostScheduleView | null;
  /** Edits not saved yet; a schedule always sends the saved version. */
  hasUnsavedChanges: boolean;
}

export interface ContentPublishButtonProps {
  organizationId: string;
  organizationSlug: string;
  contentId: string;
  contentType: string;
  title: string;
  /** The post has unsaved edits or is saving them. */
  hasUnsavedChanges: boolean;
  published: boolean;
  /** Publish (or move to draft); scheduling rides along in its menu. */
  publishButton: ReactNode;
}

export interface ScheduleDestinationStatusListProps {
  contentId: string;
  organizationId: string;
  schedule: PostScheduleView;
  /** Which network the social destination posts to, for its mark and name. */
  socialPlatform: ScheduleSocialPlatform | null;
}

export interface ScheduledPublicationStatusProps {
  status: ScheduledPublicationView["status"];
  className?: string;
}

export interface ScheduleDestinationMarkProps {
  destination: ScheduledPublicationView["destination"];
  socialPlatform: ScheduleSocialPlatform | null;
}

export interface ScheduleDestinationToggleRowProps extends ScheduleDestinationMarkProps {
  hint: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Settings shown under the row, like the repository picker. */
  children: ReactNode;
}

/** Everything the UI derives from the statuses of a post's schedule rows. */
export interface PostScheduleSummary {
  /** Overall state; null when the post has no schedule rows. */
  state: CalendarEntryState | null;
  /** A row is still scheduled or publishing. */
  active: boolean;
  /** Every row still waits for its slot, so the schedule moves as a whole. */
  editable: boolean;
  publishing: boolean;
  failed: boolean;
  /** A row already went out, is going out or failed. */
  hasOutcome: boolean;
  /** Rows still waiting for their slot. */
  scheduledIds: string[];
}

/** How urgently a schedule needs polling: close to its slot, or just pending. */
export type SchedulePollTier = "active" | "idle";

export type ScheduleDialogMode = "create" | "edit" | "locked" | "failed";

export interface ScheduleDialogModeConfig {
  titleKey: "title" | "editTitle" | "statusTitle";
  secondaryAction: "unschedule" | "dismiss" | null;
  canPublishNow: boolean;
  /** The form (when, where, submit) is shown. */
  editable: boolean;
}

export interface ScheduleFormState {
  date: Date | undefined;
  time: string;
  githubEnabled: boolean;
  repositoryId: string;
  merge: boolean;
  socialEnabled: boolean;
  /** The chosen or saved account; empty means the first connected one. */
  accountId: string;
}

export interface SchedulePostMutationInput {
  contentId: string;
  scheduledAt: Date;
  timeZone: string;
  destinations: ScheduleDestination[];
  /**
   * Scheduled rows this call replaces, as the user saw them when they
   * started; `[]` for a post without a schedule.
   */
  expectedScheduledIds: string[];
}

export interface ScheduleSocialOption {
  platform: ScheduleSocialPlatform;
  accounts: ConnectedAccount[];
  selectedAccount: ConnectedAccount | null;
  loaded: boolean;
  loadFailed: boolean;
  /** The saved account is no longer connected. */
  accountMissing: boolean;
  /** There is an account to post from, or a problem to switch it off for. */
  toggleable: boolean;
  checked: boolean;
}

export interface ScheduleDestinationOptions {
  github: GitHubPublishRepositorySelectionFieldProps | null;
  social: ScheduleSocialOption | null;
  destinations: ScheduleDestination[];
  /** A destination that is on cannot go out as configured yet. */
  blocked: boolean;
}

export interface ScheduleWhereSectionProps {
  destinations: ScheduleDestinationOptions;
  form: ScheduleFormState;
  isBusy: boolean;
  organizationSlug: string;
  onChange: (patch: Partial<ScheduleFormState>) => void;
}

export interface ScheduleSlotFieldProps {
  date: Date | undefined;
  /** Days before this one can't be picked. */
  earliestDate: Date;
  time: string;
  inPast: boolean;
  timeZone: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
}

export interface ScheduleGitHubDestinationProps {
  fieldProps: GitHubPublishRepositorySelectionFieldProps;
  enabled: boolean;
  merge: boolean;
  isBusy: boolean;
  organizationSlug: string;
  onEnabledChange: (enabled: boolean) => void;
  onMergeChange: (merge: boolean) => void;
  onRepositoryChange: (repositoryId: string) => void;
}

export interface ScheduleSocialDestinationProps {
  option: ScheduleSocialOption;
  organizationSlug: string;
  onEnabledChange: (enabled: boolean) => void;
  onAccountChange: (accountId: string) => void;
}

export interface ScheduleDialogFooterProps {
  mode: ScheduleDialogMode;
  isBusy: boolean;
  canSubmit: boolean;
  canPublishNow: boolean;
  isSubmitting: boolean;
  onSecondaryAction: () => void;
  onPublishNow: () => void;
}

export interface ScheduleGatedMenuItemProps {
  icon: IconSvgElement;
  label: string;
  /** Why the item is disabled, shown under the label while blocked. */
  hint: string;
  blocked: boolean;
  onClick: () => void;
}

export interface ScheduleStatusControlsProps {
  organizationId: string;
  contentId: string;
  schedule: PostScheduleView | null;
  hasUnsavedChanges: boolean;
  onOpen: () => void;
}
