---
version: alpha
name: Notra
description: Notra's public design system. Light-first, product-led, and built from violet action color, neutral surfaces, precise borders, structural hatch texture, Inter UI typography, and selective Instrument Serif display type.
colors:
  primary: "oklch(0.6056 0.2189 292.7172)"
  primary-hover: "oklch(0.5 0.22 292.72)"
  primary-foreground: "oklch(0.997 0 0)"
  primary-border: "color-mix(in oklab, var(--primary) 12%, transparent)"
  background: "hsl(0 0% 100%)"
  foreground: "hsl(0 0% 9%)"
  card: "hsl(0 0% 100%)"
  card-foreground: "hsl(0 0% 9%)"
  popover: "hsl(0 0% 100%)"
  popover-foreground: "hsl(0 0% 9%)"
  secondary: "hsl(0 0% 96.1%)"
  secondary-foreground: "hsl(0 0% 9%)"
  muted: "hsl(0 0% 96.1%)"
  muted-foreground: "hsl(0 0% 45.1%)"
  accent: "hsl(0 0% 96.1%)"
  accent-foreground: "hsl(0 0% 9%)"
  border: "hsl(0 0% 89.8%)"
  input: "hsl(0 0% 89.8%)"
  ring: "oklch(0.6056 0.2189 292.7172)"
  destructive: "hsl(0 84.2% 60.2%)"
  destructive-foreground: "hsl(0 0% 98%)"
  logo-lavender: "#C8B2EE"
  logo-ink: "#1E1E1E"
  logo-cream: "#F6F3F1"
  dark-background: "hsl(233 7% 8%)"
  dark-foreground: "hsl(0 0% 98%)"
  dark-primary-foreground: "oklch(0.985 0 0)"
  dark-card: "hsl(240 6% 10%)"
  dark-card-foreground: "hsl(0 0% 98%)"
  dark-popover: "hsl(233 7% 8%)"
  dark-popover-foreground: "hsl(0 0% 98%)"
  dark-secondary: "hsl(0 0% 14.9%)"
  dark-secondary-foreground: "hsl(0 0% 98%)"
  dark-muted: "hsl(0 0% 14.9%)"
  dark-muted-foreground: "hsl(0 0% 63.9%)"
  dark-accent: "hsl(0 0% 14.9%)"
  dark-accent-foreground: "hsl(0 0% 98%)"
  dark-border: "hsl(0 1% 17%)"
  dark-input: "hsl(0 0% 14.9%)"
  dark-destructive: "hsl(358 100% 50%)"
  dark-destructive-foreground: "hsl(0 0% 99%)"
  chart-1: "oklch(0.646 0.222 41.116)"
  chart-2: "oklch(0.6 0.118 184.704)"
  chart-3: "oklch(0.398 0.07 227.392)"
  chart-4: "oklch(0.828 0.189 84.429)"
  chart-5: "oklch(0.769 0.188 70.08)"
