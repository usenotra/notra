import type { ReactNode } from "react";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthLegalNotice } from "@/components/auth/auth-legal-notice";
import { AuthThemeHotkey } from "@/components/auth/auth-theme-hotkey";
import { AuthWordmark } from "@/components/auth/auth-wordmark";

/** Two-column chrome shared by the sign-in, sign-up and invitation pages. */
export function AuthSplitShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
      <AuthThemeHotkey />
      <section className="flex h-full min-h-0 w-full flex-col items-center justify-between px-6 py-5 lg:px-10 lg:py-6">
        <AuthWordmark href="https://usenotra.com" />
        <div className="w-full max-w-md">{children}</div>
        <div>
          <AuthLegalNotice />
        </div>
      </section>
      <div className="relative hidden lg:flex">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="corner-squircle relative h-full w-full overflow-hidden rounded-md supports-[corner-shape:squircle]:rounded-2xl">
            <AuthBrandPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
