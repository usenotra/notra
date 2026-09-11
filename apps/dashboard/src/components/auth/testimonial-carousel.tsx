"use client";

import { CarouselProgress } from "@notra/ui/components/ui/carousel-progress";
import { cn } from "@notra/ui/lib/utils";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";

import {
  AUTH_TESTIMONIAL_INTERVAL_MS,
  AUTH_TESTIMONIALS,
} from "@/constants/auth-testimonials";

export function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const startedAt = performance.now();

    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextProgress = Math.min(
        (elapsed / AUTH_TESTIMONIAL_INTERVAL_MS) * 100,
        100
      );

      if (nextProgress >= 100) {
        setProgress(0);
        setActiveIndex((activeIndex + 1) % AUTH_TESTIMONIALS.length);
      } else {
        setProgress(nextProgress);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [activeIndex, shouldReduceMotion]);

  return (
    <section
      aria-label="Customer testimonials"
      aria-roledescription="carousel"
      className="flex w-full max-w-xl flex-col gap-5"
    >
      <div
        aria-live={shouldReduceMotion ? "polite" : "off"}
        className="grid min-h-[15rem] rounded-3xl bg-white/10 p-7 shadow-[0_0_0_0.0625rem_rgba(255,255,255,0.2)]"
      >
        {AUTH_TESTIMONIALS.map((testimonial, index) => (
          <figure
            aria-hidden={index !== activeIndex}
            aria-label={`Testimonial ${index + 1} of ${AUTH_TESTIMONIALS.length}`}
            aria-roledescription="slide"
            className={cn(
              "duration-slower col-start-1 row-start-1 flex flex-col justify-between gap-5 transition-opacity ease-in-out motion-reduce:transition-none",
              index === activeIndex
                ? "opacity-100"
                : "pointer-events-none opacity-0 select-none"
            )}
            key={testimonial.name}
          >
            <blockquote className="text-base leading-relaxed text-white">
              "{testimonial.quote}"
            </blockquote>
            <figcaption className="flex items-center gap-3">
              <Image
                alt={testimonial.name}
                className="size-10 shrink-0 rounded-full object-cover"
                height={40}
                src={testimonial.avatarSrc}
                width={40}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {testimonial.name}
                </span>
                <span className="text-sm text-violet-100/75">
                  {testimonial.role}
                </span>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
      <CarouselProgress
        activeIndex={activeIndex}
        labels={AUTH_TESTIMONIALS.map(
          (item) => `Show testimonial from ${item.name}`
        )}
        onSelect={(index) => {
          if (index === activeIndex) {
            return;
          }

          setActiveIndex(index);
          setProgress(0);
        }}
        progress={shouldReduceMotion ? 100 : progress}
        variant="inverted"
      />
    </section>
  );
}
