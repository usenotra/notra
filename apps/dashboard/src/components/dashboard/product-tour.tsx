"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { PRODUCT_TOUR_STEPS } from "@/constants/product-tour";
import { useOnboardingStatus } from "@/lib/hooks/use-onboarding";
import type { TourRect } from "@/types/components/product-tour";
import {
  findTourTarget,
  finishProductTour,
  isProductTourPending,
  subscribeToProductTour,
  tourCardPosition,
} from "@/utils/product-tour";

const TARGET_RETRY_FRAMES = 30;

export function ProductTour() {
  const { activeOrganization } = useOrganizationsContext();
  const slug = activeOrganization?.slug ?? "";
  const organizationId = activeOrganization?.id ?? "";
  const pending = useSyncExternalStore(
    subscribeToProductTour,
    () => (slug ? isProductTourPending(slug) : false),
    () => false
  );
  const { data: onboarding, isPending: onboardingPending } =
    useOnboardingStatus(organizationId);
  const dismissed = onboarding?.onboardingDismissed ?? false;

  useEffect(() => {
    if (slug && dismissed && isProductTourPending(slug)) {
      finishProductTour(slug);
    }
  }, [dismissed, slug]);

  if (!(slug && pending) || onboardingPending || dismissed) {
    return null;
  }

  return <ProductTourDialog slug={slug} />;
}

function ProductTourDialog({ slug }: { slug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<TourRect | null>(null);
  const step = PRODUCT_TOUR_STEPS[stepIndex] ?? PRODUCT_TOUR_STEPS[0];
  const last = stepIndex === PRODUCT_TOUR_STEPS.length - 1;
  const href = `/${slug}${step.link}`;

  useEffect(() => {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return;
    }
    router.push(href);
  }, [href, pathname, router]);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;

    const measure = (scrollIntoView: boolean) => {
      if (cancelled) {
        return;
      }
      const node = findTourTarget(step.id, step.link);
      if (!node && frame < TARGET_RETRY_FRAMES) {
        frame += 1;
        requestAnimationFrame(() => measure(true));
        return;
      }
      if (node && scrollIntoView) {
        node.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      const rect = node?.getBoundingClientRect();
      setTarget(
        rect
          ? {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }
          : null
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finishProductTour(slug);
      }
    };

    const onLayout = () => measure(false);

    measure(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [pathname, slug, step.id, step.link]);

  function close() {
    finishProductTour(slug);
  }

  function next() {
    if (last) {
      close();
      return;
    }
    setStepIndex((current) => current + 1);
  }

  const card = tourCardPosition(target, {
    width: window.innerWidth,
    height: window.innerHeight,
  });

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        aria-label="Skip tour"
        className={
          target
            ? "absolute inset-0 cursor-default"
            : "bg-foreground/35 absolute inset-0 cursor-default"
        }
        onClick={close}
        type="button"
      />
      {target ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary"
          style={{
            top: target.top - 6,
            left: target.left - 6,
            width: target.width + 12,
            height: target.height + 12,
            boxShadow:
              "0 0 0 9999px color-mix(in oklch, var(--foreground) 35%, transparent)",
          }}
        />
      ) : null}
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="bg-popover text-popover-foreground absolute w-[min(26.25rem,calc(100vw-2rem))] rounded-xl border p-4 shadow-lg"
        role="dialog"
        style={{ top: card.top, left: card.left }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-sm font-semibold" id={titleId}>
            {step.title}
          </h2>
          <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {stepIndex + 1} / {PRODUCT_TOUR_STEPS.length}
          </p>
        </div>
        <p className="text-muted-foreground mt-1.5 text-sm">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {PRODUCT_TOUR_STEPS.map((item, index) => (
              <button
                aria-label={`Go to step ${index + 1}`}
                className={
                  index === stepIndex
                    ? "bg-foreground h-1.5 w-4 rounded-full"
                    : "bg-muted-foreground/40 size-1.5 rounded-full"
                }
                key={item.id}
                onClick={() => setStepIndex(index)}
                type="button"
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={close} size="sm" type="button" variant="ghost">
              Skip tour
            </Button>
            <Button onClick={next} size="sm" type="button">
              {last ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
