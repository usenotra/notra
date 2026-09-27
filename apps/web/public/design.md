---
version: alpha
name: Notra
description: Notra's design system for people and agents. Dualtone surfaces, one violet action color, and GEO as the reference for new product UI.
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
  geo-search-light: "#8B5CF6"
  geo-search-dark: "#9C87E3"
  geo-memory-light: "#18929F"
  geo-memory-dark: "#20ABBA"
---

# Notra

> Dualtone surfaces, one violet for action, ink for type. GEO is the reference for new product UI. Marketing may be louder. It still uses the same two tones and the same violet.

This file is the public design system. Agents building or restyling Notra surfaces should follow it. When this file and a one-off class disagree, the GEO dashboard is the newer source.

## Where it lives

| Surface | What to copy | Source |
| --- | --- | --- |
| Marketing site | Display type, pills, lavender wash | `apps/web` |
| Dashboard, including GEO | Dualtone modules, tables, charts | `apps/dashboard` |
| Shared UI | Tokens, buttons, table chrome, status color | `packages/ui` |
| GEO signals | Search, Memory, up, mid, down | `packages/ui/src/styles/status.css` |
| Motion | Durations, easings, springs | `packages/ui/src/styles/motion.css`, `packages/ui/src/lib/motion.ts` |
| Logo, wordmark, swatches | Downloadable assets | [/brand](/brand) |

## Overview

Notra shows how a brand shows up in AI answers. The interface should read like an instrument: a label, a number, the evidence under it.

Hierarchy comes from two fills and a hairline, not from extra color. The muted fill is the shell. The page or card fill is the body that sits on top of it. That pair is the dualtone look. Violet marks the action, the selected state, or the brand's own series. It does not paint large fields.

## Dualtone

A dualtone block is two stacked surfaces. The top is `bg-muted` and holds the title, toolbar, or metrics. The body is `bg-card` or `bg-background`, overlaps the shell, and holds the data.

```html
<div class="overflow-hidden rounded-t-2xl border border-b-0 border-border bg-muted pb-5">
  <!-- label, toolbar, or metrics -->
</div>
<div class="relative -mt-5 rounded-2xl border border-border bg-card">
  <!-- the thing the label is about -->
</div>
```

Use these overlaps:

| Shell | Overlap | Body fill | Where |
| --- | --- | --- | --- |
| `pb-5`, height about 4.25rem | `-mt-5` | `bg-card` or `bg-background` | Tables, traffic hero, compact modules |
| `pb-9`, `min-h-24`, `pt-4` | `-mt-9` | `bg-card`, padding 24px | Taller instrument panels |
| `pb-5`, then a footer `pt-5` | `-mt-5` on body and footer | body `bg-background`, footer `bg-muted` | Tables with a footer band |

Rules:

- The shell and the body each get their own 1px `border-border`. The shell drops its bottom border. The body is fully rounded (`rounded-2xl`) so the overlap reads as a card sitting in a tray.
- Radius on these shells is `rounded-2xl` (16px). Do not mix that with a sharp corner on the same block.
- One dualtone per group. Do not put a dualtone module inside another dualtone module.
- A block with no label band is a flat card (`bg-card`, one border). Do not invent a muted tray for it.
- Table cells stay on `bg-background`. The header row stays on `bg-muted/80`. Hover tints the row with `bg-muted/50`. The shared chrome class is `TABLE_CHROME_CLASS` in `packages/ui/src/constants/table.ts`.
- Numbers in these modules use `tabular-nums`. Labels are `text-sm font-medium`. Readouts are `text-xs text-muted-foreground`.

GEO traffic, citation tables, and instrument modules are the reference. Copy those before designing a new card.

## Color

### The mark

These three colors belong to the logo. They are not UI tokens.

| Name | Hex | Use |
| --- | --- | --- |
| Lavender | `#C8B2EE` | Fill of the mark |
| Ink | `#1E1E1E` | Stroke of the mark, marketing headlines |
| Cream | `#F6F3F1` | Tile behind the mark on a dark surface |

