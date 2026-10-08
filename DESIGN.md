---
name: sound-check
description: Check your microphone before the call, entirely in the browser.
colors:
  canvas: "#eef0ec"
  surface: "#ffffff"
  surface-sunken: "#f4f6f2"
  ink: "#16201b"
  ink-soft: "#2f3a34"
  muted: "#4a554e"
  line: "#d3d9d2"
  line-strong: "#7e8b80"
  accent: "#14624a"
  accent-hover: "#0f4d3a"
  accent-soft: "#e3efe9"
  on-accent: "#ffffff"
  check-ink: "#7c2b11"
  check-bg: "#fbeae2"
  check-line: "#eec3ae"
  pass-ink: "#0f4d3a"
  pass-bg: "#e3efe9"
  pass-line: "#bcdccd"
  meter-track: "#d3d9d2"
  focus: "#b45309"
typography:
  h1:
    fontSize: "2.75rem"
    fontWeight: 720
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h2:
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  lede:
    fontSize: "1.25rem"
    lineHeight: 1.3
  body:
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontSize: "0.9375rem"
    fontWeight: 650
  step:
    fontSize: "0.8125rem"
    fontWeight: 650
    letterSpacing: "0.02em"
    textTransform: uppercase
rounded:
  sm: "0.375rem"
  md: "0.625rem"
  lg: "1rem"
  pill: "999px"
shadows:
  card: "0 1px 3px rgb(22 32 27 / 0.08), 0 12px 32px -12px rgb(22 32 27 / 0.22)"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "2.5rem"
  "8": "3rem"
  "10": "4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    minHeight: "2.875rem"
    padding: "0.5rem 1.5rem"
    fontWeight: 650
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.line-strong}"
    rounded: "{rounded.md}"
  panel:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line}"
    rounded: "{rounded.lg}"
    shadow: "{shadows.card}"
  status-pass:
    backgroundColor: "{colors.pass-bg}"
    textColor: "{colors.pass-ink}"
    borderColor: "{colors.pass-line}"
    rounded: "{rounded.pill}"
  status-check:
    backgroundColor: "{colors.check-bg}"
    textColor: "{colors.check-ink}"
    borderColor: "{colors.check-line}"
    rounded: "{rounded.pill}"
  finding-check:
    backgroundColor: "{colors.check-bg}"
    borderColor: "{colors.check-line}"
    rounded: "{rounded.md}"
  finding-info:
    backgroundColor: "{colors.accent-soft}"
    borderColor: "{colors.pass-line}"
    rounded: "{rounded.md}"
  meter:
    trackColor: "{colors.meter-track}"
    fillColor: "{colors.accent}"
    height: "0.625rem"
    rounded: "{rounded.pill}"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.line-strong}"
    rounded: "{rounded.md}"
    minHeight: "2.875rem"
  playback:
    borderColor: "{colors.line-strong}"
    borderStyle: dashed
    rounded: "{rounded.md}"
---

# Design System: Sound Check

## 1. Overview

**Creative North Star: "The Quiet Preflight"**

Sound Check reads like a calm checklist run before something that matters.
A warm green-grey field carries a two-column layout: a sticky intro on the left that states the promise and its honest limits, and a single white check panel on the right that is the entire product.
The only other route is the `/#/design-system` reference page; the product itself has no navigation depth, no dashboard, no decoration competing with the one action.

The palette is a muted green-neutral system with a deep forest-green accent that is the system's only voice.
Status colour is reserved for real state: pass-green and check-orange appear only on pills, findings, and evidence that earned them.
Type is a single system sans in sentence case; uppercase is reserved for the small tracked labels ("Step 2 of 3", evidence labels, the verdict pill) that keep the ritual oriented.

Depth is a single ambient card shadow on the check panel - one surface lifted off the field, because that surface is where the work happens.
Motion is a single 200ms ease-out settle on panel entry; everything else is a 120ms hover transition, apart from the meter's linear width sweep.
The system is light-only and honours `prefers-reduced-motion` wholesale.

**Key Characteristics:**

- Two-column preflight layout: sticky intro sidebar, single action panel.
- One forest-green accent for action; status colour only on earned state; focus is a separate amber.
- Sentence-case system sans; tracked uppercase reserved for the small step, evidence, and status labels.
- One ambient shadow, on the check panel alone.
- 46px controls, 44px tap targets, reduced-motion honoured.
- The verdict is the loudest thing: pill, headline, and findings, in that order.

## 2. Colors

A warm green-grey neutral base with one forest-green accent and a paired pass/check signal set.

### Primary

