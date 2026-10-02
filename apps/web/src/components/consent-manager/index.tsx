import type { ConsentManagerProps } from "@/types/consent-manager";

import ConsentManagerProvider from "./provider";

export function ConsentManager({ children }: ConsentManagerProps) {
  return <ConsentManagerProvider>{children}</ConsentManagerProvider>;
}