typography:
  display-serif-80:
    fontFamily: Instrument Serif
    fontSize: 80px
    fontWeight: 400
    lineHeight: 96px
    letterSpacing: 0
  display-serif-52:
    fontFamily: Instrument Serif
    fontSize: 52px
    fontWeight: 400
    lineHeight: 62px
    letterSpacing: 0
  heading-56:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: 600
    lineHeight: 64px
    letterSpacing: -1.4px
  heading-48:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 600
    lineHeight: 60px
    letterSpacing: -1.2px
  heading-36:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 600
    lineHeight: 44px
    letterSpacing: -0.9px
  heading-30:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 600
    lineHeight: 38px
    letterSpacing: -0.75px
  heading-24:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: -0.6px
  heading-20:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: -0.4px
  heading-18:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 500
    lineHeight: 28px
  copy-20:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 500
    lineHeight: 32px
  copy-18:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
  copy-16:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 28px
  copy-14:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 24px
  copy-13:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  label-14:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  label-13:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 20px
  label-12:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
  code-13:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
  20: 80px
  24: 96px
  32: 128px
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  squircle: "16px with corner-shape: round"
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    hoverBackgroundColor: "{colors.primary-hover}"
    typography: "{typography.label-13}"
    rounded: "{rounded.squircle}"
    padding: "0 24px"
    height: 40px
  button-primary-large:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    hoverBackgroundColor: "{colors.primary-hover}"
    typography: "{typography.label-14}"
    rounded: "{rounded.squircle}"
    padding: "0 40px"
    height: 48px
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.border}"
    typography: "{typography.label-13}"
    rounded: "{rounded.squircle}"
    padding: "0 24px"
    height: 40px
  button-secondary-large:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.border}"
    typography: "{typography.label-14}"
    rounded: "{rounded.squircle}"
    padding: "0 40px"
    height: 48px
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.input}"
    typography: "{typography.copy-14}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: 40px
  input-large:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.input}"
    typography: "{typography.copy-16}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: 48px
  badge:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-12}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  segmented-control:
    backgroundColor: "color-mix(in oklab, var(--primary) 10%, transparent)"
    textColor: "{colors.muted-foreground}"
    activeBackgroundColor: "{colors.card}"
    activeTextColor: "{colors.primary}"
    borderColor: "color-mix(in oklab, var(--primary) 8%, transparent)"
    typography: "{typography.label-13}"
    rounded: "{rounded.full}"
    padding: 2px
    height: 32px
  nav-island:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    borderColor: "rgba(0,0,0,0.05)"
    rounded: "{rounded.xl}"
    shadow: "0 10px 30px rgba(0,0,0,0.08), inset 0 1px rgba(255,255,255,0.9)"
  menu-card:
    backgroundColor: "rgba(250,250,250,0.7)"
    textColor: "{colors.foreground}"
    borderColor: "rgba(0,0,0,0.08)"
    typography: "{typography.copy-14}"
    rounded: "{rounded.xl}"
    padding: 16px
  marketing-section:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.border}"
    typography: "{typography.copy-16}"
    padding: "64px 24px"
  section-heading:
    textColor: "{colors.foreground}"
    typography: "{typography.heading-48}"
  product-frame:
    backgroundColor: "{colors.card}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    shadow: "0 0 0 1px rgba(0,0,0,0.08)"
  pricing-card:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    borderColor: "{colors.border}"
    typography: "{typography.copy-14}"
    rounded: "{rounded.none}"
    padding: "20px 24px"
  pricing-card-featured:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    borderColor: "{colors.primary-border}"
    typography: "{typography.copy-14}"
    rounded: "{rounded.none}"
    padding: "20px 24px"
  brand-card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    borderColor: "color-mix(in oklab, var(--border) 70%, transparent)"
    typography: "{typography.copy-14}"
    rounded: "{rounded.xl}"
    padding: 24px
  prose:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.copy-16}"
    rounded: "{rounded.none}"
  hatch-pattern:
    background: "repeating-linear-gradient(45deg, var(--color-border) 0px, var(--color-border) 1px, transparent 1px, transparent 16px)"
    opacity: 0.6
  hero-gradient:
    background: "radial-gradient(125% 125% at 50% 90%, var(--background) 40%, var(--primary) 100%)"
    height: 100vh
---

# Notra

## Overview

Notra is an AI content-generation platform with a light-first public design language. The system uses neutral surfaces, thin borders, product media, and a single violet action color. Typography is mostly Inter, with Instrument Serif reserved for large editorial display moments.

## Color Use

Use `primary` for actions, selected states, links, and short emphasis. Do not use violet as a general background texture. Use `background`, `card`, and `border` to create most layout hierarchy.

Logo colors are separate from UI colors. `logo-lavender`, `logo-ink`, and `logo-cream` are for the Notra mark, wordmark, and brand asset presentation.

Dark mode keeps the same roles with darker surfaces. It should feel like the same system in lower light, not a separate neon palette.

## Typography Use

Inter is the default typeface for interface, prose, navigation, cards, pricing, legal copy, changelogs, and blog content. Instrument Serif is a display accent for hero headlines and rare editorial moments.

Use 400 for body, 500 for labels and supportive emphasis, and 600 for headings. Avoid heavier weights. Use negative letter spacing only on sans headings, not on body copy.

## Layout

Use a 4px spacing scale. Keep tight groups at 8-16px, card padding at 20-32px, section padding at 48-96px, and large hero rhythm at 96-128px.

Public pages should be product-led. Use screenshots, workflow previews, logo strips, pricing tables, docs, and changelog content as proof. Avoid abstract decoration when real product state can carry the page.

## Elevation

Depth comes from borders, neutral surfaces, and restrained shadows. Use shadows for floating navigation, menus, dialogs, and active controls. Use borders for cards, pricing, product frames, prose sections, and grids.

The violet `hero-gradient` is the only page-level atmospheric effect. Do not add extra gradient blobs or decorative background orbs.

## Shapes

Use tight radii. Default controls use `sm` or `md`. Product frames use `md`. Marketing CTAs use `squircle`. Navigation and brand cards may use `xl`. Pricing grids and table-like layouts use `none`. Pills, avatars, badges, and segmented controls use `full`.

## Voice

Copy should be concrete, short, and product-specific. Prefer direct outcomes such as "Turn shipped work into launch posts", "Draft changelogs from product updates", and "Write in your brand voice".

Avoid generic AI marketing language such as "revolutionize", "unlock", "supercharge", "seamless", "effortless", and "transform your workflow".

## Do's and Don'ts

- Use the tokens in this file before inventing new visual values.
- Keep violet scarce and role-based.
- Keep Instrument Serif special.
- Use product media as primary visual proof.
- Keep section structure crisp with borders and hatch texture.
- Do not use multiple accent colors for marketing emphasis.
- Do not use decorative gradients beyond `hero-gradient`.
- Do not nest cards inside cards.
- Do not center long-form prose.
- Do not remove visible focus states.
