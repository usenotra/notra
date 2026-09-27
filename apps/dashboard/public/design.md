---
version: alpha
name: Notra
description: Design system for the Notra product UI. Dualtone surfaces, violet #8B5CF6 as the action color, Inter for type.
colors:
  primary: "oklch(0.6056 0.2189 292.7172)"
  primary-hex: "#8B5CF6"
  primary-foreground: "oklch(0.997 0 0)"
  background: "hsl(0 0% 100%)"
  foreground: "hsl(0 0% 9%)"
  card: "hsl(0 0% 100%)"
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

> Design system for the Notra product. The signature is dualtone: a muted shell with a lifted surface sitting on it. Violet `#8B5CF6` is the action color. Inter carries the type.

This document covers the dashboard. The marketing site has its own file at [usenotra.com/design.md](https://www.usenotra.com/design.md).

The product is light-first and quiet. Hierarchy comes from two fills and a hairline. Color is for an action, a selection, or a data series. Dark mode keeps the same roles on darker surfaces.

## Canonical sources

| What | Source |
| --- | --- |
| Surfaces, violet, radius | `packages/ui/src/styles/globals.css` |
| Status and series color | `packages/ui/src/styles/status.css` |
| Dualtone tables | `apps/dashboard/src/components/motion/table/table-surfaces.tsx` |
| Modules | `apps/dashboard/src/components/instrument/instrument-module.tsx` |
| Motion | `packages/ui/src/styles/motion.css`, `packages/ui/src/lib/motion.ts` |

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

The main action, links, and the selected control may use violet together. Body text stays `foreground`.

### Surfaces

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

Inter (`font-sans`) sets the product: UI, headings, and body. Geist Mono sets code, paths, and identifiers.

Weights are 400 for body, 500 for labels, 600 for headings and metric values.

A module title is `text-sm font-medium`. A metric is `text-3xl` to `text-4xl`, semibold, `tabular-nums`, `tracking-tight`.

Sentence case for headings, buttons, and labels.

## Layout

Spacing is a 4px scale. Keep 8–16px inside a group and 16–24px of padding inside a module body. The page is the dashboard shell. Long text is left-aligned.

## Shape

| Element | Radius |
| --- | --- |
| Buttons, inputs | `rounded-lg`, with `corner-squircle` on `[data-slot="button"]` |
| Dualtone shells, frames, empty states | `rounded-2xl` (16px) |
| Small chips | `rounded-md` |
| Avatars, count pills | `rounded-full` |

One radius family per view. A dualtone module stays at 16px.

## Elevation

Depth is the overlap of the two fills. Shadows are for things that float: menus, dialogs, popovers (`shadow-md` on an active popover). Dark mode drops product shadows. Do not add a drop shadow to a dualtone card.

Focus stays visible. Controls use a 3px ring at `ring-ring/50` and `border-ring` on `:focus-visible`. Do not remove an outline unless a ring replaces it.

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

Buttons press to `scale(0.97)`. Disabled controls stay still. Honor `prefers-reduced-motion`: drop the transition and keep the end state.

Motion explains a change. A resting screen stays still.

## Components

**Button.** Primary (`bg-primary`), then outline, secondary, ghost, destructive, and link. Default height is 32px (`h-8`).

**Module.** `flat` is a single card. `panel` and `table` are dualtone. The eyebrow is the label. The readout is a quiet number. The body is the content.

**Empty state.** Name what is missing and the first action. A faded preview of the real module is fine. A generic illustration is not.

**Icons.** Hugeicons, `currentColor`, 16px in controls, 14px beside a label. Brand and engine marks keep their own artwork.

## Voice

Copy is concrete and short. Lead with the thing the reader can do. Use numerals for counts and percents. Name an action with a verb and a noun when the object would otherwise be unclear.

Sentence case everywhere except the product name `Notra`.

Errors say what happened and what to do next. Toasts name the object that changed. Empty states point at the first action.

Skip filler: "revolutionize", "unlock", "supercharge", "seamless", "effortless", "transform your workflow".

## Do and don't

| Do | Don't |
| --- | --- |
| Build hierarchy with `muted` and `card` or `background` | Add a third gray to separate regions |
| Overlap the body onto the shell by 20px or 36px | Leave a gap between the two fills |
| Keep violet for the main action, links, selection, and the first series | Wash screens in violet |
| Keep Memory teal on the second series | Reuse Search or Memory hues for another series |
| Use Inter for UI and Geist Mono for code | Set the product in a display serif |
| Use `tabular-nums` on aligned numbers | Let digits jump as values change |
| Keep one dualtone per group | Nest a card inside a dualtone body |
| Keep the focus ring | Signal state with color alone |
