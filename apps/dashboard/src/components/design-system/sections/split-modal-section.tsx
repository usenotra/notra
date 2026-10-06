"use client";

import {
  Cancel01Icon,
  CreditCardIcon,
  Key01Icon,
  Notification03Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  SplitModalContent,
  SplitModalPane,
} from "@notra/ui/components/shared/split-modal";
import { Card, CardContent } from "@notra/ui/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { Switch } from "@notra/ui/components/ui/switch";
import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";

import { Button } from "@/components/button";
import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";

const DEMO_SECTIONS = [
  {
    id: "notifications",
    label: "Notifications",
    icon: Notification03Icon,
    description: "Pick which events reach your inbox.",
  },
  {
    id: "members",
    label: "Members",
    icon: UserGroupIcon,
    description: "Invite teammates and manage their roles.",
  },
  {
    id: "api-keys",
    label: "API keys",
    icon: Key01Icon,
    description: "Create keys for the public API and MCP.",
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCardIcon,
    description: "Plan, invoices and payment method.",
  },
] as const;

type DemoSectionId = (typeof DEMO_SECTIONS)[number]["id"];

const DEMO_NOTIFICATIONS = [
  {
    id: "post-published",
    label: "Post published",
    description: "When a scheduled post goes live.",
    defaultChecked: true,
  },
  {
    id: "weekly-digest",
    label: "Weekly digest",
    description: "Monday summary of drafts and GEO visibility.",
    defaultChecked: true,
  },
  {
    id: "scan-finished",
    label: "Scan finished",
    description: "When a GEO scan completes for any project.",
    defaultChecked: false,
  },
] as const;

function DemoLabel({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </p>
  );
}

function DemoNav({
  activeSection,
  className,
  onSelect,
}: {
  activeSection: DemoSectionId;
  className?: string;
  onSelect: (id: DemoSectionId) => void;
}) {
  return (
    <nav
      aria-label="Settings sections"
      className={cn("flex shrink-0 flex-col gap-1 p-2 pt-3 md:w-56", className)}
    >
      <p className="text-muted-foreground px-2 pt-1 text-xs font-medium uppercase">
        Workspace
      </p>
      {DEMO_SECTIONS.map((item) => {
        const active = activeSection === item.id;
        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "duration-fast hover:bg-muted/80 focus-visible:outline-ring flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <HugeiconsIcon
              className="size-4 shrink-0"
              icon={item.icon}
              strokeWidth={active ? 2 : 1.5}
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function DemoSectionBody({ activeSection }: { activeSection: DemoSectionId }) {
  if (activeSection !== "notifications") {
    return (
      <p className="text-muted-foreground text-sm">
        Section content renders here. The pane scrolls on its own while the nav
        stays put.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {DEMO_NOTIFICATIONS.map((item) => (
        <li
          className="flex items-center justify-between gap-4 py-3 first:pt-0"
          key={item.id}
        >
          <label className="min-w-0 space-y-0.5" htmlFor={`demo-${item.id}`}>
            <span className="block text-sm font-medium">{item.label}</span>
            <span className="text-muted-foreground block text-xs">
              {item.description}
            </span>
          </label>
          <Switch defaultChecked={item.defaultChecked} id={`demo-${item.id}`} />
        </li>
      ))}
    </ul>
  );
}

/* Below md the nav pane is hidden, so sections become a scrolling chip row
   under the title, the same way the GEO write dialog does it. */
function DemoMobileNav({
  activeSection,
  onSelect,
}: {
  activeSection: DemoSectionId;
  onSelect: (id: DemoSectionId) => void;
}) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex gap-1 overflow-x-auto pt-2 md:hidden"
    >
      {DEMO_SECTIONS.map((item) => {
        const active = activeSection === item.id;
        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "duration-fast shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-sm transition-colors",
              active
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/60"
            )}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function sectionFor(id: DemoSectionId) {
  return DEMO_SECTIONS.find((item) => item.id === id) ?? DEMO_SECTIONS[0];
}

function ResponsiveSplitModalDemo() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<DemoSectionId>("notifications");
  const section = sectionFor(activeSection);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        Open responsive
      </Button>
      <ResponsiveDialog onOpenChange={setOpen} open={open}>
        <SplitModalContent
          className="h-[min(32rem,88svh)] max-h-[88svh] sm:max-w-3xl"
          responsive
        >
          <DemoNav
            activeSection={activeSection}
            className="hidden md:flex"
            onSelect={setActiveSection}
          />
          <SplitModalPane>
            <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3.5 md:px-5">
              <div className="min-w-0 space-y-1">
                <ResponsiveDialogTitle>{section.label}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {section.description}
                </ResponsiveDialogDescription>
                <DemoMobileNav
                  activeSection={activeSection}
                  onSelect={setActiveSection}
                />
              </div>
              <ResponsiveDialogClose
                render={
                  <Button
                    aria-label="Close"
                    className="shrink-0"
                    size="icon-sm"
                    variant="ghost"
                  />
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </ResponsiveDialogClose>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
              <DemoSectionBody activeSection={activeSection} />
            </div>
            <footer className="flex shrink-0 justify-end gap-2 border-t px-4 py-3 md:px-5">
              <ResponsiveDialogClose render={<Button variant="outline" />}>
                Cancel
              </ResponsiveDialogClose>
              <Button onClick={() => setOpen(false)}>Save changes</Button>
            </footer>
          </SplitModalPane>
        </SplitModalContent>
      </ResponsiveDialog>
    </>
  );
}

function FullscreenSplitModalDemo() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<DemoSectionId>("notifications");
  const section = sectionFor(activeSection);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        Open full-screen
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <SplitModalContent
          className={cn(
            "flex! max-w-none sm:max-w-none",
            "top-0 right-0 bottom-0 left-0 h-auto w-auto translate-none rounded-none",
            "md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:h-[min(36rem,calc(100svh-2rem))] md:w-[min(52rem,calc(100%-1.5rem))] md:-translate-x-1/2 md:-translate-y-1/2"
          )}
        >
          <DemoNav
            activeSection={activeSection}
            className="border-b md:border-b-0"
            onSelect={setActiveSection}
          />
          <SplitModalPane>
            <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3.5 md:px-5">
              <div className="min-w-0 space-y-1">
                <DialogTitle>{section.label}</DialogTitle>
                <DialogDescription>{section.description}</DialogDescription>
              </div>
              <DialogClose
                render={
                  <Button
                    aria-label="Close"
                    className="shrink-0"
                    size="icon-sm"
                    variant="ghost"
                  />
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </DialogClose>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
              <DemoSectionBody activeSection={activeSection} />
            </div>
          </SplitModalPane>
        </SplitModalContent>
      </Dialog>
    </>
  );
}

export function SplitModalSection() {
  return (
    <section className="scroll-mt-10 space-y-6" id="split-modal">
      <DesignSystemSectionHeader
        description="Shared dualtone shell from @notra/ui: a shell-coloured frame with a nav pane on the left and a lifted card pane on the right. Use it for multi-section surfaces like settings or the GEO writer. For a single form use ResponsiveDialog, for a yes/no step use ConfirmDialog. Below md both panes stack and the frame flattens."
        id="split-modal"
        title="Split Modal"
      />
      <Card>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <DemoLabel>Responsive (drawer on mobile)</DemoLabel>
              <ResponsiveSplitModalDemo />
            </div>
            <div className="space-y-3">
              <DemoLabel>Dialog (full-screen on mobile)</DemoLabel>
              <FullscreenSplitModalDemo />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
