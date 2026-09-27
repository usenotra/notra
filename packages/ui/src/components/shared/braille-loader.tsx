import { cn } from "@notra/ui/lib/utils";

const BRAILLE_CHARS = ["⠠", "⠝", "⠕", "⠞", "⠗", "⠁"];

interface BrailleLoaderProps {
  className?: string;
  variant?: "wave" | "typewriter" | "shimmer" | "pulse";
  label?: string;
  ariaLabel?: string;
}

const STEP_MS = 120;

const variantStyles: Record<string, string> = {
  wave: `@keyframes braille-wave {
    0%, 100% { opacity: 0.15; }
    12%, 25% { opacity: 1; }
    37% { opacity: 0.15; }
  }`,
  typewriter: `@keyframes braille-typewriter {
    0%, 10% { opacity: 0; }
    12% { opacity: 1; }
    80% { opacity: 1; }
    90%, 100% { opacity: 0; }
  }`,
  shimmer: `@keyframes braille-shimmer {
    0%, 100% { opacity: 0.15; }
    12%, 25% { opacity: 1; }
    37% { opacity: 0.4; }
    50% { opacity: 0.15; }
  }`,
  pulse: `@keyframes braille-pulse {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 1; }
  }`,
};

function getAnimation(
  variant: string,
  index: number,
  total: number
): React.CSSProperties {
  const totalDuration = (total + 2) * STEP_MS;
  const delay = index * STEP_MS;

  if (variant === "pulse") {
    return {
      animation: `braille-pulse ${total * STEP_MS * 1.5}ms ease-in-out ${delay}ms infinite`,
    };
  }

  return {
    animation: `braille-${variant} ${totalDuration}ms ease-in-out ${delay}ms infinite`,
  };
}

export function BrailleLoader({
  className,
  variant = "wave",
  label,
  ariaLabel = "Loading",
}: BrailleLoaderProps) {
  const allChars = label
    ? [...BRAILLE_CHARS, " ", ...label.split("")]
    : BRAILLE_CHARS;
  const total = allChars.length;

  return (
    <output
      aria-label={ariaLabel}
      className={cn("text-muted-foreground inline-flex font-mono", className)}
    >
      <style>{variantStyles[variant]}</style>
      {allChars.map((char, i) => (
        <span key={i} style={getAnimation(variant, i, total)}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </output>
  );
}
