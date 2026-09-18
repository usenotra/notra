import {
  Marquee,
  MarqueeContent,
  MarqueeItem,
} from "@notra/ui/components/kibo-ui/marquee";

import {
  MARQUEE_CAPTION,
  MARQUEE_EDGE_MASK,
  MARQUEE_LOGOS,
} from "@/constants/landing/marquee-quote";

export function LogoMarquee() {
  return (
    <section className="flex flex-col items-center gap-12 px-6 pt-16 pb-12 antialiased sm:px-12 lg:gap-12 lg:px-20 lg:pt-20 lg:pb-13">
      <p className="font-display text-center text-base/6 font-medium tracking-[-0.01em] text-[#1E1E1E80] dark:text-white/50">
        {MARQUEE_CAPTION}
      </p>
      <Marquee
        className="text-[#6B7280] dark:text-[#9CA3AF]"
        style={{
          maskImage: MARQUEE_EDGE_MASK,
          WebkitMaskImage: MARQUEE_EDGE_MASK,
        }}
      >
        <MarqueeContent pauseOnHover={false} speed={40}>
          {MARQUEE_LOGOS.map(({ name, label, Logo, href }) => (
            <MarqueeItem className="mx-8 sm:mx-14 lg:mx-22.25" key={name}>
              {href ? (
                <a
                  aria-label={label}
                  className="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                  href={href}
                >
                  <Logo className="h-9 w-auto shrink-0 sm:h-10 lg:h-10.5" />
                </a>
              ) : (
                <Logo className="h-9 w-auto shrink-0 sm:h-10 lg:h-10.5" />
              )}
            </MarqueeItem>
          ))}
        </MarqueeContent>
      </Marquee>
    </section>
  );
}
