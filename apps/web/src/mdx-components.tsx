import type { MDXComponents } from "mdx/types";

const REL_TOKENS_SPLIT_REGEX = /\s+/;
const EXTERNAL_HREF_REGEX = /^(https?:)?\/\//;

function withSafeExternalRel(rel?: string) {
  const tokens = new Set(
    (rel ?? "").split(REL_TOKENS_SPLIT_REGEX).filter(Boolean)
  );
  tokens.add("noopener");
  tokens.add("noreferrer");
  return [...tokens].join(" ");
}

function isExternalHref(href?: string) {
  return typeof href === "string" && EXTERNAL_HREF_REGEX.test(href);
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...components,
    a: ({ children, href, rel, target, ...props }) =>
      isExternalHref(href) ? (
        <a
          {...props}
          href={href}
          rel={withSafeExternalRel(rel)}
          target="_blank"
        >
          {children}
        </a>
      ) : (
        <a {...props} href={href} rel={rel} target={target}>
          {children}
        </a>
      ),
  };
}
