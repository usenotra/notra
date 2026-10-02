import { Link } from "@tanstack/react-router";

import { CONTACT_RESOURCE_LINKS } from "@/constants/contact";
import type { ContactResourceIconId } from "@/types/contact";

function ResourceGlyph({ icon }: { icon: ContactResourceIconId }) {
  const common = {
    fill: "none",
    stroke: "#7C3AED",
    strokeWidth: 2,
  } as const;

  if (icon === "documentation") {
    return (
      <svg
        aria-hidden="true"
        height="18"
        viewBox="0 0 24 24"
        width="18"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"
          strokeLinejoin="round"
          {...common}
        />
        <path
          d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"
          strokeLinejoin="round"
          {...common}
        />
      </svg>
    );
  }

  if (icon === "mcp") {
    return (
      <svg
        aria-hidden="true"
        height="18"
        viewBox="0 0 24 24"
        width="18"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="3" {...common} />
        <path
          d="M12 2v4M12 18v4M2 12h4M18 12h4"
          strokeLinecap="round"
          {...common}
        />
      </svg>
    );
  }

  if (icon === "oss") {
    return (
      <svg
        aria-hidden="true"
        height="18"
        viewBox="0 0 24 24"
        width="18"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="9" cy="8" r="3.5" {...common} />
        <path
          d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"
          strokeLinecap="round"
          {...common}
        />
        <circle cx="17" cy="9" r="2.5" {...common} />
        <path
          d="M16.5 14.5c2.4.2 4.3 1.6 5 4"
          strokeLinecap="round"
          {...common}
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      height="18"
      viewBox="0 0 24 24"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3l2.1 5.6L20 9l-4.4 3.8L17 19l-5-3.2L7 19l1.4-6.2L4 9l5.9-.4L12 3Z"
        strokeLinejoin="round"
        {...common}
      />
    </svg>
  );
}

function TrailingGlyph({ external }: { external: boolean }) {
  if (external) {
    return (
      <svg
        aria-hidden="true"
        className="text-[#1E1E1E66] dark:text-white/40"
        height="16"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 17L17 7M17 7H8M17 7V16"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="text-[#1E1E1E66] dark:text-white/40"
      height="16"
      viewBox="0 0 24 24"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ContactResources() {
  return (
    <div className="flex flex-col rounded-3xl border border-[#ECECEC] bg-white p-3 shadow-[0_0.0625rem_0.1875rem_#28282814] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
      {CONTACT_RESOURCE_LINKS.map((resource) => (
        <Link
          className="flex items-center gap-3.5 rounded-[0.875rem] px-4 py-3.5 transition-colors hover:bg-[#F7F4FD] dark:hover:bg-white/[0.04]"
          to={resource.href}
          key={resource.href}
          rel={resource.external ? "noopener noreferrer" : undefined}
          target={resource.external ? "_blank" : undefined}
        >
          <span className="dark:bg-primary/15 flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-[#F1ECFB]">
            <ResourceGlyph icon={resource.icon} />
          </span>
          <span className="flex grow flex-col gap-px">
            <span className="font-display text-[0.9375rem]/5 font-medium tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
              {resource.label}
            </span>
            <span className="font-sans text-[0.8125rem]/4.5 text-[#1E1E1EA6] dark:text-white/60">
              {resource.description}
            </span>
          </span>
          <TrailingGlyph external={resource.external} />
        </Link>
      ))}
    </div>
  );
}
