import { cn } from "cn";

import type { OpencodeLogoProps } from "../types/opencode";

const LOGO_WIDTH = 234;
const LOGO_HEIGHT = 42;

export const OpencodeLogo = ({
  "aria-label": ariaLabel = "OpenCode",
  className,
  scale = 1,
  ...props
}: OpencodeLogoProps) => (
  <svg
    aria-label={ariaLabel}
    className={cn("block", className)}
    data-slot="opencode-logo"
    height={LOGO_HEIGHT * scale}
    role="img"
    shapeRendering="crispEdges"
    viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
    width={LOGO_WIDTH * scale}
    {...props}
  >
    <g className="fill-opencode-logo-fill">
      <path d="M18 30H6V18H18V30Z" />
      <path d="M48 30H36V18H48V30Z" />
      <path d="M84 24V30H66V24H84Z" />
      <path d="M108 36H96V18H108V36Z" />
      <path d="M144 30H126V18H144V30Z" />
      <path d="M168 30H156V18H168V30Z" />
      <path d="M198 30H186V18H198V30Z" />
      <path d="M234 24V30H216V24H234Z" />
    </g>
    <g className="fill-opencode-logo-open">
      <path d="M18 12H6V30H18V12ZM24 36H0V6H24V36Z" />
      <path d="M36 30H48V12H36V30ZM54 36H36V42H30V6H54V36Z" />
      <path d="M84 24H66V30H84V36H60V6H84V24ZM66 18H78V12H66V18Z" />
      <path d="M108 12H96V36H90V6H108V12ZM114 36H108V12H114V36Z" />
    </g>
    <g className="fill-opencode-logo-code">
      <path d="M144 12H126V30H144V36H120V6H144V12Z" />
      <path d="M168 12H156V30H168V12ZM174 36H150V6H174V36Z" />
      <path d="M198 12H186V30H198V12ZM204 36H180V6H198V0H204V36Z" />
      <path d="M216 12V18H228V12H216ZM234 24H216V30H234V36H210V6H234V24Z" />
    </g>
  </svg>
);
