import type { ReactNode } from "react";

import type { EngineId } from "@/types/landing/geo";

export interface HeroCycleWord {
  text: string;
  engine: EngineId;
}

export interface HeroHeadlineProps {
  word: HeroCycleWord;
}

export interface CycleMarkProps {
  markKey: string;
  animated: boolean;
  className?: string;
  children: ReactNode;
}
