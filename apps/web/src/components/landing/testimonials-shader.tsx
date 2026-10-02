import { DeferredDithering } from "@/components/deferred-dithering";
import type { TestimonialsShaderProps } from "@/types/landing/testimonials";

export function TestimonialsShader({
  size,
  colorFront,
  className,
}: TestimonialsShaderProps) {
  return (
    <DeferredDithering
      className={className}
      colorBack="#00000000"
      colorFront={colorFront}
      scale={0.74}
      shape="wave"
      size={size}
      speed={0.5}
      type="4x4"
    />
  );
}
