"use client";

import { SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { FEEDBACK_MAX_MESSAGE_LENGTH } from "@/constants/feedback";
import { dashboardOrpcClient } from "@/lib/orpc/client";
import type {
  FeedbackFormProps,
  FeedbackSentiment,
} from "@/types/dashboard/feedback";
import { FEEDBACK_SENTIMENT_OPTIONS } from "@/utils/feedback";
import { getFeedbackPageUrl } from "@/utils/feedback-page-url";

export function FeedbackForm({
  onSubmitted,
  autoFocus = true,
}: FeedbackFormProps) {
  const t = useTranslations("dashboard.feedback");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { activeOrganization } = useOrganizationsContext();

  const [message, setMessage] = useState("");
  const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    const sentimentValue = sentiment ?? undefined;
    const organizationId = activeOrganization?.id;
    try {
      await dashboardOrpcClient.feedback.submit({
        message: trimmed,
        sentiment: sentimentValue,
        organizationId,
        pageUrl: getFeedbackPageUrl(pathname),
      });

      toast.success(t("thanks"));
      setMessage("");
      setSentiment(null);
      if (onSubmitted) {
        onSubmitted();
      }
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : t("sendFailed");
      setIsSubmitting(false);
      toast.error(errMessage);
      return;
    }
    setIsSubmitting(false);
  }

  async function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      await handleSubmit();
    }
  }

  return (
    <>
      <div className="p-2.5 pb-0">
        <Textarea
          aria-label={t("label")}
          autoFocus={autoFocus}
          className="min-h-28 resize-none"
          disabled={isSubmitting}
          maxLength={FEEDBACK_MAX_MESSAGE_LENGTH}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          value={message}
        />
      </div>

      <div className="flex items-center justify-between gap-2 p-2.5">
        <div className="flex items-center gap-0.5">
          {FEEDBACK_SENTIMENT_OPTIONS.map((option) => {
            const isActive = sentiment === option.value;
            return (
              <button
                aria-label={t(`sentiments.${option.value}`)}
                aria-pressed={isActive}
                className={cn(
                  "hover:bg-muted focus-visible:ring-ring/50 flex size-7 cursor-pointer items-center justify-center rounded-md text-base leading-none transition-colors outline-none focus-visible:ring-[3px]",
                  isActive
                    ? "bg-muted opacity-100"
                    : "opacity-60 hover:opacity-100"
                )}
                disabled={isSubmitting}
                key={option.value}
                onClick={() =>
                  setSentiment((current) =>
                    current === option.value ? null : option.value
                  )
                }
                type="button"
              >
                <span aria-hidden="true">{option.emoji}</span>
              </button>
            );
          })}
        </div>

        <Button
          disabled={!canSubmit}
          onClick={handleSubmit}
          size="sm"
          type="button"
        >
          {isSubmitting ? (
            tCommon("labels.sending")
          ) : (
            <>
              {tCommon("labels.send")}
              <HugeiconsIcon
                className="-translate-y-px"
                icon={SentIcon}
                size={14}
              />
            </>
          )}
        </Button>
      </div>
    </>
  );
}
