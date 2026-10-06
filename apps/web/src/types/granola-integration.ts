export interface GranolaHeadline {
  pre: string;
  highlight: string;
  secondLinePre: string;
  accent: string;
}

export interface GranolaNoteLine {
  text: string;
  nested?: boolean;
}

export interface GranolaFeature {
  title: string;
  description: string;
}
