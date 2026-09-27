import {
  IRIS_CAPABILITY_COMMON_LABEL_KEYS,
  IRIS_CAPABILITY_LABEL_KEYS,
  IRIS_RUN_STATUS_COMMON_LABEL_KEYS,
  IRIS_RUN_STATUS_LABEL_KEYS,
  IRIS_SIGNAL_KIND_COMMON_LABEL_KEYS,
  IRIS_SIGNAL_KIND_LABEL_KEYS,
  IRIS_SIGNAL_STATUS_COMMON_LABEL_KEYS,
  IRIS_SIGNAL_STATUS_LABEL_KEYS,
  IRIS_SLACK_TERMINAL_ERRORS,
  IRIS_TASK_STATUS_COMMON_LABEL_KEYS,
  IRIS_TASK_STATUS_LABEL_KEYS,
  IRIS_TRIGGER_COMMON_LABEL_KEYS,
  IRIS_TRIGGER_LABEL_KEYS,
} from "@/constants/iris";
import type {
  CommonLabelKey,
  CommonLabelsTranslator,
  CommonTranslator,
} from "@/types/i18n";
import type {
  IrisDecisionCopy,
  IrisOutboxNotice,
  IrisRunOutboxView,
  IrisRunView,
  IrisMessageKey,
  IrisTranslator,
} from "@/types/iris";

