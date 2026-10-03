import Scritto from "@scritto/react";
import { domAnimation, LazyMotion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import {
  CycleMark,
  HeadlineFlow,
  useIsClient,
} from "@/components/landing/hero-headline";
import {
  PERSONAS_HEADLINE_CYCLE,
  PERSONAS_HEADLINE_LINE_ONE,
} from "@/constants/feature-pages/personas";
import { HERO_HEADLINE_CYCLE_MS } from "@/constants/landing/hero";
import type { PersonasHeadlineWordProps } from "@/types/feature-detail-page";

function CyclingWord({ value, animated, morph }: PersonasHeadlineWordProps) {
  if (!morph) {
    return <span className="ml-[0.16em]">{value}</span>;
  }

  return (
    <Scritto
      animated={animated}
      className="ml-[0.16em] align-baseline"
      value={value}
    />
  );
}

export function PersonasHeadline() {
  const animated = useReducedMotion() === false;
  const morph = useIsClient();
  const [index, setIndex] = useState(0);
  const persona =
    PERSONAS_HEADLINE_CYCLE[index % PERSONAS_HEADLINE_CYCLE.length];

  useEffect(() => {
    if (!animated) {
      return;
    }
    const interval = window.setInterval(() => {
      setIndex((current) => current + 1);
    }, HERO_HEADLINE_CYCLE_MS);
    return () => window.clearInterval(interval);
  }, [animated]);

  if (!persona) {
    return null;
  }

  const lineTwo = (
    <>
      as
      <CycleMark animated={animated} markKey={persona.name}>
        <img alt="" className="rounded-full" src={persona.avatar} />
      </CycleMark>
      <CyclingWord animated={animated} morph={morph} value={persona.name} />{" "}
      would.
    </>
  );

  return (
    <LazyMotion features={domAnimation}>
      <span className="block whitespace-nowrap">
        {PERSONAS_HEADLINE_LINE_ONE}
      </span>
      {morph ? (
        <HeadlineFlow className="block whitespace-nowrap">
          {lineTwo}
        </HeadlineFlow>
      ) : (
        <span className="block whitespace-nowrap">{lineTwo}</span>
      )}
    </LazyMotion>
  );
}
