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
  muted-foreground: "hsl(240 4% 40%)"
  shell: "hsl(240 6% 94.5%)"
  shell-border: "hsl(240 5% 87%)"
  border: "hsl(0 0% 89.8%)"
  dark-background: "hsl(233 7% 8%)"
  destructive: "hsl(0 84.2% 60.2%)"
  geo-search: "var(--primary)"
  geo-memory: "oklch(0.606 0.099 206.2)"
  chart-search-light: "#8B5CF6"
  chart-search-dark: "#9C87E3"
  chart-memory-light: "#18929F"
  chart-memory-dark: "#20ABBA"
---

# Notra

> Design system for the Notra product. The signature is dualtone: a muted shell with a lifted surface sitting on it. Violet `#8B5CF6` is the action color. Inter carries the type.

This document covers the dashboard. The marketing site has its own file at [usenotra.com/design.md](https://www.usenotra.com/design.md).

The product is light-first and quiet. Hierarchy comes from two fills and a hairline. Color is for an action, a selection, or a data series. Dark mode keeps the same roles on darker surfaces.

## Canonical sources

| What | Source |
| --- | --- |
| Surfaces, violet, radius | `packages/ui/src/styles/globals.css` |
| Status color | `packages/ui/src/styles/status.css` |
| Chart hex | `apps/dashboard/src/constants/charts.ts` |
| Tables | `packages/ui/src/components/ui/data-table.tsx`, `packages/ui/src/constants/table.ts` |
| Modules | `apps/dashboard/src/components/instrument/instrument-module.tsx` |
| Buttons | `packages/ui/src/components/ui/button.tsx` |
| Motion | `packages/ui/src/styles/motion.css`, `packages/ui/src/lib/motion.ts` |

The tables below are the values to follow. The paths are for people working in the repo.

## Dualtone

A dualtone block is two stacked surfaces. The shell is `bg-shell` and holds the title, toolbar, or metrics. The body is `bg-card` or `bg-background`. It overlaps the shell and holds the content.

```html
<div class="overflow-hidden rounded-t-2xl border border-b-0 border-shell-border bg-shell pb-5">
  <!-- label, toolbar, or metrics -->
</div>
<div class="relative -mt-5 rounded-2xl border border-border bg-card shadow-lift">
  <!-- content -->
</div>
```

| Shell | Overlap | Body | Use |
| --- | --- | --- | --- |
| `pb-5`, about 4.25rem tall | `-mt-5` (20px) | `bg-card` or `bg-background` | Tables, metric bands, compact modules |
| `pb-9`, `min-h-24`, `pt-4` | `-mt-5` (20px), the extra shell padding keeps the label clear | `bg-card`, 24px padding | Taller panels |
| `pb-5`, footer `pt-5` | `-mt-5` on body and footer | body `bg-background`, footer `bg-shell` | Tables with a footer band |

- The shell has a 1px `border-shell-border` and no bottom border. The body has a 1px `border-border` and `shadow-lift`, which lifts it off the shell. The body is `rounded-2xl`, so it reads as a card in a tray.
- One dualtone per group. Do not nest a dualtone block inside another.
- A block with no label band is a flat card: `rounded-xl`, `bg-card`, and `ring-1 ring-foreground/10`. Do not add a muted tray to it.
- Every table uses the same frame: a `bg-shell` shell with a 1px `border-shell-border` and a 2px rim on all four sides (`TABLE_FRAME_CLASS`), around a lifted white body (`TABLE_BODY_CLASS`). Headers sit on the shell, body cells on `bg-background`, hover uses `bg-muted/50`.
- Use `DataTable` for bounded or paged lists and `InfiniteDataTable` for lists that load the next page on scroll. Use `DataTableSkeleton` while they load. The shadcn `Table` primitives render the same frame for one-off tables such as chat markdown. Do not restyle the frame with `className`.
- Table and flat eyebrows are `text-sm font-medium capitalize`. Panel titles are `text-base font-medium` and stay as written. Readouts are `text-xs text-muted-foreground`. Aligned numbers use `tabular-nums`.

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
| `muted` | `hsl(0 0% 96.1%)` | `hsl(0 0% 14.9%)` | Secondary fill, hover |
| `shell` | `hsl(240 6% 94.5%)` | `hsl(240 5% 14.5%)` | Dualtone shell |
| `shell-border` | `hsl(240 5% 87%)` | `hsl(240 4% 20%)` | Dualtone shell hairline |
| `muted-foreground` | `hsl(240 4% 40%)` | `hsl(0 0% 63.9%)` | Secondary text |
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
| `geo-search` | First series, own brand | `var(--primary)` | `oklch(0.68 0.134 292.717)` |
| `geo-memory` | Second series | `oklch(0.606 0.099 206.2)` | `oklch(0.68 0.111 206.2)` |

In UI, use the tokens (`bg-geo-search`, `text-geo-memory`). Canvas charts use the hex twins in `charts.ts`: Search `#8B5CF6` / `#9C87E3`, Memory `#18929F` / `#20ABBA`.

Search violet and Memory teal stay on those two series. Rival series, in order, are `#E0632F`, `#2E9E5B`, `#D4348B`, `#B68F3C`, `#3A6FF0`, `#6B6B75`. Account charts use a separate list in `ACCOUNT_SERIES_COLORS`, starting at `#358FF3`.

Use status color as a foreground or a 10% tint (`bg-success/10 text-success`). Pair it with a label or an icon.

## Typography

Inter is the theme sans (`--font-sans`). Geist Mono is the theme mono. Put `font-sans` on a surface that must be Inter. Put `font-mono` on code, paths, and identifiers.

| Role | Classes |
| --- | --- |
| Body | weight 400 |
| Label | weight 500, often `text-sm` |
| Metric | `text-3xl` to `text-4xl`, `font-semibold`, `tabular-nums`, `tracking-tight` |
| Page title | often `font-bold` |
| Table or flat eyebrow | `text-sm font-medium capitalize` |
| Panel title | `text-base font-medium` |

Write labels in sentence case. Table and flat eyebrows are then capitalized by the component. Panel titles stay as written.

## Layout

Spacing is a 4px scale. Keep 8–16px inside a group and 16–24px of padding inside a module body. The page is the dashboard shell. Long text is left-aligned.

## Shape

| Element | Radius |
| --- | --- |
| Buttons | Kit: `rounded-lg`, plus `corner-squircle` on `[data-slot="button"]`. Primary, secondary, outline, destructive: see Components |
| Inputs | `rounded-lg`. No squircle |
| Dualtone shells, frames, empty states | `rounded-2xl` (16px) |
| Small chips | `rounded-md` |
| Avatars, count pills | `rounded-full` |

One radius family per view. A dualtone module stays at 16px.

## Elevation

Depth is the overlap of the two fills. Shadows are for things that float: menus, dialogs, popovers (`shadow-md` on an active popover). Dark mode drops product shadows. Do not add a drop shadow to a dualtone card.

Focus stays visible. Buttons use a 3px ring at `ring-ring/50` and `border-ring` on `:focus-visible`. Inputs use a 2px ring. Do not remove an outline unless a ring replaces it.

## Motion

Use the shared scale. The CSS utilities and `DURATION`, `EASE`, and `SPRING` in `@notra/ui/lib/motion` are the same numbers.

| Name | Duration | Use |
| --- | --- | --- |
| `instant` | 100ms | Menus, tooltips, selects |
| `fast` | 150ms | Hover, press, color |
| `normal` | 200ms | Expand, reveal, swap |
| `slow` | 300ms | Sidebar, accordion, drawer |
| `slower` | 500ms | A deliberate reveal |

`ease-out` is for small feedback. `ease-emphasized` (`cubic-bezier(0.22, 1, 0.36, 1)`) is for entrances. `ease-emphasized-in` is for exits. Springs: `indicator` for tab pills, `indicatorFlat` for dense controls (no bounce), `snappy` for list reorder, `gentle` for large surfaces.

Buttons press to `scale(0.97)`. Disabled controls stay still. Honor `prefers-reduced-motion`: drop the transition and keep the end state.

Motion explains a change. A resting screen stays still.

## Components

**Button.** Variants are `default` (primary), `outline`, `secondary`, `ghost`, `destructive`, and `link`. Primary and secondary use the Depth style: a vertical gradient, a 1px top highlight, and a soft drop shadow (primary hovers with `brightness-110`). Primary, secondary, outline, and destructive use `corner-shape: squircle` with `rounded-[0.75rem]` where it is supported; the others stay `rounded-lg`. Default size is `h-8` (32px), `text-sm`, `font-medium`. Other heights are `h-6` (xs), `h-7` (sm), and `h-9` (lg). Icon buttons are `size-6` through `size-9`. Press scales to `0.97`. Disabled controls do not scale. The dashboard `@/components/button` re-exports the kit button.

**Module.** `flat` is the card above. `panel` and `table` are dualtone. The eyebrow is the label. The readout is a quiet number. The body is the content. The dualtone shell clears the card ring (`ring-0`) so only the two borders show.

**Empty state.** Name what is missing and the first action. A faded preview of the real module is fine. A generic illustration is not.

**Icons.** Hugeicons, `currentColor`, 16px in controls, 14px beside a label. Brand and engine marks keep their own artwork.

## Voice

Copy is concrete and short. Lead with the thing the reader can do. Use numerals for counts and percents. Name an action with a verb and a noun when the object would otherwise be unclear.

The product name is `Notra`.

| Rule | Do | Don't |
| --- | --- | --- |
| Case | Sentence case in copy. The module capitalizes its eyebrow. | Title Case on buttons and toasts |
| Numerals | `3 scans`, `12%` | "three scans" |
| Errors | What happened, then what to do | "Something went wrong" with no next step |
| Toasts | Name the object that changed | "Successfully updated" |
| Empty | Name the gap and the first action | A generic illustration with no action |
| Filler | Concrete verbs | "revolutionize", "unlock", "seamless", "effortless" |

## Do and don't

| Do | Don't |
| --- | --- |
| Build hierarchy with `muted` and `card` or `background` | Add a third gray to separate regions |
| Overlap the body onto the shell by 20px or 36px | Leave a gap between the two fills |
| Keep violet for the main action, links, selection, and the first series | Wash screens in violet |
| Keep Memory teal on the second series | Reuse Search or Memory hues for another series |
| Use `font-sans` for UI and `font-mono` for code | Set the product in a display serif |
| Use `DataTable` or `InfiniteDataTable` for every list | Build a table out of divs or restyle the table frame |
| Use `tabular-nums` on aligned numbers | Let digits jump as values change |
| Keep one dualtone per group | Nest a card inside a dualtone body |
| Keep the focus ring | Signal state with color alone |
