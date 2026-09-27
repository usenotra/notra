---
version: alpha
name: Notra
description: Notra's brand and design system for humans and agents. Dualtone surfaces, violet #8B5CF6 as the action color, ink for type.
colors:
  primary: "oklch(0.6056 0.2189 292.7172)"
  primary-hex: "#8B5CF6"
  primary-foreground: "oklch(0.997 0 0)"
  ink: "#1E1E1E"
  lavender: "#C8B2EE"
  cream: "#F6F3F1"
  background: "hsl(0 0% 100%)"
  foreground: "hsl(0 0% 9%)"
  muted: "hsl(0 0% 96.1%)"
  muted-foreground: "hsl(0 0% 45.1%)"
  border: "hsl(0 0% 89.8%)"
  dark-background: "hsl(233 7% 8%)"
  series-search-light: "#8B5CF6"
  series-search-dark: "#9C87E3"
  series-memory-light: "#18929F"
  series-memory-dark: "#20ABBA"
---

# Notra

> Notra's brand and design system for humans and agents. The signature is dualtone: a muted shell with a lifted surface sitting on it. Violet `#8B5CF6` is the action color. Ink carries the type.

The system is light-first, precise, and quiet. Hierarchy comes from two fills and a hairline. Color is for action, selection, or a data series. Marketing can be larger. It uses the same two tones and the same violet.

## Canonical sources

| Surface | System | Source |
| --- | --- | --- |
| Marketing site | Satoshi display, pill CTAs, lavender hero wash | `apps/web` |
| Product UI | Dualtone modules, tables, Inter | `apps/dashboard`, `packages/ui` |
| Color tokens | Surfaces, violet, status, chart series | `packages/ui/src/styles/globals.css`, `packages/ui/src/styles/status.css` |
| Motion | Durations, easings, springs | `packages/ui/src/styles/motion.css`, `packages/ui/src/lib/motion.ts` |
| Brand assets | Mark, wordmark, swatches | [/brand](/brand) |

## Overview

Notra is a product for people who ship work and want it written in their voice. The interface should feel like a tool you can read at a glance: a label, a value, the thing under it.

Every decision serves that. Tight tracking on marketing headlines, a 1px border instead of a shadow, one violet for the action. Decoration does not earn a place.

Dark mode keeps the same roles on darker surfaces. It is the same system in lower light.

## Dualtone

A dualtone block is two stacked surfaces. The shell is `bg-muted` and holds the title, toolbar, or metrics. The body is `bg-card` or `bg-background`. It overlaps the shell and holds the content.

```html
<div class="overflow-hidden rounded-t-2xl border border-b-0 border-border bg-muted pb-5">
  <!-- label, toolbar, or metrics -->
</div>
<div class="relative -mt-5 rounded-2xl border border-border bg-card">
  <!-- content -->
</div>
```

| Shell | Overlap | Body | Use |
| --- | --- | --- | --- |
| `pb-5`, about 4.25rem tall | `-mt-5` (20px) | `bg-card` or `bg-background` | Tables, metric bands, compact modules |
| `pb-9`, `min-h-24`, `pt-4` | `-mt-9` (36px) | `bg-card`, 24px padding | Taller panels |
| `pb-5`, footer `pt-5` | `-mt-5` on body and footer | body `bg-background`, footer `bg-muted` | Tables with a footer band |

- Shell and body each have a 1px `border-border`. The shell has no bottom border. The body is `rounded-2xl`, so it reads as a card in a tray.
- One dualtone per group. Do not nest a dualtone block inside another.
- A block with no label band is a flat card: `bg-card` and one border. Do not add a muted tray to it.
- Table header cells sit on `bg-muted/80`. Body cells sit on `bg-background`. Hover uses `bg-muted/50`. The shared class is `TABLE_CHROME_CLASS` in `packages/ui/src/constants/table.ts`.
- Labels are `text-sm font-medium`. Readouts are `text-xs text-muted-foreground`. Aligned numbers use `tabular-nums`.

## Color

### Violet

