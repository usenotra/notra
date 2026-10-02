import { createFileRoute, Outlet } from "@tanstack/react-router";

import FooterSection from "@/components/footer-section";
import { MobileNavInert } from "@/components/mobile-nav-inert";
import { Navbar } from "@/components/navbar";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
  return (
    <div className="bg-background relative flex min-h-svh w-full flex-col items-stretch justify-start">
      <div className="relative isolate flex w-full flex-col items-stretch justify-start">
        <Navbar />
        <MobileNavInert>
          <main className="flex w-full flex-col items-center pb-8 md:pb-12">
            <Outlet />
          </main>
          <FooterSection />
        </MobileNavInert>
      </div>
    </div>
  );
}
