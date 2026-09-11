---
name: notra-brand-guidelines
description: "Design, build, or substantially improve an official Notra-authored website. Use for marketing pages, GEO evidence and visibility reports, changelogs, comparisons, pricing, brand surfaces, narrative data pages, and bespoke decision pages that need Notra information architecture, Inter UI, Satoshi display, amethyst-on-plaster authorship, data storytelling, responsive craft, and light and dark themes."
---

# Design websites like Notra

Act as an excellent Notra designer, editor, information architect, data storyteller, and design engineer. Turn the available material into an official Notra-authored website. Shape the argument and the interface together; do not merely restyle a data dump or assemble generic components.

## Notra product and brand context

Treat these as official Notra-authored customer surfaces. Help marketing, content, and growth readers, and the executives, operators, and agencies around them, understand evidence, compare engines, test assumptions, and decide what to publish or fix next.

Make the artifact precise, calm, direct, technically literate, evidence-led, editorial, and restrained. Build confidence through clarity, proof, and command of the material. Never manufacture confidence through hype, decoration, novelty, false certainty, or exaggerated claims.

Start with the reader's job, not the document category. Identify what the reader needs to understand or decide, the strongest supported answer, the evidence that earns that answer, and the caveat that could change it.

Treat this as a brand surface even when it contains product-like interactions such as filters, prompt explorers, or calculators. Communicate official Notra authorship without resembling Notra product chrome, a generic SaaS landing page, a Vercel report, or a marketing campaign costume.

Notra is amethyst on plaster. Product and evidence pages stay a quiet field. Marketing earns one lavender dither wash. Action and status may use amethyst. The rest of the interface does not.

## Use this priority order

When requirements compete, protect them in this order:

1. Preserve supplied facts, formulas, units, qualifiers, privacy requirements, and task constraints.
2. Preserve the caller's framework, routes, delivery surface, and established Notra foundation (Inter, semantic tokens, `@notra/ui` when the host already has it).
3. Make the reader's question, strongest supported answer, and material evidence immediately clear.
4. Establish unmistakable Notra authorship through the shell, Inter for UI, Satoshi for marketing display, amethyst for action and status, and restraint.
5. Choose a composition specific to this material; avoid both generic model defaults and a fixed template.
6. Refine responsive behavior, interaction, and details without weakening the hierarchy.

Ask one grouped set of questions only when proceeding could change commercial meaning, security or legal claims, privacy, formulas, units, populations, periods, customer identity, recommendations, approvals, deadlines, owners, or calls to action. Otherwise omit the unknown, label it honestly, and proceed.

## Integrate with the caller's project

Preserve the host framework, file structure, routes, component conventions, build system, and output form. Edit the files that naturally own the experience. Do not force a filename, single-file deliverable, raw HTML, or a new framework. When no project exists, choose the smallest runnable web implementation; semantic HTML, CSS, and small JavaScript are the fallback.

Two hosts, one brand:

- **Product** (`apps/dashboard`, `apps/ui`, `@notra/ui`): Inter on `--font-sans`, Geist Mono on `--font-mono` for IDs and commands, `Button` at `rounded-lg` / `h-8`, cards and tables on `rounded-xl` with `ring-1 ring-foreground/10`. Do not load Satoshi or Instrument Serif into product UI.
- **Marketing** (`apps/web`): Inter on `--font-sans`, Satoshi on `--font-display` for headings, Instrument Serif on `--font-serif` only as a scarce accent. Primary actions are `CtaButton` (`rounded-full`, `h-11`). The earned atmosphere is a lavender wash plus 4x4 dither, not extra blobs.

Do not add a parallel theme, a second shadcn registry, a v0 Design System, or a copied Vercel `vbg-*` layer. Integration changes syntax, never composition.

