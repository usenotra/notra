import type { SVGProps } from "react";

const Framer = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} preserveAspectRatio="xMidYMid" viewBox="0 0 256 384">
    <title>Framer</title>
    <path
      className="fill-foreground dark:fill-white"
      d="M0 0h256v128H128L0 0Zm0 128h128l128 128H128v128L0 256V128Z"
    />
  </svg>
);

export { Framer };
