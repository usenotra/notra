import { cn } from "@notra/ui/lib/utils";

import { TestimonialsShader } from "@/components/landing/testimonials-shader";
import {
  FEATURED_TESTIMONIAL,
  PAIR_TESTIMONIALS,
  TESTIMONIALS_SUBHEADING,
} from "@/constants/landing/testimonials";
import type { Testimonial } from "@/types/landing/testimonials";

const AVATAR_SIZE = 56;

interface TestimonialCardProps {
  testimonial: Testimonial;
  featured?: boolean;
}

function TestimonialCard({
  testimonial,
  featured = false,
}: TestimonialCardProps) {
  return (
    <article
      className={cn(
        "relative flex w-full flex-1 flex-col overflow-clip rounded-3xl p-6 backdrop-blur-[0.375rem] sm:p-10 lg:px-16 lg:py-20",
        "[box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] dark:bg-white/[0.03] dark:bg-none dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem,#00000014_0_0.0625rem_0.125rem]",
        featured
          ? "bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_20%)_0%,oklab(91.7%_0.017_-0.029_/_50%)_100%)]"
          : "bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_20%)_0%,oklab(93.7%_0.019_-0.031_/_50%)_100%)]"
      )}
    >
      <TestimonialsShader
        className={testimonial.shader.className}
        colorFront={testimonial.shader.colorFront}
        size={testimonial.shader.size}
      />
      <div
        className={cn(
          "relative z-10 flex flex-col gap-10 lg:gap-14",
          !featured && "justify-between lg:min-h-[25rem]"
        )}
      >
        <p className="dark:text-foreground min-w-0 self-stretch font-sans text-xl/7 font-medium tracking-[-0.015em] text-[#1E1E1E] sm:text-[1.375rem]/7.5 lg:text-[1.5625rem]/8">
          {testimonial.quote}
        </p>
        <div className="flex items-center gap-4">
          <div className="size-14 shrink-0 overflow-hidden rounded-full border border-[#1E1E1E40] bg-white dark:border-white/20">
            <img
              decoding="async"
              loading="lazy"
              alt={testimonial.avatarAlt}
              className="size-full object-cover"
              height={AVATAR_SIZE}
              src={testimonial.avatar}
              width={AVATAR_SIZE}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="dark:text-foreground font-sans text-base/5.5 font-medium text-[#1E1E1E]">
              {testimonial.name}
            </span>
            <span className="font-display dark:text-muted-foreground text-base/5.5 text-[#1E1E1EBF]">
              {testimonial.role}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function TestimonialsSection() {
  return (
    <section className="flex w-full flex-col items-center gap-10 px-6 pt-24 pb-27.5 sm:px-12 lg:gap-13.5 lg:px-20 lg:pt-70">
      <div className="flex flex-col items-center gap-4">
        <h2 className="font-display dark:text-foreground text-center text-[2rem]/tight font-medium tracking-[-0.02em] text-black sm:text-4xl/tight lg:text-[3.0625rem]/14">
          Teams already <span className="text-primary">ship</span> with Notra.
        </h2>
        <p className="font-display dark:text-muted-foreground max-w-[31.875rem] text-center text-lg/7 font-medium tracking-[-0.01em] text-[#1E1E1EBF] sm:text-xl/7.5">
          {TESTIMONIALS_SUBHEADING}
        </p>
      </div>
      <div className="flex w-full max-w-[80rem] flex-col items-start gap-8">
        <TestimonialCard featured testimonial={FEATURED_TESTIMONIAL} />
        <div className="flex w-full flex-col gap-8 lg:flex-row">
          {PAIR_TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