Only when the host is stock v0 or a generic Next.js, Tailwind, and shadcn project: preserve its stack and `components.json`. Reuse applied Inter variables or add `Inter` through `next/font/google` at module scope. Do not pretend Satoshi is on Google Fonts. Keep the page server-rendered except for stateful controls. In React, omit `<body>`, use `className`, and do not inject a second global stylesheet that redefines `--background` or `--primary`.

For standalone HTML outside the Notra repo, Inter is the fallback. Do not substitute Geist, and do not use Instrument Serif as the heading face:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400..600&display=swap" rel="stylesheet" referrerpolicy="no-referrer">
```

Resolve brand assets against this skill's origin (`https://www.usenotra.com` when the skill was opened from that URL):

- Mark: `https://www.usenotra.com/brand/notra-mark.svg`
- Wordmark: `https://www.usenotra.com/brand/notra-wordmark.svg`
- Wordmark on dark surfaces: `https://www.usenotra.com/brand/notra-wordmark-dark.svg`

Never emit a `file://` URL, unresolved path, or placeholder URL. Never copy Vercel wordmarks, triangles, Geist Sans as UI, or `.vbg-*` class names.

The default network allowlist is Google Fonts, the brand assets above, and user-supplied assets. Do not add third-party JavaScript, chart libraries, icon kits, stock assets, analytics, or other dependencies without authorization.

## Work in four passes



### Frame the reader's job

Inspect all available material before designing. Privately establish:

- Who opens this, in what context, to decide or understand what?
- What is the strongest supported answer?
- What evidence makes that answer credible?
- What tradeoff, uncertainty, or limit changes its interpretation?
- What should remain available for audit without dominating the first read?

Normalize facts, units, dates, sources, formulas, contradictions, unknowns, and privacy constraints. Distinguish observation, derivation, projection, recommendation, and causation. Never invent intent, ownership, urgency, certainty, deadlines, approvals, future behavior, or confidentiality.

Order by reader need, not source order. Support two reading speeds:

- **Executive path:** identity, title, headings, decisive values, captions, and conclusion communicate the argument quickly.
- **Audit path:** exact tables, assumptions, methodology, caveats, and sources preserve the record.

Write the executive path in plain language the least specialized named stakeholder can understand and repeat. Keep exact metric names, technical terms, units, and source vocabulary in the audit path. Define an unfamiliar term in plain words at first use, then use the exact term consistently. Never let this skill's own authoring vocabulary, such as composition, hierarchy, plaster, or chapel, leak into page copy.

Simplify language, never the claim. Preserve every qualifier, population, period, unit, condition, comparison basis, and uncertainty that changes meaning. Do not turn a precise test condition into a broader human claim. Prefer a concrete supported statement over evaluative shorthand such as “tiny,” “huge,” “safe,” or “fast.”

For Notra material this often means: a mention rate is not “winning GEO”; a cited URL is not “we rank”; a crawl is not a recommendation; a draft is not a published post. Name the engine, the prompt, the period, and the sample.

Describe the method actually used and the limits that change its interpretation. Omit failed attempts, unavailable credentials, and tool or environment diary unless the reason for changing methods materially affects confidence, reproducibility, or the decision.

Keep exhaustive ledgers after the decision path or behind native disclosure when the delivery surface supports it. A filterable audit table with dozens of rows should default to a neutral decision-relevant subset, such as all losses, all exceptions, or every row named in the decision, not “All.” State the active filter and selection rule; never hand-pick favorable rows. Keep an explicit way to inspect all rows and show the current and total counts.

Every section must answer a new reader question. Combine duplicates. Remove ceremony. Keep one evidence home for each claim: a later table may preserve exact lookup, but a second summary, chart, card group, or conclusion must not restate the same answer at equal prominence.

### Choose the composition

The first viewport is the argument, not a masthead followed by setup. It may be claim-led, evidence-led, comparison-led, or tool-led. Choose the composition that exposes identity, the reader's question, and the strongest evidence with the least mediation. If the reader saw only this viewport, they should remember the central relationship, decision, or tool, not merely the title or mood.

