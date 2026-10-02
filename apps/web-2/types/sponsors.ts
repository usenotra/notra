import type { ComponentType, SVGProps } from "react";

export interface Sponsor {
  name: string;
  url: string;
  logo: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface SponsorsProps {
  sponsors: Sponsor[];
}
