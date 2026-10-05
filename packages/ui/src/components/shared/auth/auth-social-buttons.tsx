"use client";

import { Spinner } from "@notra/ui/components/ui/spinner";
import { DEFAULT_AUTH_LAST_USED_LABEL } from "@notra/ui/constants/auth-labels";

import type {
  AuthSocialButtonsProps,
  SocialProvider,
} from "../../../types/auth";
import { Badge } from "../../ui/badge";
import { Github } from "../../ui/svgs/github";
import { Google } from "../../ui/svgs/google";
import { CtaButton } from "../cta-button";

const PROVIDERS: {
  provider: SocialProvider;
  label: string;
  Icon: typeof Google;
}[] = [
  { provider: "google", label: "Google", Icon: Google },
  { provider: "github", label: "GitHub", Icon: Github },
];

export function AuthSocialButtons({
  authMethod,
  disabled,
  lastMethod,
  lastUsedLabel = DEFAULT_AUTH_LAST_USED_LABEL,
  onSelect,
}: AuthSocialButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PROVIDERS.map(({ provider, label, Icon }) => (
        <div className="relative" key={provider}>
          {lastMethod === provider && (
            <Badge className="-top-4 -right-2 absolute z-10" variant="default">
              {lastUsedLabel}
            </Badge>
          )}
          <CtaButton
            className="w-full"
            disabled={disabled}
            onClick={() => onSelect(provider)}
            type="button"
            variant="light"
          >
            {authMethod === provider ? (
              <Spinner />
            ) : (
              <Icon
                className={
                  provider === "github"
                    ? "size-4 dark:[&_path]:fill-[#1e1e1e]"
                    : "size-4"
                }
              />
            )}
            {label}
          </CtaButton>
        </div>
      ))}
    </div>
  );
}
