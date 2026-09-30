import type { ErrorContentCopy } from "@/types/components/error";

export const DEFAULT_ERROR_CONTENT_COPY: ErrorContentCopy = {
  eyebrow: "Error",
  title: "Something went wrong",
  description:
    "We hit an unexpected problem loading this page. You can try again or head back home.",
  reference: (digest) => `Reference ${digest}`,
  tryAgain: "Try again",
  goHome: "Go home",
};