On a dark surface, put the mark on a cream tile. Do not recolor the mark, add a shadow, or draw it without the ink stroke.

Marketing heroes may wash a panel with lavender at 25% (`#C8B2EE40`, dark `#2a2140`). That wash is for the hero frame only. Product screens stay on `background` and `muted`.

### UI color

Light is the default. Dark keeps the same roles.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `hsl(0 0% 100%)` | `hsl(233 7% 8%)` | Page |
| `foreground` | `hsl(0 0% 9%)` | `hsl(0 0% 98%)` | Primary text |
| `card` | white | `hsl(240 6% 10%)` | Lifted body |
| `muted` | `hsl(0 0% 96.1%)` | `hsl(0 0% 14.9%)` | Dualtone shell, secondary fill |
| `muted-foreground` | `hsl(0 0% 45.1%)` | `hsl(0 0% 63.9%)` | Secondary text |
| `border` | `hsl(0 0% 89.8%)` | `hsl(0 1% 17%)` | Hairline |
| `primary` | `oklch(0.6056 0.2189 292.7172)` | same | Action, links, brand series |
| `primary-foreground` | near white | near white | Text on primary |
| `destructive` | `hsl(0 84.2% 60.2%)` | `hsl(358 100% 50%)` | Destructive action |

`primary` is `#8B5CF6`. One primary action per view. Links and a selected control may use it too. Body text stays ink or `foreground`.

### GEO signals

Search, Memory, and the up / mid / down states share one lightness: about L 0.55 in light, about L 0.70 in dark. A badge, an arrow, and a chart stroke should look like one system.

| Token | Meaning | Light | Dark |
| --- | --- | --- | --- |
| `geo-search` | Search, and our own brand | `var(--primary)` / `#8B5CF6` | `#9C87E3` |
| `geo-memory` | In knowledge, ungrounded | `#18929F` | `#20ABBA` |
| `geo-up` | Up, same as `success` | `oklch(0.55 0.109 155)` | `oklch(0.7 0.125 155)` |
| `geo-mid` | Mid, same as `warning` | `oklch(0.57 0.113 55)` | `oklch(0.7 0.125 55)` |
| `geo-down` | Down | `oklch(0.59 0.192 27)` | `oklch(0.7 0.138 27)` |

Search violet and Memory teal are reserved. Competitor and "other" series start at orange `#E0632F`, then green, pink, gold, blue, gray. Do not reuse Search or Memory for a rival.

Status color is a foreground or a 10% tint (`bg-success/10 text-success`), same as destructive. Pair it with a label or an arrow. Color alone is not the state.

`info` is `oklch(0.55 0.13 250)` in light and `oklch(0.7 0.12 250)` in dark. Use it for neutral information, not for emphasis.

## Typography

| Role | Family | Where |
| --- | --- | --- |
| UI and body | Inter (`font-sans`) | Dashboard, docs, marketing body |
| Marketing display | Satoshi (`font-display`) | Headlines, section titles, display buttons |
| Code and IDs | Geist Mono in the dashboard, system mono elsewhere | Snippets, paths, model ids |
| Editorial accent | Instrument Serif (`font-instrument`) | A rare word or pull quote |

Weights: 400 body, 500 labels and marketing subcopy, 600 headings and metric values. Do not go heavier.

Marketing headlines use Satoshi medium, tight tracking (`-0.015em` on heroes, `-0.02em` on section titles), ink `#1E1E1E` in light and white in dark. Supporting lines use `#1E1E1E` at about 75% opacity, or `white/70` in dark.

Product type stays in Inter. Section titles inside a module are `text-sm font-medium`, sentence case, often capitalized via the `capitalize` class on instrument eyebrows. Metric values are `text-3xl` to `text-4xl`, semibold, `tabular-nums`, `tracking-tight`.

Instrument Serif is optional and scarce. Do not set a page title in it.

## Shape

