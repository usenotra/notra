import { cn } from "@notra/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

import type { LoopVideoProps } from "@/lib/marketing-assets/types/components";

export function LoopVideo({ src, poster, label, className }: LoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<
    boolean | null
  >(null);
  const shouldAutoplay = prefersReducedMotion === false;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(media.matches);
    };

    updatePreference();
    media.addEventListener("change", updatePreference);

    return () => {
      media.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!shouldAutoplay) {
      video.pause();
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    const play = () => {
      video.play().catch(() => undefined);
    };
    play();
    video.addEventListener("canplay", play);
    return () => {
      video.removeEventListener("canplay", play);
    };
  }, [shouldAutoplay]);

  return (
    <video
      aria-label={label}
      autoPlay={shouldAutoplay}
      className={cn(
        "corner-squircle block aspect-video w-full rounded-2xl border border-[#1E1E1E14] object-cover supports-[corner-shape:round]:rounded-[1.25rem] dark:border-white/10",
        className
      )}
      loop={shouldAutoplay}
      muted
      playsInline
      poster={poster}
      preload="metadata"
      ref={videoRef}
      src={src}
    />
  );
}
