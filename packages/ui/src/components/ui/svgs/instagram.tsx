import type { SVGProps } from "react";

const Instagram = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24">
    <title>Instagram</title>
    <defs>
      <radialGradient
        id="instagram-a"
        cx="0"
        cy="1"
        gradientTransform="matrix(0 -24 22.3 0 2 24)"
        gradientUnits="userSpaceOnUse"
        r="1"
      >
        <stop offset="0" stopColor="#FFDD55" />
        <stop offset="0.5" stopColor="#FF543E" />
        <stop offset="1" stopColor="#C837AB" />
      </radialGradient>
      <radialGradient
        id="instagram-b"
        cx="0"
        cy="0"
        gradientTransform="matrix(-8 18 -13.6 -5.5 22 2)"
        gradientUnits="userSpaceOnUse"
        r="1"
      >
        <stop stopColor="#3771C8" />
        <stop offset="1" stopColor="#3771C8" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect fill="url(#instagram-a)" height="24" rx="6" width="24" />
    <rect fill="url(#instagram-b)" height="24" rx="6" width="24" />
    <circle
      cx="12"
      cy="12"
      r="5.15"
      stroke="#fff"
      strokeWidth="2"
    />
    <circle cx="17.35" cy="6.65" fill="#fff" r="1.2" />
  </svg>
);

export { Instagram };
