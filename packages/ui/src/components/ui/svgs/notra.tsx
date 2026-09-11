interface NotraProps {
  className?: string;
}

const NOTRA_MARK_SIZE = 800;
const NOTRA_MARK_FILL = "#c8b2ee";
const NOTRA_MARK_BLOB =
  "M572.881 462.223c-12.712 43.22-290.678 105.932-394.068 83.898l-48.305-10.169 48.305-78.814 68.644-104.237 73.729-106.78 251.695-127.119 78.814-22.881 17.796 17.796h10.17c17.796 35.593 3.945 147.458-12.712 195.763-25.424 73.729-124.576 96.61-177.966 114.407-4.064 1.355 96.61-5.085 83.898 38.136Z";
const NOTRA_MARK_SLASH =
  "M700 96.111c-162.712-4.237-510.508 111.356-600 607.627";

function xmlAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

/** Official mark as an SVG string — same paths as `<Notra />`. */
export function notraMarkSvg(stroke: string): string {
  const color = xmlAttr(stroke);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${NOTRA_MARK_SIZE}" height="${NOTRA_MARK_SIZE}" viewBox="0 0 ${NOTRA_MARK_SIZE} ${NOTRA_MARK_SIZE}" fill="none"><path d="${NOTRA_MARK_BLOB}" fill="${NOTRA_MARK_FILL}" stroke="${color}" stroke-linecap="round" stroke-width="35"/><path d="${NOTRA_MARK_SLASH}" stroke="${color}" stroke-linecap="round" stroke-width="75" fill="none"/></svg>`;
}

export function Notra({ className }: NotraProps) {
  return (
    <svg
      aria-label="Notra"
      className={className}
      fill="none"
      role="img"
      viewBox={`0 0 ${NOTRA_MARK_SIZE} ${NOTRA_MARK_SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={NOTRA_MARK_BLOB}
        fill={NOTRA_MARK_FILL}
        stroke="#1e1e1e"
        strokeLinecap="round"
        strokeWidth={35}
      />
      <path
        d={NOTRA_MARK_SLASH}
        stroke="#1e1e1e"
        strokeLinecap="round"
        strokeWidth={75}
      />
    </svg>
  );
}
