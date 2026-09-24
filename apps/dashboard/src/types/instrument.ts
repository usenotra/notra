import type { ReactNode } from "react";

export interface InstrumentGridProps {
  children: ReactNode;
  className?: string;
}

export interface InstrumentModuleProps {
  eyebrow: string;
  description?: ReactNode;
  hint?: ReactNode;
  readout?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: "flat" | "panel" | "table";
  bareBody?: boolean;
}

export interface InstrumentRevealProps {
  active: boolean;
  order?: number;
  children: ReactNode;
  className?: string;
}

export interface InstrumentEmptyProps {
  seed: string;
  message: string;
  className?: string;
  busy?: boolean;
  action?: ReactNode;
  preview?: ReactNode;
}
