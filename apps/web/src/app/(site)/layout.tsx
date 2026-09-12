import type { ReactNode } from "react";

import FooterSection from "@/components/footer-section";
import { MobileNavInert } from "@/components/mobile-nav-inert";
import { Navbar } from "@/components/navbar";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background relative flex min-h-svh w-full flex-col items-stretch justify-start">
      <div className="relative isolate flex w-full flex-col items-stretch justify-start">
        <Navbar />
        <MobileNavInert>
          <main className="flex w-full flex-col items-center pb-8 md:pb-12">
            {children}
          </main>
          <FooterSection />
        </MobileNavInert>
      </div>
    </div>
  );
}
