import Link from "next/link";

import type { NavbarHrefProps } from "@/types/navbar";

export function NavbarHref({
  href,
  external,
  className,
  onClick,
  children,
  role,
}: NavbarHrefProps) {
  if (external) {
    return (
      <a
        className={className}
        href={href}
        onClick={onClick}
        rel="noopener noreferrer"
        role={role}
        target="_blank"
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href} onClick={onClick} role={role}>
      {children}
    </Link>
  );
}