The signature color is `#8B5CF6`, token `primary`, `oklch(0.6056 0.2189 292.7172)`. Use it for the primary action, links, the selected control, and the first data series.

A marketing band has one violet pill. In the product, the main action, links, and the selected control may use violet together. Body text stays ink or `foreground`.

### The mark

These three colors belong to the logo. They are not general UI fills.

| Name | Hex | Use |
| --- | --- | --- |
| Lavender | `#C8B2EE` | Fill of the mark |
| Ink | `#1E1E1E` | Stroke of the mark, marketing headlines |
| Cream | `#F6F3F1` | Tile behind the mark on a dark surface |

On a dark surface, place the mark on a cream tile. Do not recolor the mark, add a shadow, or draw it without the ink stroke.

Marketing heroes may wash one frame with lavender at 25% (`#C8B2EE40`, dark `#2a2140`). That wash is the hero frame only. Product screens stay on `background` and `muted`.

### Surfaces

Light is the default. Dark keeps the same roles.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `hsl(0 0% 100%)` | `hsl(233 7% 8%)` | Page |
| `foreground` | `hsl(0 0% 9%)` | `hsl(0 0% 98%)` | Primary text |
| `card` | white | `hsl(240 6% 10%)` | Lifted body |
| `muted` | `hsl(0 0% 96.1%)` | `hsl(0 0% 14.9%)` | Dualtone shell, secondary fill |
| `muted-foreground` | `hsl(0 0% 45.1%)` | `hsl(0 0% 63.9%)` | Secondary text |
| `border` | `hsl(0 0% 89.8%)` | `hsl(0 1% 17%)` | Hairline |
| `primary` | `#8B5CF6` | `#8B5CF6` | Action, links, selection |
| `primary-foreground` | near white | near white | Text on primary |
| `destructive` | `hsl(0 84.2% 60.2%)` | `hsl(358 100% 50%)` | Destructive action |

### Status and series

Status and chart colors share one lightness: about L 0.55 in light, about L 0.70 in dark. A badge, an arrow, and a stroke should look like one system.

| Token | Meaning | Light | Dark |
| --- | --- | --- | --- |
| `success` / `geo-up` | Success, up | `oklch(0.55 0.109 155)` | `oklch(0.7 0.125 155)` |
| `warning` / `geo-mid` | Warning, mid | `oklch(0.57 0.113 55)` | `oklch(0.7 0.125 55)` |
| `geo-down` | Down | `oklch(0.59 0.192 27)` | `oklch(0.7 0.138 27)` |
| `info` | Neutral information | `oklch(0.55 0.13 250)` | `oklch(0.7 0.12 250)` |
| `geo-search` | First series, own brand | `#8B5CF6` | `#9C87E3` |
| `geo-memory` | Second series | `#18929F` | `#20ABBA` |

Search violet and Memory teal stay on those two series. Further series start at orange `#E0632F`, then green, pink, gold, blue, gray.

Use status color as a foreground or a 10% tint (`bg-success/10 text-success`). Pair it with a label or an icon.

## Typography

| Role | Family | Use |
| --- | --- | --- |
| UI and body | Inter (`font-sans`) | Product UI, docs, marketing body |
| Marketing display | Satoshi (`font-display`) | Headlines, section titles, display buttons |
| Code and IDs | Geist Mono in the product, system mono elsewhere | Snippets, paths, identifiers |
| Editorial accent | Instrument Serif (`font-instrument`) | A rare word or pull quote |

Weights are 400 for body, 500 for labels and marketing subcopy, 600 for headings and metric values.

Marketing headlines are Satoshi medium, ink `#1E1E1E` in light and white in dark, with tracking `-0.015em` on heroes and `-0.02em` on section titles. Supporting lines use ink at about 75% opacity, or `white/70` in dark.

Product type stays in Inter. A module title is `text-sm font-medium`. A metric is `text-3xl` to `text-4xl`, semibold, `tabular-nums`, `tracking-tight`.

Sentence case for headings, buttons, and labels. Instrument Serif does not set a page title.

## Layout