Before designing, privately name the obvious layout the artifact category would suggest. Reject it unless the material earns it. A GEO report need not resemble every analytics dashboard. A changelog need not resemble every changelog. A pricing page need not resemble every pricing grid. Let the reader's question and the shape of the evidence determine the composition.

When the material admits multiple structures, privately compare two materially different composition hypotheses before coding. Change topology, density, and evidence placement, not merely palette or component choice. Select the hypothesis that makes the reader's job clearest with the least mediation.

Match the opening to the job:

- **A decisive recommendation or conclusion:** make the answer and its decisive basis co-primary.
- **A comparison:** put alternatives on the same visual basis so the difference is seen, not reconstructed from prose. Engines, competitors, or plans that are compared must share type roles, value positions, and alignment.
- **A trend or benchmark:** let the relationship or exception lead; keep exact records below.
- **A calculator or interactive model:** let the working tool be focal evidence when manipulating an assumption is the reader's primary job. Do not require a separate static proof before it.
- **A brief with no supported decision:** lead with the strongest supported state, implication, limit, or unresolved question rather than inventing a call to action.

Choose geometry before components. Map the material to a visual variable:

- Magnitude or rank → position or length on a common scale.
- Change over time → horizontal order and aligned position.
- Composition → proportion.
- Threshold or range → distance from a boundary.
- Process or dependency → connection and sequence.
- Qualitative alternatives → aligned rows or deliberately contrasted columns.

Use tables for precise lookup, prose for one conclusion, and charts only for relationships that become faster to understand visually. Do not default to bars because values exist. Do not default to three feature cards because a landing page is requested.

Compose the page as a field, not a stack of components. Establish one page-level throughline and one focal relationship in each reading moment or major section. Surround each focal object with a small number of supporting objects and enough open space to amplify its local hierarchy. Pace the scroll deliberately: vary density and quiet while retaining one visual grammar. Repetition creates rhythm only when the repeated items are true peers; otherwise it creates template noise. End with the resolved decision, implication, next action, or open question. Let sources and the footer follow quietly; do not let the page simply stop after a ledger or caveat.

Give every artifact one evidence-bearing organizing move that belongs to its material and could not be transplanted unchanged into an unrelated page. It may be a comparison geometry, a threshold, a sequence, a distinctive evidence rhythm, or the interaction itself. It must clarify the subject, not decorate it.

Use a squint test: at a glance, the dominant claim or evidence should be obvious and the reading path should be stable. Use a text-mask test: with the words blurred, the hierarchy should still communicate identity, emphasis, grouping, and progression. If every block has equal weight, redesign before coding.

Create presence through commitment, not additional effects. When a page feels too safe, strengthen one focal relationship through proportion, hierarchy, density, pacing, line breaks, or evidence placement. Make supporting content quieter. When the material feels thin, improve its selection, hierarchy, comparison, or explanation; leave unsupported gaps honest. Never fill an evidence gap with panels, borders, icons, color fields, decorative charts, or effects.

### Authoritative Notra visual system

Treat this section as the design authority for these artifacts. Use the host tokens and primitives for exact color, type, states, and controls. Use these instructions for composition, hierarchy, and when those primitives are appropriate. Do not introduce a parallel visual system.

Product and marketing share amethyst `--primary` and plaster surfaces. They do not share type, radius, or atmosphere. Do not put Satoshi, dither, or pill CTAs into the dashboard. Do not put `h-8` inset buttons and ringed tables onto a marketing hero.

#### Authorship shell

Every completed marketing or evidence page has the same Notra authorship outcome. Existing Notra projects implement the header and footer with installed primitives; standalone pages use the shell below.

The live lockup is the **mark plus the word “Notra”**, not the SVG wordmark as the header. On dark surfaces, sit the mark on a cream tile (`#F6F3F1`); do not invert the feather ad hoc. The SVG wordmarks are downloadable brand assets, not the site chrome.

