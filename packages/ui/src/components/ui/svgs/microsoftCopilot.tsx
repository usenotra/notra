import { useId, type SVGProps } from "react";

// Gradient ids are per instance: a duplicate id inside a hidden copy of this
// icon would leave every other copy without its gradients.
const MicrosoftCopilot = (props: SVGProps<SVGSVGElement>) => {
  const idPrefix = `notra-copilot-${useId().replaceAll(":", "")}`;

  return (
    <svg {...props} fill="none" viewBox="2 4 43.998 40">
      <defs>
        <radialGradient
          id={`${idPrefix}-a`}
          cx="0"
          cy="0"
          gradientTransform="matrix(-10.96051 -13.38922 12.59013 -10.30637 38.005 20.514)"
          gradientUnits="userSpaceOnUse"
          r="1"
        >
          <stop offset=".096" stopColor="#00AEFF" />
          <stop offset=".773" stopColor="#2253CE" />
          <stop offset="1" stopColor="#0736C4" />
        </radialGradient>
        <radialGradient
          id={`${idPrefix}-b`}
          cx="0"
          cy="0"
          gradientTransform="rotate(51.84 -28.201 27.85) scale(15.9912 15.5119)"
          gradientUnits="userSpaceOnUse"
          r="1"
        >
          <stop stopColor="#FFB657" />
          <stop offset=".634" stopColor="#FF5F3D" />
          <stop offset=".923" stopColor="#C02B3C" />
        </radialGradient>
        <radialGradient
          id={`${idPrefix}-e`}
          cx="0"
          cy="0"
          gradientTransform="rotate(109.274 16.301 20.802) scale(38.3873 45.9867)"
          gradientUnits="userSpaceOnUse"
          r="1"
        >
          <stop offset=".066" stopColor="#8C48FF" />
          <stop offset=".5" stopColor="#F2598A" />
          <stop offset=".896" stopColor="#FFB152" />
        </radialGradient>
        <linearGradient
          id={`${idPrefix}-c`}
          gradientUnits="userSpaceOnUse"
          x1="12.5"
          x2="14.788"
          y1="7.5"
          y2="33.975"
        >
          <stop offset=".156" stopColor="#0D91E1" />
          <stop offset=".487" stopColor="#52B471" />
          <stop offset=".652" stopColor="#98BD42" />
          <stop offset=".937" stopColor="#FFC800" />
        </linearGradient>
        <linearGradient
          id={`${idPrefix}-d`}
          gradientUnits="userSpaceOnUse"
          x1="14.5"
          x2="15.75"
          y1="4"
          y2="32.885"
        >
          <stop stopColor="#3DCBFF" />
          <stop offset=".247" stopColor="#0588F7" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${idPrefix}-f`}
          gradientUnits="userSpaceOnUse"
          x1="42.586"
          x2="42.569"
          y1="13.346"
          y2="21.215"
        >
          <stop offset=".058" stopColor="#F8ADFA" />
          <stop offset=".708" stopColor="#A86EDD" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M34.142 7.325A4.63 4.63 0 0 0 29.7 4h-1.35a4.63 4.63 0 0 0-4.554 3.794L21.48 20.407l.575-1.965a4.63 4.63 0 0 1 4.444-3.33h7.853l3.294 1.282 3.175-1.283h-.926a4.63 4.63 0 0 1-4.443-3.325l-1.31-4.461z"
        fill={`url(#${idPrefix}-a)`}
      />
      <path
        d="M14.33 40.656A4.63 4.63 0 0 0 18.779 44h2.87a4.63 4.63 0 0 0 4.629-4.51l.312-12.163-.654 2.233a4.63 4.63 0 0 1-4.443 3.329h-7.919l-2.823-1.532-3.057 1.532h.912a4.63 4.63 0 0 1 4.447 3.344l1.279 4.423z"
        fill={`url(#${idPrefix}-b)`}
      />
      <path
        d="M29.5 4H13.46c-4.583 0-7.332 6.057-9.165 12.113C2.123 23.29-.72 32.885 7.503 32.885h6.925a4.63 4.63 0 0 0 4.456-3.358 2078.617 2078.617 0 0 1 4.971-17.156c.843-2.843 1.544-5.284 2.621-6.805C27.08 4.714 28.086 4 29.5 4z"
        fill={`url(#${idPrefix}-c)`}
      />
      <path
        d="M29.5 4H13.46c-4.583 0-7.332 6.057-9.165 12.113C2.123 23.29-.72 32.885 7.503 32.885h6.925a4.63 4.63 0 0 0 4.456-3.358 2078.617 2078.617 0 0 1 4.971-17.156c.843-2.843 1.544-5.284 2.621-6.805C27.08 4.714 28.086 4 29.5 4z"
        fill={`url(#${idPrefix}-d)`}
      />
      <path
        d="M18.498 44h16.04c4.582 0 7.332-6.058 9.165-12.115 2.171-7.177 5.013-16.775-3.208-16.775h-6.926a4.63 4.63 0 0 0-4.455 3.358 2084.036 2084.036 0 0 1-4.972 17.16c-.842 2.843-1.544 5.285-2.62 6.806-.604.852-1.61 1.566-3.024 1.566z"
        fill={`url(#${idPrefix}-e)`}
      />
      <path
        d="M18.498 44h16.04c4.582 0 7.332-6.058 9.165-12.115 2.171-7.177 5.013-16.775-3.208-16.775h-6.926a4.63 4.63 0 0 0-4.455 3.358 2084.036 2084.036 0 0 1-4.972 17.16c-.842 2.843-1.544 5.285-2.62 6.806-.604.852-1.61 1.566-3.024 1.566z"
        fill={`url(#${idPrefix}-f)`}
      />
    </svg>
  );
};

export { MicrosoftCopilot };
