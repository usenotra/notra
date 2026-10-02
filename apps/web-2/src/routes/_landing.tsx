import { createFileRoute, Outlet } from "@tanstack/react-router";

import FooterSection from "@/components/footer-section";
import { MobileNavInert } from "@/components/mobile-nav-inert";
import { Navbar } from "@/components/navbar";

export const Route = createFileRoute("/_landing")({
  component: LandingLayout,
});

function LandingLayout() {
  return (
    <div className="bg-background relative flex min-h-svh w-full flex-col items-center justify-start">
      <div className="relative isolate flex w-full flex-col items-stretch justify-start">
        <Navbar />
        <MobileNavInert>
          <Outlet />
          <FooterSection />
        </MobileNavInert>
      </div>
    </div>
  );
}