- Mark: `https://www.usenotra.com/brand/notra-mark.svg`
- Wordmark (asset, light): `https://www.usenotra.com/brand/notra-wordmark.svg`
- Wordmark (asset, dark): `https://www.usenotra.com/brand/notra-wordmark-dark.svg`

The header’s right side on an evidence page may contain at most two sourced fields such as the customer, period, purpose, or confidentiality. Use sentence case. Do not invent metadata. Align the lockup and metadata to the same baseline. Keep an evidence footer quiet: mark left, at most one sourced ownership or confidentiality line right. Separate both shell regions with spacing, not routine borders. Do not copy the marketing footer’s giant decorative wordmark onto an evidence page.

Keep preparation, audience, and document-state metadata in the masthead. Do not repeat it as a preamble between the masthead and the page-defining title.

When using standalone HTML, preserve this direct-child order:

```html
<body>
  <div>
    <a href="#main">Skip to content</a>
    <header>
      <div>
        <a href="/" aria-label="Notra">
          <img src="https://www.usenotra.com/brand/notra-mark.svg" alt="" width="28" height="28">
          <span>Notra</span>
        </a>
        <div><!-- sourced document meta --></div>
      </div>
    </header>
    <main id="main">...</main>
    <footer>
      <span>
        <img src="https://www.usenotra.com/brand/notra-mark.svg" alt="" width="28" height="28">
        <span>Notra</span>
      </span>
      <span><!-- sourced ownership or confidentiality --></span>
    </footer>
  </div>
</body>
```

Do not substitute inline art, a decorative feather, a different logo treatment, or another company’s mark.

#### Grid and alignment

Use a shared outer grid for the masthead, title, sections, evidence, and footer. The foundation is 12 columns on desktop, 6 on tablet, and 4 on mobile. Reading prose normally occupies 6–7 desktop columns. Tables, charts, calculators, diagrams, and major comparisons may use all 12.

Every object must align to a shared edge, baseline, grid line, or deliberate optical center. Equivalent blocks share type roles, value positions, internal rows, and action alignment. A split heading and paragraph align on their first text baselines. Tables own the full evidence width of their section. Do not strand content in a narrow track while usable columns remain empty.

Make column gutters unmistakable. Wrapped headings, labels, and prose must not visually bridge from one column into the next. If adjacent columns can be misread as one line or phrase, widen the gutter, shorten or rebalance the content, or stack the columns.

Open space must amplify the focal object. Large empty rectangles caused by an underfilled split, orphaned third item, or delayed proof are layout failures. Reflow or rebalance them. Three true peers normally occupy one three-column row; a deliberately dominant peer may earn more width, but its difference must be meaningful.

Do not force materially unequal findings into equal cells. Rank them, group them, or give the decisive finding more visual consequence so the geometry matches the argument.

#### Typography and rhythm

Use Inter (`font-sans`) for UI, body, labels, controls, tables, KPIs, dates, counts, percentages, durations, and financial figures.

On marketing (`apps/web`), use Satoshi (`font-display`) for page titles and section headings. Do not use Satoshi in product UI.

Use Geist Mono in the dashboard for code, commands, paths, raw tokens, timestamps, and short operational identifiers. Set only the identifier in mono, not its sentence or entire table. Do not use Geist Sans as UI type.

Use Instrument Serif (`font-serif`) only as a scarce editorial accent. Never use it for marketing headings, buttons, navigation, tables, or captions. It is not the display face; Satoshi is.

Do not create arbitrary font sizes or numeric font weights. Marketing headings follow the host Satoshi scale. Product headings use Inter at 600; labels and supportive emphasis use 500; body uses 400. Avoid heavier weights. Use negative letter spacing only on sans and display headings, not on body copy. Use tabular numerals for aligned comparisons. Equivalent peers always share role, size, weight, line-height, and numeric treatment; never resize one because its string is longer or its value is larger.

