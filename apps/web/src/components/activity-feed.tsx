import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Slack } from "@notra/ui/components/ui/svgs/slack";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { domAnimation, LazyMotion, m, useInView } from "motion/react";
import { useRef } from "react";

const allItems = [
  {
    icon: <Github className="size-5" />,
    heading: "GitHub",
    label: "feat: move font variables to html in create-next-app",
    accentColor: "#8B5CF6",
  },
  {
    icon: <Linear className="size-5" />,
    heading: "Linear",
    label: "Move font variables to HTML element in...",
    accentColor: "#6366F1",
  },
  {
    icon: <Slack className="size-5" />,
    heading: "Slack",
    label: "Hey I just moved the font CSS variables...",
    accentColor: "#E11D48",
  },
  {
    icon: <Github className="size-5" />,
    heading: "GitHub",
    label: "fix: resolve hydration mismatch in app router",
    accentColor: "#8B5CF6",
  },
  {
    icon: <Linear className="size-5" />,
    heading: "Linear",
    label: "Add dark mode support to settings page",
    accentColor: "#6366F1",
  },
  {
    icon: <Slack className="size-5" />,
    heading: "Slack",
    label: "Just shipped the new onboarding flow!",
    accentColor: "#E11D48",
  },
  {
    icon: <Github className="size-5" />,
    heading: "GitHub",
    label: "refactor: extract shared utils to packages",
    accentColor: "#8B5CF6",
  },
  {
    icon: <Linear className="size-5" />,
    heading: "Linear",
    label: "Update API rate limiting for v2 endpoints",
    accentColor: "#6366F1",
  },
  {
    icon: <Slack className="size-5" />,
    heading: "Slack",
    label: "Can someone review the billing PR?",
    accentColor: "#E11D48",
  },
];

type FeedEntry = (typeof allItems)[number] & { id: number };

const initialItems: FeedEntry[] = allItems.slice(0, 3).map((item, index) => ({
  ...item,
  id: index,
}));

export function ActivityFeed() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex w-full flex-col gap-3" ref={ref}>
        {initialItems.map((item, i) => (
          <m.div
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
            className="w-full"
            initial={{ opacity: 0, y: -16 }}
            key={item.id}
            transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.06 }}
          >
            <TitleCard
              accentColor={item.accentColor}
              action={
                <span className="text-muted-foreground text-xs">
                  {i === 0 ? "just now" : `${(i + 1) * 2}m ago`}
                </span>
              }
              className="w-full text-sm"
              heading={item.heading}
              icon={item.icon}
            >
              <p className="text-muted-foreground truncate text-sm">
                {item.label}
              </p>
            </TitleCard>
          </m.div>
        ))}
      </div>
    </LazyMotion>
  );
}
