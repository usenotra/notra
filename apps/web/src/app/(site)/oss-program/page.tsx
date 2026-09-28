import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";

import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import {
  OSS_PROGRAM_BENEFITS,
  OSS_PROGRAM_OSI_LICENSES_URL,
} from "@/lib/oss-program/constants";
import {
  PAGE_SOCIAL_IMAGES,
  TWITTER_HANDLE,
  pageAlternates,
} from "@/utils/metadata";
import { SITE_URL } from "@/utils/urls";

const title = "Notra for Open Source";
const description =
  "Notra is free for open source builders. Get the Growth plan at no cost in exchange for feedback, and turn your shipped work into changelogs, launch posts, and marketing assets.";
const url = `${SITE_URL}/oss-program`;

export const metadata: Metadata = {
  title,
  description,
  alternates: pageAlternates(url),
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Notra",
    images: [PAGE_SOCIAL_IMAGES.ossProgram],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [PAGE_SOCIAL_IMAGES.ossProgram.url],
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
  },
};

const ELIGIBILITY = [
  {
    id: "public",
    content: "Your project is publicly available on GitHub.",
  },
  {
    id: "license",
    content: (
      <>
        It's licensed under an{" "}
        <a
          className="text-primary hover:text-primary-hover font-medium underline underline-offset-2"
          href={OSS_PROGRAM_OSI_LICENSES_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          OSI-approved open source license
        </a>
        .
      </>
    ),
  },
  {
    id: "useful",
    content:
      "You're building something genuinely useful that benefits from content and marketing.",
  },
  {
    id: "maintainer",
    content: "You're an owner or maintainer of the repository.",
  },
  {
    id: "active",
    content: "The project shows active development and community engagement.",
  },
] as const;

export default function OssProgramPage() {
  return (
    <div className="border-border/70 flex w-full flex-col items-center justify-start overflow-hidden border-b">
      <MarketingHeroWash
        className="mb-4"
        subtitle="Notra is free for open source builders. Get the Growth plan at no cost in exchange for honest feedback, and let your shipped work do the marketing."
        title={
          <>
            Notra for <span className="text-primary">Open Source</span>
          </>
        }
      />

      <section className="border-border/70 w-full border-t px-6 py-12 md:px-24 md:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-foreground text-2xl font-medium tracking-[-0.02em] md:text-3xl">
              What you get
            </h2>
            <p className="text-muted-foreground max-w-2xl font-sans text-sm leading-6 font-normal">
              Accepted projects use Notra free. The only ask is that you tell us
              what works and what doesn't.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-[#1E1E1E14] bg-[#1E1E1E14] sm:grid-cols-2 dark:border-white/10 dark:bg-white/10">
            {OSS_PROGRAM_BENEFITS.map((benefit) => (
              <div
                className="flex flex-col gap-1.5 bg-[#FAF8FD] p-6 dark:bg-[#17131f]"
                key={benefit.label}
              >
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon
                    className="text-primary size-4"
                    icon={Tick02Icon}
                    strokeWidth={2.5}
                  />
                  <h3 className="text-foreground font-sans text-base font-medium">
                    {benefit.label}
                  </h3>
                </div>
                <p className="text-muted-foreground font-sans text-sm leading-6 font-normal">
                  {benefit.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-border/70 w-full border-t px-6 py-12 md:px-24 md:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <h2 className="text-foreground font-sans text-2xl font-semibold tracking-tight md:text-3xl">
            Who's eligible
          </h2>
          <ul className="flex flex-col gap-3">
            {ELIGIBILITY.map((item) => (
              <li className="flex items-start gap-3" key={item.id}>
                <HugeiconsIcon
                  className="text-primary mt-1 size-4 shrink-0"
                  icon={Tick02Icon}
                  strokeWidth={2.5}
                />
                <span className="text-foreground font-sans text-sm leading-6 font-normal">
                  {item.content}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-border/70 w-full border-t px-6 py-12 md:px-24 md:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-foreground text-2xl font-medium tracking-[-0.02em] md:text-3xl">
              Applications are closed
            </h2>
            <p className="text-muted-foreground font-sans text-sm leading-6 font-normal">
              We're not accepting new applications at this time. Check back
              soon, we'll reopen the program once we have room for more
              projects.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