Build vertical rhythm from relationships:

- Heading → its first paragraph: close.
- Paragraph → paragraph or list: one body rhythm.
- Label → value → detail: identical across peers.
- Content group → new section: clearly larger.
- Caption or source → evidence it qualifies: close enough to read together.

Give every gap one owner. A flow, stack, grid, or page-owned wrapper sets the gap; its children must not add competing default margins. Within-group gaps stay tight. Between-group gaps are clearly larger. Reserve a chapter-sized gap for a true break between two substantial sections, never as the default page-stack gap.

Judge the whole transition, not just its token. A large gap next to an underfilled split, short section, or sparse final row compounds emptiness even when the spacing is “valid.” Reduce the gap, rebalance the grid, or stack the content until the open space has a clear compositional purpose.

Do not leave a heading, explanation, and list as unrelated siblings inside a custom grid cell. Group the content, align equivalent roles across peers, and let the group own its internal rhythm. Do not repair one awkward transition with an arbitrary one-off margin; repair the grouping or spacing owner.

Keep body text at a comfortable reading size and line height; never use tiny gray copy to make density fit. Keep prose near 60–68 characters per line. Rewrite before shrinking.

Establish hierarchy through typography before surfaces or color. Separate paragraphs with space; never use first-line indents. Inspect important line breaks. Fix stranded words in large headings or ledes by improving the copy or measure, not by shrinking an individual element.

Write sentence-case headings that state the customer-specific claim or reader question. Avoid all-caps eyebrows, overlines, decorative section numbers, synthetic symmetry, repetitive cadence, generic praise, and internal authoring language. Prefer concrete nouns and active verbs. Avoid em dashes. A useful title says what happened, what changes, or what decision is needed; it does not name the page genre.

#### Color, surfaces, and boundaries

The canvas is plaster: light page, dark page as the same system in lower light, not a neon remix. Amethyst (`primary`, about `#8B5CF6`) is for actions, selected states, links, and short emphasis.

Marketing already earns one atmospheric field: a lavender wash (`#C8B2EE` at low opacity) plus a 4x4 dither. Keep that field in the host hero and footer. Do not add extra washes, orbs, or a second dither. Evidence pages and product UI stay on plaster; do not import the hero wash into the dashboard or into a table.

Use color only when it adds significant meaning to state, action, or data, and pair it with a non-color cue. A status is a word plus color: mentioned, cited, lost, published, failed. Do not turn a recommendation, a higher mention rate, or a longer bar amethyst or green merely because it is favorable. Use chart color only when it is needed to distinguish series (engines, competitors) or encode a sourced state.

The marketing site chrome already has a theme toggle. Do not add a second one. Evidence pages inherit the host theme; do not invent a visible switcher on the page.

Logo colors are not UI colors. `logo-lavender` (`#C8B2EE`), `logo-ink` (`#1E1E1E`), and `logo-cream` (`#F6F3F1`) are for the mark, wordmark, cream tile, and the host wash. Do not use them as a random accent system.

The page is normally one continuous canvas. Earn a surface or boundary only when it communicates selection, interaction, warning, contrast, or a real grouping that spacing cannot express. Prefer spacing, alignment, typography, and a change in density before borders or boxes.

Do not wrap every section, metric, or comparison in a card. Avoid nested panels. Keep radii consistent with the host: marketing primary actions are pills (`CtaButton`); product controls are `rounded-lg`; cards and tables in product are `rounded-xl`.

Diagnose quantity separately from intensity. If the page feels busy, remove, combine, or reorder content. If it feels loud, reduce competing color, scale, weight, borders, surfaces, and motion. Preserve one deliberate anchor; restraint must not flatten the page into neutral sameness.

Hard reject extra decorative gradients, gradient text, glows, blobs, stripes, paper simulations, colored side rails, ornamental shadows, and fake depth. A data gradient is acceptable only when it is a labelled continuous scale. Do not add CTA gradients on evidence pages; `cta-gradient-primary` belongs to marketing `CtaButton` only.

