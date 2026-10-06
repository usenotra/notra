import { PLATFORM_LABELS } from "../constants/navigation";
import type {
  FooterColumn,
  NavbarLink,
  PlainLink,
  ResolvedLink,
} from "../types/navigation";
import { brandIcon, lucideIcon } from "../utils/icons";
import { config } from "./params";

function plainLink(link: PlainLink): ResolvedLink {
  return {
    label: link.label,
    href: link.href,
    icon: lucideIcon(link.icon),
    iconOnly: false,
  };
}

function navbarLink(link: NavbarLink): ResolvedLink {
  if ("type" in link) {
    return {
      label: link.label ?? PLATFORM_LABELS[link.type],
      href: link.href,
      icon: brandIcon(link.type),
      iconOnly: !link.label,
    };
  }
  return plainLink(link);
}

export function navbarLinks(): ResolvedLink[] {
  return config.navbar.links.map(navbarLink);
}

export function navbarCta(): ResolvedLink | undefined {
  return config.navbar.cta ? plainLink(config.navbar.cta) : undefined;
}

export function navbarPrimary(): ResolvedLink | undefined {
  const primary = config.navbar.primary;
  if (!primary) {
    return undefined;
  }
  return {
    label: PLATFORM_LABELS[primary.type],
    href: primary.href,
    icon: brandIcon(primary.type),
    iconOnly: false,
  };
}

export function footerColumns(): FooterColumn[] {
  return config.footer.links.flatMap((item) =>
    "items" in item
      ? [{ header: item.header, items: item.items.map(plainLink) }]
      : []
  );
}

export function footerFlatLinks(): ResolvedLink[] {
  return config.footer.links.flatMap((item) =>
    "items" in item ? [] : [plainLink(item)]
  );
}

export function footerSocials(): ResolvedLink[] {
  return Object.entries(config.footer.socials).flatMap(([platform, url]) =>
    url
      ? [
          {
            label:
              PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ??
              platform,
            href: url,
            icon: brandIcon(platform),
            iconOnly: true,
          },
        ]
      : []
  );
}
