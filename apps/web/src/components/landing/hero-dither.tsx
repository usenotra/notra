import { DeferredDithering } from "@/components/deferred-dithering";

export function HeroDither() {
  return (
    <DeferredDithering
      className="absolute inset-0 h-full w-full"
      colorBack="#00000000"
      colorFront="#8B5CF633"
      fit="cover"
      scale={0.53}
      shape="wave"
      size={2.9}
      speed={0.53}
      type="4x4"
    />
  );
}