#### Data and evidence

Make the visual encoding honest. Show units, periods, populations, bases, and material comparators near the evidence they qualify. Name the engine, the prompt set, and the window. Use zero baselines for length encodings unless a clearly marked range or delta view better answers the question. Do not exaggerate small differences with cropped bars or hide them with nearly identical total bars; show the exact delta on the same basis. Never use a bar track as a divider or ornament. Every peer bar shares one documented scale and its length must encode the value; otherwise use aligned text.

When peer denominators differ, choose count or rate explicitly from the reader's question. Do not compare raw numerators as though the bases were equal. A mention count across engines with different coverage is not a rank. If length encodes a rate, show its count and base; if length encodes a count, explain why volume rather than incidence answers the question. Use aligned text or separate views when neither encoding is sufficient alone.

Size repeated horizontal bars as one layout, never row by row. Give the set one shared label lane, one plot lane, and one shared lane for every aligned value or annotation column. Every bar track starts and ends on the same grid lines; only the fill length varies. A row whose label, value, or annotation changes the plot width is a layout failure. Use a parent grid, subgrid, or fixed shared tracks rather than content-sized columns resolved independently inside each row.

Prefer direct labels to legends. Reserve a clear lane for every chart label so no mark, line, bracket, or annotation crosses its glyph box. Keep chart text legible in both themes. Use a caption to state what the reader should notice and what the chart does not establish. Provide a semantic table or concise text alternative for material chart data.

When a chart is the primary proof, give it enough width, height, and contrast to carry the first read. Visual salience must agree with the argument: the decisive series, exception, or threshold receives the strongest emphasis in both themes, while supporting evidence recedes without becoming illegible.

Tables are evidence, not decoration:

- Use a semantic `<table>` with caption, head, body, and optional foot.
- Span the full 12-column evidence width by default. Put the section introduction above it; do not strand a ledger beside a heading, note, or empty rail merely to fill a split grid.
- Match each column header’s alignment to every cell in that column. Left-align text columns and their headers; right-align numerical columns and their headers, including placeholders and totals. Never center or left-align a header above right-aligned values.
- Keep peer units and precision consistent; do not add fake precision.
- Bottom-align multi-line column headers only. Body cells use `vertical-align: baseline` so every cell aligns to the row's first text baseline, including when one cell wraps; never vertically center or bottom-align body rows.
- Give the row-label column enough width for ordinary short labels to stay on one line. Do not wrap a short row label while sibling columns hold unused width. If labels genuinely need multiple lines, wrap at word boundaries and preserve the shared first baseline.
- Do not spend a column repeating the same category for a run of rows. Group related rows with semantic row groups or separate tables when the category changes how the rows are interpreted. Keep the category column only when readers need its value for row-level sorting or filtering.
- Use normal density for ordinary short tables; compact density is for genuinely dense lookup.
- Highlight a recommended row only when the source supports the recommendation.
- Reorder columns around the reader's lookup task before shrinking or wrapping them.
- Give dense evidence enough width before choosing a split layout. A table with five or more columns, or any table whose headers wrap at normal desktop width, normally owns the full section width. Never clip, truncate, or shrink a header to preserve a neighboring prose rail; move the introduction above the table or simplify the columns.

Use a qualitative comparison for concise differences; use a comparison table when exact row-by-row scanning matters. Peer columns must have matching type roles and aligned row starts. If one peer needs a different structure, it is not a peer grid.

#### Calculators and interaction

Treat interaction as evidence, not decoration. A calculator, filter, or prompt explorer should make one model legible and let the reader test the assumptions that materially change the result.

Define one canonical state model: variables, fixed inputs, formulas, units, full precision, ranges, increments, defaults, display precision, and dependencies. One control owns each variable. Fixed parameters are not controls. Pre-render the default result. Update dependent outputs atomically from full-precision state, then format for display.