const SEPARATORS = /[.\-_]+/;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function titleCase(value: string): string {
  const words = value.split(SEPARATORS).filter((word) => word.length > 0);
  if (words.length === 0) {
    return value;
  }
  const [first = "", ...rest] = words;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

function humanizeIrisLabel(
  t: IrisTranslator,
  tLabels: CommonLabelsTranslator,
  value: string,
  labelKeys: Record<string, IrisMessageKey>,
  commonLabelKeys: Record<string, CommonLabelKey>
): string {
  const commonKey = commonLabelKeys[value];
  if (commonKey) {
    return tLabels(commonKey);
  }
  const key = labelKeys[value];
  return key ? t(key) : titleCase(value);
}

export function humanizeIrisCapability(
  t: IrisTranslator,
  tLabels: CommonLabelsTranslator,
  capabilityName: string
): string {
  return humanizeIrisLabel(
    t,
    tLabels,
    capabilityName,
    IRIS_CAPABILITY_LABEL_KEYS,
    IRIS_CAPABILITY_COMMON_LABEL_KEYS
  );
}

export function humanizeIrisContentType(contentType: string): string {
  return titleCase(contentType);
}

export function humanizeIrisSignalKind(
  t: IrisTranslator,
  tLabels: CommonLabelsTranslator,
  kind: string
): string {
  return humanizeIrisLabel(
    t,
    tLabels,
    kind,
    IRIS_SIGNAL_KIND_LABEL_KEYS,
    IRIS_SIGNAL_KIND_COMMON_LABEL_KEYS
  );
}

export function humanizeIrisTrigger(
  t: IrisTranslator,
  tLabels: CommonLabelsTranslator,
  trigger: string
): string {
  return humanizeIrisLabel(
    t,
    tLabels,
    trigger,
    IRIS_TRIGGER_LABEL_KEYS,
    IRIS_TRIGGER_COMMON_LABEL_KEYS
  );
}

export function humanizeIrisRunStatus(
  t: IrisTranslator,
  tLabels: CommonLabelsTranslator,
  status: string
): string {
  return humanizeIrisLabel(
    t,
    tLabels,
    status,
    IRIS_RUN_STATUS_LABEL_KEYS,
    IRIS_RUN_STATUS_COMMON_LABEL_KEYS
  );
}

export function humanizeIrisTaskStatus(
  t: IrisTranslator,
  tLabels: CommonLabelsTranslator,
  status: string
): string {
  return humanizeIrisLabel(
    t,
    tLabels,
    status,
    IRIS_TASK_STATUS_LABEL_KEYS,
    IRIS_TASK_STATUS_COMMON_LABEL_KEYS
  );
}

export function humanizeIrisSignalStatus(
  t: IrisTranslator,
  tLabels: CommonLabelsTranslator,
  status: string
): string {
  return humanizeIrisLabel(
    t,
    tLabels,
    status,
    IRIS_SIGNAL_STATUS_LABEL_KEYS,
    IRIS_SIGNAL_STATUS_COMMON_LABEL_KEYS
  );
}

export function formatIrisRelativeTime(
  t: IrisTranslator,
  tCommon: CommonTranslator,
  isoDate: string | null,
  now = Date.now()
): string {
  if (!isoDate) {
    return tCommon("labels.never");
  }

  const elapsed = now - new Date(isoDate).getTime();
  if (Number.isNaN(elapsed)) {
    return tCommon("labels.never");
  }
  if (elapsed < MINUTE_MS) {
    return tCommon("labels.justNow");
  }
  if (elapsed < HOUR_MS) {
    return t("relativeTime.minutesAgo", {
      count: Math.floor(elapsed / MINUTE_MS),
    });
  }
  if (elapsed < DAY_MS) {
    return t("relativeTime.hoursAgo", {
      count: Math.floor(elapsed / HOUR_MS),
    });
  }

  return t("relativeTime.daysAgo", { count: Math.floor(elapsed / DAY_MS) });
}

export function describeIrisDecision(
  t: IrisTranslator,
  run: IrisRunView
): IrisDecisionCopy {
  if (run.status === "planning") {
    return { headline: t("decision.thinking"), detail: run.reason };
  }

  if (run.decision === "no_op") {
    const reviewed = run.actions.length + run.tasks.length;
    return {
      headline:
        reviewed > 0
          ? t("decision.reviewedSignals", { count: reviewed })
          : t("decision.reviewedLatest"),
      detail: run.reason,
    };
  }

  if (run.decision === "escalate") {
    return { headline: t("decision.escalated"), detail: run.reason };
  }

  if (run.decision === "plan") {
    if (run.status === "failed") {
      return {
        headline: run.goal?.title
          ? t("decision.planNotFinishedWithTitle", { title: run.goal.title })
          : t("decision.planNotFinished"),
        detail: run.reason ?? run.goal?.summary ?? null,
      };
    }
    if (run.status === "canceled") {
      return {
        headline: run.goal?.title
          ? t("decision.runCanceledWithTitle", { title: run.goal.title })
          : t("decision.runCanceled"),
        detail: run.reason ?? null,
      };
    }
    return {
      headline: run.goal?.title ?? t("decision.planReady"),
      detail: run.reason ?? run.goal?.summary ?? null,
    };
  }

  if (run.status === "failed") {
    return { headline: t("decision.planningFailed"), detail: run.reason };
  }

  if (run.status === "canceled") {
    return { headline: t("decision.runCanceled"), detail: run.reason };
  }

  return { headline: t("decision.gettingToWork"), detail: run.reason };
}

export function describeIrisOutbox(
  t: IrisTranslator,
  messages: IrisRunOutboxView[]
): IrisOutboxNotice | null {
  const slackMessage = messages.find(
    (message) => message.destination === "slack"
  );
  if (!slackMessage) {
    return null;
  }

  if (slackMessage.status === "delivered") {
    return {
      tone: "info",
      message: t("outbox.delivered"),
      needsSlackFix: false,
    };
  }

  if (slackMessage.status === "failed") {
    const lastError = slackMessage.lastError ?? "";
    const needsSlackFix = IRIS_SLACK_TERMINAL_ERRORS.some((code) =>
      lastError.includes(code)
    );
    if (needsSlackFix) {
      return {
        tone: "warning",
        message: t("outbox.needsSlackFix"),
        needsSlackFix: true,
      };
    }
    return {
      tone: "danger",
      message: lastError
        ? t("outbox.failedWithError", { error: lastError })
        : t("outbox.failed"),
      needsSlackFix: false,
    };
  }

  if (slackMessage.status === "canceled") {
    return {
      tone: "info",
      message: t("outbox.canceled"),
      needsSlackFix: false,
    };
  }

  return {
    tone: "info",
    message: t("outbox.reporting"),
    needsSlackFix: false,
  };
}

export function isIrisRunOpen(run: IrisRunView | null): boolean {
  return run?.status === "planning" || run?.status === "executing";
}
