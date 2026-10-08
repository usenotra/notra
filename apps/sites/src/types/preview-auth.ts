import type { SiteServingState } from "@notra/sites-core/types/deployment";

import type { SiteRequestContext } from "./serving";

export interface PreviewRequestContext extends SiteRequestContext {
  state: SiteServingState;
  siteId: string;
  previewKey: string;
}

export interface PreviewPasswordForm {
  password: string;
  next: string;
}
