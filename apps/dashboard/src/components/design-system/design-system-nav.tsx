"use client";

import Link from "next/link";

const LINKS = [
  { href: "/design-system#colors", label: "UI kit" },
  { href: "/design-system#auth-mfa", label: "Auth" },
  { href: "/design-system/auth-flow", label: "Auth flow" },
  { href: "/design-system#chatgpt-thread", label: "ChatGPT chat" },
  { href: "/design-system#claude-chat-thread", label: "Claude chat" },
  { href: "/design-system#gemini-thread", label: "Gemini chat" },
  { href: "/design-system#perplexity-thread", label: "Perplexity" },
  { href: "/design-system#claude-session", label: "Claude TUI" },
  { href: "/design-system#codex-session", label: "Codex TUI" },
  { href: "/design-system#opencode-session", label: "OpenCode TUI" },
] as const;

export function DesignSystemNav() {
  return (
    <nav
      aria-label="Design system"
      className="flex flex-wrap items-center gap-4"
    >
      {LINKS.map((link) => (
        <Link
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
