import { NOTRA_MARK } from "@notra/ui/lib/notra-mark";

interface NotraProps {
  className?: string;
}

export function Notra({ className }: NotraProps) {
  return (
    <svg
      aria-label="Notra"
      className={className}
      fill="none"
      role="img"
      viewBox={`0 0 ${NOTRA_MARK.size} ${NOTRA_MARK.size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={NOTRA_MARK.blob}
        fill={NOTRA_MARK.fill}
        stroke="#1e1e1e"
        strokeLinecap="round"
        strokeWidth={35}
      />
      <path
        d={NOTRA_MARK.slash}
        stroke="#1e1e1e"
        strokeLinecap="round"
        strokeWidth={75}
      />
    </svg>
  );
}
