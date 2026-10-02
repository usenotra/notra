import { DevTools } from "@c15t/dev-tools/react";
import {
  ConsentBanner,
  ConsentDialog,
  type ConsentManagerOptions,
  ConsentManagerProvider,
} from "@c15t/react";

import { consentTheme } from "@/lib/consent-manager/theme";
import type { ConsentManagerProviderProps } from "@/types/consent-manager";

const baseOptions = {
  consentCategories: ["necessary", "measurement", "marketing"],
  theme: consentTheme,
} satisfies Partial<ConsentManagerOptions>;

const consentOptions: ConsentManagerOptions =
  process.env.NODE_ENV === "production"
    ? { ...baseOptions, mode: "hosted", backendURL: "/api/c15t" }
    : { ...baseOptions, mode: "offline" };

export default function ConsentManagerClient({
  children,
}: ConsentManagerProviderProps) {
  return (
    <ConsentManagerProvider options={consentOptions}>
      <ConsentBanner />
      <ConsentDialog />
      {process.env.NODE_ENV !== "production" && <DevTools />}
      {children}
    </ConsentManagerProvider>
  );
}