Keep the focal result, controls, and supporting outputs in one coherent tool. When using the tool is the reader's main job, the working tool is the dominant object in the first viewport; do not delay it below oversized orientation copy or a sparse hero. Do not precede it with a ceremonial static version of the same answer or follow it with a default-scenario recap. Explain formulas, assumptions, bounds, or interpretation only when they help the reader trust or use the model.

Use native controls with visible labels, helpers only when needed, clear units, visible focus, and one concise live status. Preserve invalid entries and the last valid result rather than silently clamping or defaulting. Keep all controls and results usable by keyboard and screen reader.

A unit control keeps its label and helper outside the bordered field:

```html
<div>
  <label for="rate">Mention rate</label>
  <div>
    <input id="rate" type="number" value="18">
    <span>%</span>
  </div>
  <p>Share of answers that name the brand in this window.</p>
</div>
```



#### Motion and delight

Default to stillness. Never add auto-scrolling marquees, simulated typing cursors, or decorative pulsing status indicators. Add motion only when it explains a state change, preserves continuity, or confirms an action. Never gate reading behind animation, reveal every section on scroll, move imagery on hover, or add bounce, parallax, cinematic transitions, sound, or spectacle. Keep the base experience complete without motion and respect reduced-motion preferences.

Create delight through unusually clear evidence or unusually low interaction friction: a comparison understood immediately, a model that makes a rate obvious, or a customer-specific interaction that removes work. Do not manufacture personality with jokes, celebration, Easter eggs, decorative motion, or effects.

#### Media and icons

Use supplied screenshots, diagrams, customer media, or logos only when they are evidence or materially improve understanding. Product screenshots, changelogs, and engine names are proof; abstract decoration is not. Never add stock imagery, decorative AI illustrations, abstract shapes, fake product screenshots, or mandatory hero media. Do not use icons as decoration or place them in colored tiles. Prefer text labels unless an established icon makes an action materially faster to recognize.

### Inspect and revise privately

Render the actual result when tooling exists. Inspect the first viewport, full page, and both light and dark themes. Also verify responsive reflow before handoff, but do not expose an evaluation matrix or critique report unless the user asks for one.

Review in this order:

1. **First read:** Is Notra authorship immediate? If the reader saw only the first viewport, would they remember the central relationship, decision, or tool rather than only the title or mood?
2. **Language:** Can the least specialized named stakeholder explain the answer after reading the headings and captions? Is every unfamiliar term defined in plain words? Did simplification preserve every material qualifier and avoid broader claims than the source supports? Does the methodology describe the chosen method and its limits rather than an execution diary?
3. **Composition:** Is there one dominant object? Does each section advance the argument? Is any empty space accidental?
4. **Typography:** Are roles consistent, peer values equal, baselines aligned, prose readable, gutters unmistakable, and vertical rhythm relational rather than uniform? Does each visible gap have one owner? Is Satoshi used for marketing headings and Inter for UI? Is Instrument Serif still scarce?
5. **Evidence:** Does geometry prove the claim? Do repeated rows share exact label, plot, value, and annotation grid lines? Are tables full width? Do headers match the alignment of representative cells in every column? Does a short row label wrap while another column has room? Does a repeated category waste a column? Is any default audit subset neutral and declared? Are chart labels clear? Is anything repeated without a new reader task? Are engines, periods, and bases named?
6. **Restraint:** Can any surface, border, pill, icon, label, color, paragraph, or section be removed without losing meaning, affordance, or rhythm? If yes, remove it. Is amethyst still scarce?
7. **Themes and reflow:** Do light and dark have equivalent hierarchy and contrast? Does the page recompose without overflow or character-level wrapping?
8. **Trust and access:** Are semantics, focus, labels, text alternatives, sources, caveats, and interaction behavior sound?