Spacing is a 4px scale. Keep 8–16px inside a group, 20–32px of card padding, and 48–96px between marketing sections.

Center marketing content in a column near 1024–1200px. Product screens use the dashboard shell. Prose stays in a readable measure. Long text is left-aligned.

## Shape

| Element | Radius |
| --- | --- |
| Product buttons, inputs | `rounded-lg`, with `corner-squircle` on `[data-slot="button"]` |
| Dualtone shells, frames, empty states | `rounded-2xl` (16px) |
| Small chips | `rounded-md` |
| Marketing CTAs, avatars, pills | `rounded-full` |
| Marketing hero frame | `rounded-3xl` |

One radius family per view. A dualtone module is 16px. A marketing hero is a pill on a 24px frame.

## Elevation

Depth is the overlap of the two fills. Shadows are for things that float: menus, dialogs, popovers (`shadow-md` on an active popover). Dark mode drops product shadows. Do not add a drop shadow to a dualtone card.

Focus stays visible. Product controls use a 3px ring at `ring-ring/50` and `border-ring` on `:focus-visible`. Marketing CTAs use the same ring. Do not remove an outline unless a ring replaces it.

## Motion

Use the shared scale. The CSS utilities and `DURATION`, `EASE`, and `SPRING` in `@notra/ui/lib/motion` are the same numbers.

| Name | Duration | Use |
| --- | --- | --- |
| `instant` | 100ms | Menus, tooltips, selects |
| `fast` | 150ms | Hover, press, color |
| `normal` | 200ms | Expand, reveal, swap |
| `slow` | 300ms | Sidebar, accordion, drawer |
| `slower` | 500ms | A deliberate reveal |

`ease-out` is for small feedback. `ease-emphasized` (`cubic-bezier(0.22, 1, 0.36, 1)`) is for entrances. `ease-emphasized-in` is for exits. Springs: `indicator` for tab pills, `snappy` for list reorder, `gentle` for large surfaces.

Product buttons press to `scale(0.97)`. Disabled controls stay still. Honor `prefers-reduced-motion`: drop the transition and keep the end state.

Motion explains a change. A resting screen stays still.

## Components

**Product button.** Primary (`bg-primary`), then outline, secondary, ghost, destructive, and link. Default height is 32px (`h-8`).

**Marketing CTA.** A pill. `cta-gradient-primary` is violet, slightly darker toward the bottom, with white type. `cta-gradient-light` is a light fill with ink type. One primary pill per band.

**Module.** `flat` is a single card. `panel` and `table` are dualtone. The eyebrow is the label. The readout is a quiet number. The body is the content.

**Empty state.** Name what is missing and the first action. A faded preview of the real module is fine. A generic illustration is not.

**Icons.** Hugeicons, `currentColor`, 16px in controls, 14px beside a label. Brand and engine marks keep their own artwork.

## Voice

Copy is concrete and short. Lead with the thing the reader can do. Use numerals for counts and percents. Name an action with a verb and a noun when the object would otherwise be unclear.

Sentence case everywhere except product names. The wordmark is `Notra`.

Errors say what happened and what to do next. Toasts name the object that changed. Empty states point at the first action.

Skip filler: "revolutionize", "unlock", "supercharge", "seamless", "effortless", "transform your workflow".

## Do and don't

| Do | Don't |
| --- | --- |
| Build hierarchy with `muted` and `card` or `background` | Add a third gray to separate regions |
| Overlap the body onto the shell by 20px or 36px | Leave a gap between the two fills |
| Keep violet for the main action, links, selection, and the first series | Wash product pages in violet |
| Keep Memory teal on the second series | Reuse Search or Memory hues for another series |
| Use Inter in the product and Satoshi for marketing display | Set product UI in Satoshi or Instrument Serif |
| Use `tabular-nums` on aligned numbers | Let digits jump as values change |
| Keep one dualtone per group | Nest a card inside a dualtone body |
| Keep the focus ring | Signal state with color alone |

## Related

- [Brand guidelines](/brand)
- [Homepage](/)
- [llms.txt](/llms.txt)