- **Forest Accent** (#14624a): The single voice of the system.
  Primary button fill, meter fill, and the skip link.
  Deepens to **Forest Deep** (#0f4d3a) on hover.
- **Forest Wash** (#e3efe9): The pale accent tint behind retention notes, info findings, and design-system specimens.
  Doubles as the pass background.

### Neutral

- **Canvas** (#eef0ec): The page field, a warm grey-green.
- **Surface** (#ffffff): The check panel and swatch cards.
- **Sunken Surface** (#f4f6f2): Recessed evidence wells and secondary-button hover.
- **Ink** (#16201b): Body text and headings.
- **Ink Soft** (#2f3a34): Finding body copy inside tinted cards.
- **Muted** (#4a554e): Secondary text, step labels, footer.
- **Line** (#d3d9d2): Hairline borders and dividers.
- **Line Strong** (#7e8b80): Interactive borders on selects, secondary buttons, and the dashed playback well.

### Signal

- **Pass** - Pass Ink (#0f4d3a) on Pass Background (#e3efe9) with Pass Line (#bcdccd): the PASS pill, retention note, info findings.
  Shares the accent family deliberately: passing is the accent working as intended.
- **Check** - Check Ink (#7c2b11) on Check Background (#fbeae2) with Check Line (#eec3ae): the CHECK pill, failed findings, clipping flag, and error text.
  Warm and urgent, never red-alarm.

### Focus

- **Amber Focus** (#b45309): A 3px `focus-visible` outline offset 2px, deliberately outside the green family so keyboard focus is never confused with status.

### Named Rules

**The Earned-Status Rule.** Check colour appears only where a measurement failed or an error fired.
The accent-wash/pass family doubles as the informational surface - notices, info findings, the retention note - but never decorates.

## 3. Typography

**Font:** A single system sans stack (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto) for everything in the product flow; the tool speaks in verdicts, not code.
The design-system page alone uses the UA monospace for token names.

**Character:** Sentence case throughout, with weight and size carrying the hierarchy.
Headings tighten slightly (-0.02em); uppercase is reserved for the small tracked labels - step markers, evidence labels, and the PASS/CHECK pill.

### Hierarchy

- **H1** (720, 2.75rem, 1.15, -0.02em): The single promise, capped at a 14ch measure so it sets as a short stack.
- **H2** (650, 1.5rem, 1.3, -0.02em): Panel and section headings.
- **Lede** (1.25rem, 1.3, muted, max 30ch): The one-line expansion under the title.
- **Body** (400, 1.0625rem, 1.6): Panel prose, capped at 60ch.
- **Label** (650, 0.9375rem): Form labels.
- **Step** (650, 0.8125rem, +0.02em, uppercase, muted): "Step N of 3 · phase" orientation labels.
- **Small** (0.8125rem): Evidence labels, status pills, design-system metadata.

### Named Rules

**The Sentence-Case Rule.** Everything reads like a person explaining a check, not a dashboard.
Buttons use imperative sentence case ("Check my microphone"), headings make plain statements ("Your microphone passed this check"), and shouting is limited to the small tracked labels: step markers, evidence labels, and the verdict pill.

## 4. Elevation

The system is flat with exactly one shadow: the check panel's ambient lift (`0 1px 3px, 0 12px 32px -12px`, ink at 8%/22%).
Everything else separates by hairline border or tint, and recessed surfaces (evidence wells, playback) sink with sunken fill or a dashed border rather than gaining shadow.

### Named Rules

**The One-Shadow Rule.** Only the panel where work happens casts a shadow.
If a new surface wants elevation, the answer is a tint or a border, not a second shadow step.

## 5. Components

Radii come from a four-step scale: sm 6px, md 10px, lg 16px, pill.
Panels top out at lg; pills are reserved for status, meters, and the status dot.

### Buttons

- **Shape:** md radius (10px), 46px minimum height, semibold (650) with +0.02em tracking.
- **Primary:** Forest Accent fill, white text; hover deepens to Forest Deep; active nudges down 1px.
- **Secondary:** Surface fill, strong-line border; hover sinks to Sunken Surface with a muted border.
- **Disabled:** 0.6 opacity, wait cursor, no press shift.
- **Block:** The single call to action in each panel runs full-width.

### Status Pill

A pill carrying the verdict: status dot (8px, currentColor), bold (720) text tracked +0.08em.
Pass and check variants only; the pill is earned, never decorative.

### Findings

Tinted cards per non-passing measurement: check tint for failures, accent-wash for informational findings.
Each names the measurement in semibold, states the plain reason, and appends a "Next:" action line for check findings.

### Evidence & Meter

A recessed well labelled in the tracked step style.
The meter is a 10px pill track with the forest accent fill driven by live RMS; the clipping flag beside it flips to check colour only when clipping is actually detected.

### Playback

A dashed-border well holding the optional record control or the `<audio>` element and discard button.
Dashed, not solid: it is an appendage to the verdict, not a peer of it.

## 6. Layout

- **Shell:** 60rem max width, centred, fluid page padding (6vw block, 3vw inline clamps).
- **Check layout:** Two columns - a 24rem sticky intro and the flexible check panel - collapsing to one column below 52rem.
- **Panel:** Minimum 24rem tall so state changes never jump the page; padding clamps with viewport.
- **Design system:** `/#/design-system` renders every token group (colour, space, type, leading, weight, tracking, radii, shadow, controls, motion, layout, layering, font) plus live component specimens; `src/tokens.ts` is the inventory and a drift test keeps it honest against the CSS.

## 7. Motion

Two durations (120ms fast, 200ms standard) on a single ease-out curve; the level meter alone uses a linear 120ms width transition so the bar tracks the signal instead of easing.
The one expressive motion is `panel-in`: a 0.5rem rise-and-settle when a screen's panel mounts.
Hover transitions run at fast duration; under `prefers-reduced-motion` all animation and transition durations compress to effectively instant.

## 8. Accessibility

- **Contrast:** every text pair meets AA - ink on canvas 14.6:1, muted on canvas 6.8:1, check ink on check bg 8.1:1, pass ink on pass bg 8.3:1, white on accent 7.3:1, amber focus on canvas 4.4:1.
- **Targets:** controls are 46px tall; links and secondary affordances meet 44px.
- **Focus:** a single 3px amber `focus-visible` ring, offset 2px, on every interactive element; the skip link slides in on focus above all content.
- **Live regions:** the check panel is `aria-live="polite"`; the meter exposes `role="meter"` with its level, and clipping state renders as text.
- **Colour independence:** PASS/CHECK are words with shape and a dot, never colour alone; clipping reads "detected"/"not detected" in text.