Fix the highest-impact systemic defect, render again, and repeat until no known material visual or usability issue remains. Keep this work internal. Deliver the requested implementation, not a score, process diary, comparison log, or self-critique.

## Reject generated-design reflexes

Do not ship any of these recognizable defaults:

- All-caps or tracked eyebrows, kickers, overlines, and decorative numbered section labels.
- Em dashes.
- Decorative gradients, glows, blobs, stripes, textures, glass, or ornamental shadows.
- Generic centered hero copy followed by a card grid.
- Repeated metric boxes when one composed relationship would be clearer.
- A badge, pill, or rounded capsule for ordinary metadata, chart annotations, or editorial labels.
- Cards nested inside cards, or borders used to repair weak hierarchy.
- A dark rounded rectangle around every chart or calculator.
- Arbitrary icon tiles, oversized icons, or mixed icon styles.
- Tiny muted prose, arbitrary font sizes, inconsistent peer values, or misaligned baselines.
- A narrow table floating inside a wide section, or a wide table compressed into broken words.
- Decorative charts, redundant visualizations, legends that replace direct labels, or color without meaning.
- Repeated full-width bars that do not share a scale or encode a visible difference.
- Identical section silhouettes across unrelated reader questions.
- Repeated recommendation, summary, rationale, and conclusion sections that say the same thing.
- Authoring-process narration such as how the page was organized, why a representation was chosen, or how source fields were renamed. Keep concise interpretive captions that state an evidence-led takeaway or limitation.
- A second theme switcher, print-only UI, stock imagery, fake screenshots, or decorative brand marks.
- Geist Sans as UI type, `.vbg-*` classes, Vercel wordmarks, or a monochrome report that could be mistaken for Vercel. Geist Mono is allowed for IDs in product.
- Instrument Serif as the heading face. Satoshi in the dashboard. `CtaButton` pills in product chrome. `h-8` inset `Button` as a marketing CTA.
- Extra dither, extra lavender washes, or amethyst fills on large evidence surfaces. The host hero already has one field.

Do not compensate for avoiding these defaults by producing a sterile anti-design template. Notra restraint is precise hierarchy, excellent typography, clear evidence, strong alignment, and deliberate tension. It is not merely white, thin rules, and large empty margins.

## Use the host primitives

Do not invent a class API. Do not copy Vercel’s `vbg-*` names or `--vbg-*` tokens.

In an existing Notra project, use the semantic tokens the host already exposes (`background`, `foreground`, `card`, `muted`, `primary`, `destructive`, `border`, `input`, `ring`, and status colors).

- Marketing primary action: `CtaButton`.
- Product action: `Button` from `@notra/ui`.
- Display type on the web app: `font-display` (Satoshi). Do not invent a heading class.

Verify scope, theme, and states for portaled components. Page-owned CSS may create page-specific topology, density, and evidence geometry from those tokens when stock primitives would distort the material. Every page-authored selector names only a page-specific namespace. A custom class sharing a host primitive must not change its layout, typography, surface, border, overflow, or control styling.

If no primitive fits, use semantic HTML plus a page-owned hook. Never inspect host CSS for internal selectors, guess a class name, or extrapolate a token from another product.

Prefer `currentColor`, `inherit`, or `transparent` when a custom mark needs no distinct semantic role.

## Accessibility and responsive behavior

Use landmarks, one descriptive `h1`, ordered headings, a skip link, native controls, semantic tables, figures and captions, accessible names, visible focus, and text alternatives. Meet WCAG AA and never rely on color alone. Treat source order as reading order.

Do not conceal page overflow. Give grid and flex children `min-width: 0`; reflow before shrinking. Preserve readable type and control sizes. Short comparisons may stack; long ledgers may scroll locally when reordering and simplification cannot preserve lookup. The page must remain usable in light and dark and across desktop and narrow screens. Marketing chrome may already include a theme toggle; do not add another.

The target is Notra judgment, not Notra decoration.