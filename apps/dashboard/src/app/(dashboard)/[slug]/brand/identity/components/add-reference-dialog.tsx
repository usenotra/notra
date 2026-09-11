"use client";

import {
  Add01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  Link04Icon,
  NewTwitterIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FEATURES } from "@notra/ai/billing/features";
import {
  ResponsiveDialog,
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
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { XVerifiedBadge } from "@notra/ui/components/ui/svgs/twitter";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import {
  useConnectedAccounts,
  useDisconnectAccount,
  useHandleConnectSocialAccount,
} from "@/lib/hooks/use-connected-accounts";
import type {
  AddReferenceDialogProps,
  ApplicablePlatform,
} from "@/types/hooks/brand-references";
import type { ConnectedAccount } from "@/types/hooks/connected-accounts";

import {
  useCreateReference,
  useFetchTweet,
  useImportTweets,
} from "../../../../../../lib/hooks/use-brand-references";

type Step = "source" | "tweet-url" | "import-x" | "custom";

function pluralSuffix(count: number) {
  return count === 1 ? "" : "s";
}

function useReferenceBalance() {
  const { check, data: customer } = useBillingCustomer();
  return (() => {
    if (!customer) {
      return {
        remaining: null,
        usage: null,
        included: null,
        overageAllowed: false,
        unlimited: false,
      };
    }
    const data = check({ featureId: FEATURES.REFERENCES });
    if (!data) {
      return {
        remaining: null,
        usage: null,
        included: null,
        overageAllowed: false,
        unlimited: false,
      };
    }
    if (data.balance?.unlimited) {
      return {
        remaining: null,
        usage: null,
        included: null,
        overageAllowed: false,
        unlimited: true,
      };
    }
    const usage =
      typeof data.balance?.usage === "number" ? data.balance.usage : 0;
    const included =
      typeof data.balance?.granted === "number" ? data.balance.granted : 0;
    const overages = Math.max(0, usage - included);
    return {
      remaining:
        typeof data.balance?.remaining === "number"
          ? data.balance.remaining
          : null,
      usage,
      included,
      overages,
      overageAllowed: data.balance?.overageAllowed === true,
      unlimited: false,
    };
  })();
}

function ReferenceUsageInfo({ afterCount }: { afterCount: number }) {
  const { remaining, included, overages, overageAllowed, unlimited } =
    useReferenceBalance();

  if (unlimited || remaining === null) {
    return null;
  }

  if (remaining === 0) {
    return (
      <p className="text-destructive text-xs">
        No references remaining. Upgrade your plan to add more.
      </p>
    );
  }

  const afterRemaining = Math.max(0, remaining - afterCount);

  return (
    <p className="text-muted-foreground text-xs">
      You have {remaining} remaining · after this you will have {afterRemaining}{" "}
      left
      {overageAllowed && included !== null && (
        <span className="text-muted-foreground/70">
          {" "}
          · {included} included
          {typeof overages === "number" && overages > 0 && (
            <>
              , {overages} overage{overages === 1 ? "" : "s"}
            </>
          )}
        </span>
      )}
    </p>
  );
}

export function AddReferenceDialog({
  open,
  onOpenChange,
  organizationId,
  voiceId,
  initialStep,
}: AddReferenceDialogProps) {
  const [step, setStep] = useState<Step>(initialStep ?? "source");
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialStep, setPrevInitialStep] = useState(initialStep);

  if (open !== prevOpen || initialStep !== prevInitialStep) {
    setPrevOpen(open);
    setPrevInitialStep(initialStep);
    if (open && initialStep) {
      setStep(initialStep);
    }
  }

  const handleClose = () => {
    setStep("source");
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog onOpenChange={handleClose} open={open}>
      <ResponsiveDialogContent className="max-h-[85svh] overflow-y-auto [&>*]:min-w-0">
        {step === "source" && <SourceStep onSelect={setStep} />}
        {step === "tweet-url" && (
          <TweetUrlStep
            onBack={() => setStep("source")}
            onClose={handleClose}
            organizationId={organizationId}
            voiceId={voiceId}
          />
        )}
        {step === "import-x" && (
          <ImportXStep
            onBack={() => setStep("source")}
            onClose={handleClose}
            organizationId={organizationId}
            voiceId={voiceId}
          />
        )}
        {step === "custom" && (
          <CustomTextStep
            onBack={() => setStep("source")}
            onClose={handleClose}
            organizationId={organizationId}
            voiceId={voiceId}
          />
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function SourceStep({ onSelect }: { onSelect: (step: Step) => void }) {
  const sources = [
    {
      step: "tweet-url" as Step,
      icon: Link04Icon,
      title: "Tweet URL",
      description: "Paste a link to a specific tweet",
    },
    {
      step: "import-x" as Step,
      icon: NewTwitterIcon,
      title: "Import from X",
      description: "Bulk import recent posts from an account",
    },
    {
      step: "custom" as Step,
      icon: TextIcon,
      title: "Custom text",
      description: "Write or paste your own text",
    },
  ];

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Add Reference</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Choose a source to add writing style references.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <div className="grid gap-3 py-4">
        {sources.map((source) => (
          <button
            className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-colors"
            key={source.step}
            onClick={() => onSelect(source.step)}
            type="button"
          >
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
              <HugeiconsIcon className="size-5" icon={source.icon} />
            </div>
            <div>
              <p className="text-sm font-medium">{source.title}</p>
              <p className="text-muted-foreground text-xs">
                {source.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function TweetUrlStep({
  organizationId,
  voiceId,
  onBack,
  onClose,
}: {
  organizationId: string;
  voiceId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const fetchTweet = useFetchTweet(organizationId, voiceId);
  const createReference = useCreateReference(organizationId, voiceId);
  const isPending = fetchTweet.isPending || createReference.isPending;
  const { remaining } = useReferenceBalance();

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    try {
      const tweet = await fetchTweet.mutateAsync(trimmed);
      await createReference.mutateAsync({
        type: "twitter_post",
        content: tweet.content,
        sourceUrl: tweet.url,
        metadata: {
          tweetId: tweet.tweetId,
          authorHandle: tweet.authorHandle,
          authorName: tweet.authorName,
          url: tweet.url,
          likes: tweet.likes,
          retweets: tweet.retweets,
          replies: tweet.replies,
          profileImageUrl: tweet.profileImageUrl,
          createdAt: tweet.createdAt,
        },
        note: null,
        applicableTo: ["twitter"],
      });
      toast.success("Reference added");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add tweet"
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isPending) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Add Tweet</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Paste a tweet URL to add it as a writing style reference.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <div className="space-y-2 py-4">
        <Input
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://x.com/user/status/..."
          value={url}
        />
        <ReferenceUsageInfo afterCount={1} />
      </div>

      <ResponsiveDialogFooter>
        <Button onClick={onBack} variant="outline">
          <HugeiconsIcon className="size-4" icon={ArrowLeft01Icon} />
          Back
        </Button>
        <Button
          disabled={isPending || !url.trim() || remaining === 0}
          onClick={handleSubmit}
        >
          {isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Reference"
          )}
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

function ImportXStep({
  organizationId,
  voiceId,
  onBack,
  onClose,
}: {
  organizationId: string;
  voiceId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const { data, isLoading } = useConnectedAccounts(organizationId);
  const { handleConnect, isPending: isConnecting } =
    useHandleConnectSocialAccount(organizationId, "twitter");
  const disconnectAccount = useDisconnectAccount(organizationId);
  const importTweets = useImportTweets(organizationId, voiceId);
  const [selectedAccount, setSelectedAccount] =
    useState<ConnectedAccount | null>(null);
  const [maxResults, setMaxResults] = useState(20);
  const { remaining } = useReferenceBalance();

  const maxResultsCap = remaining !== null ? Math.min(20, remaining) : 20;
  const clampedMaxResults = Math.max(1, Math.min(maxResults, maxResultsCap));
  const effectiveMax =
    remaining !== null
      ? Math.min(clampedMaxResults, remaining)
      : clampedMaxResults;

  const twitterAccounts =
    data?.accounts.filter((a) => a.provider === "twitter") ?? [];

  const handleDisconnect = async (account: ConnectedAccount) => {
    try {
      await disconnectAccount.mutateAsync(account.id);
      toast.success(`Disconnected @${account.username}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect account"
      );
    }
  };

  const handleImport = async (account: ConnectedAccount) => {
    setSelectedAccount(account);
    try {
      const result = await importTweets.mutateAsync({
        accountId: account.id,
        maxResults: effectiveMax,
      });
      if (result.count > 0) {
        toast.success(
          `Imported ${result.count} post${pluralSuffix(result.count)} from @${account.username}`
        );
        onClose();
      } else {
        toast.info(
          "No new posts to import — all recent posts are already added."
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import tweets"
      );
    }
  };

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Import from X</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Select a connected account to import recent posts, or connect a new
          one.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <div className="space-y-3 py-4">
        {!isLoading && twitterAccounts.length > 0 && (
          <div className="space-y-2">
            <div className="bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <Label
                  className="text-xs whitespace-nowrap"
                  htmlFor="max-results"
                >
                  Amount of posts to import:
                </Label>
                <Tooltip>
                  <TooltipTrigger className="text-muted-foreground cursor-help">
                    <HugeiconsIcon
                      className="size-3.5"
                      icon={InformationCircleIcon}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum 20 posts per import</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                className="h-7 w-16 text-center text-xs"
                id="max-results"
                max={remaining !== null ? Math.min(20, remaining) : 20}
                min={1}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) {
                    const cap =
                      remaining !== null ? Math.min(20, remaining) : 20;
                    setMaxResults(Math.min(cap, Math.max(1, val)));
                  }
                }}
                type="number"
                value={clampedMaxResults}
              />
            </div>
            <ReferenceUsageInfo afterCount={clampedMaxResults} />
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
          </div>
        )}

        {!isLoading && twitterAccounts.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <HugeiconsIcon className="size-6" icon={NewTwitterIcon} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No X accounts connected</p>
              <p className="text-muted-foreground text-xs">
                Connect an X account to import recent posts.
              </p>
            </div>
          </div>
        )}

        {!isLoading &&
          twitterAccounts.map((account) => {
            const isImporting =
              importTweets.isPending && selectedAccount?.id === account.id;
            const didImport =
              importTweets.isSuccess && selectedAccount?.id === account.id;

            return (
              <div
                className="flex items-center gap-3 rounded-lg border p-3"
                key={account.id}
              >
                <Avatar
                  className="size-9 rounded-full after:rounded-full"
                  size="sm"
                >
                  {account.profileImageUrl && (
                    <AvatarImage src={account.profileImageUrl} />
                  )}
                  <AvatarFallback>
                    {account.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium">
                    {account.displayName}
                    {account.verified && (
                      <XVerifiedBadge className="size-4 shrink-0" />
                    )}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    @{account.username}
                  </p>
                </div>
                <Button
                  className="cursor-pointer"
                  disabled={importTweets.isPending || remaining === 0}
                  onClick={() => handleImport(account)}
                  size="sm"
                  variant={didImport ? "outline" : "default"}
                >
                  {isImporting && (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      Importing...
                    </>
                  )}
                  {!isImporting && didImport && "Imported"}
                  {!isImporting && !didImport && "Import"}
                </Button>
                <button
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
                  disabled={disconnectAccount.isPending}
                  onClick={() => handleDisconnect(account)}
                  type="button"
                >
                  <HugeiconsIcon className="size-3.5" icon={Cancel01Icon} />
                </button>
              </div>
            );
          })}

        {!isLoading && (
          <button
            className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-left transition-colors"
            disabled={isConnecting}
            onClick={handleConnect}
            type="button"
          >
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
              {isConnecting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <HugeiconsIcon className="size-4" icon={Add01Icon} />
              )}
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {twitterAccounts.length === 0
                ? "Connect an X account"
                : "Connect another X account"}
            </p>
          </button>
        )}
      </div>

      <ResponsiveDialogFooter>
        <Button onClick={onBack} variant="outline">
          <HugeiconsIcon className="size-4" icon={ArrowLeft01Icon} />
          Back
        </Button>
        {importTweets.isSuccess && <Button onClick={onClose}>Done</Button>}
      </ResponsiveDialogFooter>
    </>
  );
}

const PLATFORM_OPTIONS = [
  { value: "all", label: "All platforms" },
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "blog", label: "Blog & Changelog" },
] as const;

function CustomTextStep({
  organizationId,
  voiceId,
  onBack,
  onClose,
}: {
  organizationId: string;
  voiceId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [applicableTo, setApplicableTo] = useState<ApplicablePlatform[]>([
    "all",
  ]);

  const createReference = useCreateReference(organizationId, voiceId);

  const togglePlatform = (value: ApplicablePlatform) => {
    if (value === "all") {
      setApplicableTo(["all"]);
      return;
    }
    const withoutAll = applicableTo.filter(
      (v): v is Exclude<ApplicablePlatform, "all"> => v !== "all"
    );
    const updated = withoutAll.includes(value)
      ? withoutAll.filter((v) => v !== value)
      : [...withoutAll, value];
    setApplicableTo(updated.length === 0 ? ["all"] : updated);
  };

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Please enter some text");
      return;
    }

    const trimmedNote = note.trim() || null;

    try {
      await createReference.mutateAsync({
        type: "custom",
        content: trimmed,
        sourceUrl: sourceUrl.trim() || null,
        metadata: null,
        note: trimmedNote,
        applicableTo,
      });
      toast.success("Reference added");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save reference"
      );
    }
  };

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Add Custom Reference</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Paste or write text that represents your writing style.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="custom-content">Content</Label>
          <Textarea
            className="max-h-[15rem] overflow-y-auto"
            id="custom-content"
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or write text that represents your writing style..."
            rows={5}
            value={content}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-source-url">Source URL (optional)</Label>
          <Input
            id="custom-source-url"
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://example.com/blog/post"
            type="url"
            value={sourceUrl}
          />
        </div>

        <div className="space-y-2">
          <Label>Use for</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((option) => (
              <button
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                  applicableTo.includes(option.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
                key={option.value}
                onClick={() => togglePlatform(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-note">Note (optional)</Label>
          <Textarea
            className="max-h-[7.5rem] overflow-y-auto"
            id="custom-note"
            onChange={(e) => setNote(e.target.value)}
            placeholder="When should the AI use this as reference?"
            rows={2}
            value={note}
          />
        </div>
      </div>

      <ResponsiveDialogFooter>
        <Button onClick={onBack} variant="outline">
          <HugeiconsIcon className="size-4" icon={ArrowLeft01Icon} />
          Back
        </Button>
        <Button
          disabled={createReference.isPending || !content.trim()}
          onClick={handleSave}
        >
          {createReference.isPending ? "Saving..." : "Save Reference"}
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}
