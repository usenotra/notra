interface NotFoundDitherHoverConfig {
  offsetRange: number;
  lerp: number;
  /** Fraction of the numeral height that maps to the full Y offset. Match the fade. */
  visibleYRatio: number;
}

export interface NotFoundDitheringConfig {
  speed: number;
  shape: "wave";
  type: "4x4";
  size: number;
  scale: number;
  colorBack: string;
  colorFront: string;
  fit: "cover";
  hover: NotFoundDitherHoverConfig;
}