| Element | Radius |
| --- | --- |
| Product buttons, inputs | `rounded-lg`, with `corner-squircle` on `[data-slot="button"]` |
| Dualtone shells, product frames, empty states | `rounded-2xl` |
| Small chips inside a module | `rounded-md` |
| Marketing CTAs, avatars, pills | `rounded-full` |
| Marketing hero frame | `rounded-3xl` |

Keep one radius family in a view. A dualtone module is 16px. A marketing hero is a pill button on a 24px frame. Do not drop a squircle button into a sharp grid.

## Elevation

The overlap is the depth. Shadows are for things that float: menus, dialogs, popovers, the active chart popover (`shadow-md`). Dark mode flattens product shadows to none. Do not add a drop shadow to a dualtone card to make it "lift". The muted tray already does that.

Focus stays visible. Product controls use a 3px ring at `ring-ring/50` plus a `border-ring` on focus-visible. Marketing CTAs use `ring-ring/50` at 3px. Do not remove an outline without a ring that replaces it.

## Motion

Use the shared scale. CSS utilities (`duration-fast`, `ease-emphasized`) and `DURATION` / `EASE` / `SPRING` in `@notra/ui/lib/motion` are the same numbers.

| Name | Duration | Use |
| --- | --- | --- |
| `instant` | 100ms | Menus, tooltips, selects |
| `fast` | 150ms | Hover, press, color |
| `normal` | 200ms | Expand, reveal, swap |
| `slow` | 300ms | Sidebar, accordion, drawer |
| `slower` | 500ms | A deliberate reveal: score, onboarding |

Easings: `ease-out` for small feedback, `ease-emphasized` (`cubic-bezier(0.22, 1, 0.36, 1)`) for entrances, `ease-emphasized-in` for exits. Springs: `indicator` for tab pills, `snappy` for list reorder, `gentle` for large surfaces.

Product buttons press to `scale(0.97)`. Disabled controls do not scale. Honor `prefers-reduced-motion`: drop the transition, keep the end state.

Motion explains a change. It does not decorate a resting screen.

## Components

**Product button.** One primary (`bg-primary`), then outline, secondary, ghost, destructive, link. Default height is 32px (`h-8`). Do not invent a sixth color.

**Marketing CTA.** Pill, `cta-gradient-primary` (violet, slightly darker toward the bottom) with white type, or `cta-gradient-light` with ink type. One primary pill per band.

**Instrument.** `flat` is a normal card. `panel` and `table` are dualtone. The eyebrow is the label. The readout is a quiet number. The body is the evidence.

**Empty.** Say what is missing and the first action. "No activity yet" plus how to install the tracker. A faded preview of the real module is fine. A generic illustration is not.

**Icons.** Hugeicons, `currentColor`, 16px in controls, 14px for inline hints. Engine marks keep their own artwork.

## Voice

Write the concrete thing. "Mention rate", "in knowledge", "cited in answer", "search only". Spell GEO as Generative Engine Optimization on first use for a new reader, then GEO.

Sentence case for headings, buttons, and labels. Numerals for counts and percents. Name the action with a verb and a noun when the object is not obvious.

Avoid "revolutionize", "unlock", "supercharge", "seamless", "effortless", and "transform your workflow".

Errors say what happened and what to do next. Toasts name the object that changed. Empty states point at the first action.

## Do and don't

| Do | Don't |
| --- | --- |
| Build hierarchy with `muted` + `card` / `background` | Add a third gray to separate regions |
| Overlap the body onto the shell by 20px or 36px | Stack the two fills with a gap |
| Keep violet for the action and the Search series | Wash product pages in violet |
| Keep Memory teal for that series only | Recolor a competitor in Search violet |
| Use Inter in the product, Satoshi for marketing display | Set dashboard UI in Satoshi or Instrument Serif |
| Use `tabular-nums` on aligned numbers | Let digits jump as values change |
| Copy a GEO module before inventing a card | Nest a card inside a dualtone body |
| Keep focus rings | Rely on color alone for state |

## Related

- [Brand guidelines](/brand)
- [Homepage](/)
- [llms.txt](/llms.txt)
