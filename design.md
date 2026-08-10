# Design — MakanMana

A locked design system for this app. Every screen reads this file before changing
visuals. Do not regenerate per screen — extend or amend this file when the system
needs to grow.

## Genre

**modern-minimal.** Confident sans, white canvas, generous whitespace, one
restrained accent, real type hierarchy. The register of well-built product
software rather than a decorated brochure.

## Core principle — selection vs action

The single rule that keeps this app from looking generated:

- **Selection is ink.** A chosen filter chip, an active segment, a picked time
  slot — all go near-black (`ink`) with white text.
- **Action is green.** The accent is reserved for primary buttons, the halal
  marker, and focus rings.

Accent coverage must stay under roughly 5% of any screen. If green is on the
title, the price, the stars, the badges *and* the buttons, it has stopped
meaning anything.

## Platform deviation from stock Hallmark

React Native's `StyleSheet` does **not** support `oklch()` — only hex, `rgb()`,
`hsl()`, `hwb()`, named colours and colour ints (verified against the React
Native colour reference). Tokens therefore ship as **hex** in `theme.ts`.
OKLCH equivalents are recorded below for portability and for write-ups.

No icon library is installed. `@expo/vector-icons` is deprecated in this SDK
era and `@react-native-vector-icons` needs native font linking, which is not
worth the risk before a demo. The app uses a **small fixed set of real
typographic characters** instead: `★` (rating), `♥`/`♡` (save), `›`
(disclosure), `✓` (confirmation), `−`/`+` (stepper). Decorative glyphs are
banned. Upgrade path: adopt `@react-native-vector-icons` when moving to a
native development build.

## Theme — "Verdant"

| Token | Hex | OKLCH equivalent | Use |
|---|---|---|---|
| `paper` | `#FFFFFF` | `oklch(100% 0 0)` | screen background |
| `paper2` | `#F5F6F5` | `oklch(97.4% 0.002 145)` | input + chip fill, bot bubbles |
| `paper3` | `#EAECEA` | `oklch(93.4% 0.003 145)` | pressed state |
| `ink` | `#171A19` | `oklch(20.5% 0.004 165)` | primary text, selected chips |
| `ink2` | `#5B625E` | `oklch(46.5% 0.008 165)` | secondary text |
| `ink3` | `#8A918C` | `oklch(63.5% 0.007 165)` | tertiary text, disclosure |
| `rule` | `#E4E7E4` | `oklch(92.2% 0.003 145)` | hairline separators |
| `ruleStrong` | `#D0D5D1` | `oklch(85.5% 0.004 145)` | outlined button borders |
| `accent` | `#0F7B55` | `oklch(46.8% 0.108 162)` | primary action, halal |
| `accentPressed` | `#0B5C40` | `oklch(37.5% 0.085 162)` | pressed accent, accent text |
| `accentTint` | `#E8F3EE` | `oklch(95.5% 0.020 162)` | halal badge fill |
| `accentInk` | `#FFFFFF` | `oklch(100% 0 0)` | text on accent |
| `star` | `#D99A2B` | `oklch(70.5% 0.121 78)` | rating glyph only |
| `danger` | `#A8402C` | `oklch(45.5% 0.115 32)` | errors, log out |

Contrast: `accent` on `paper` and `paper` on `accent` both measure ≈5.3:1 —
passes WCAG AA for normal text. `ink` on `paper` ≈16:1.

## Typography

System font stack, selected per platform so the app looks native and loads
instantly (no font dependency, no flash of unstyled text):

- iOS `System` · Android `sans-serif` · web `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

Scale (px) — deliberately tight, six steps:

| Name | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 28 | 700 | −0.6 | wordmark, screen title |
| `title` | 21 | 700 | −0.4 | detail header, confirmation |
| `section` | 15 | 600 | −0.1 | section headings |
| `body` | 15 | 400 | 0 | running text, menu items |
| `rowTitle` | 16 | 600 | −0.2 | restaurant name |
| `meta` | 13 | 400 | 0 | metadata lines |
| `micro` | 11 | 600 | 0.2 | badges, tab labels |

No serif anywhere. No italic headings. Emphasis is carried by weight and
colour, never by italics.

## Spacing

4-point scale: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`.
Screens pad `lg` (16) horizontally. Sections separate by `xl` (24).

## Radii

`sm 8 · md 12 · lg 16 · pill 999`. Cards and buttons use `md`. Chips use `pill`.

## Surfaces

Lists are **hairline-separated rows**, not bordered cards. A row is
`paper` with a 1px `rule` bottom border. Bordered card surfaces are reserved
for genuinely grouped content (the review form, the confirmation panel, the
info table). This is the main structural change from the previous design, where
every row was an identical bordered box and nothing led the eye.

No shadows. No gradients. No glassmorphism.

## Motion

This project has no animation library, and that is a deliberate stance. The
only microinteraction is a **press state**: `Pressable` swaps background or
opacity on press. No reveals, no entrance animations, no bounce easings.

## Components

- **Chip** — pill, hairline border. Inactive: `paper` + `rule` + `ink2`.
  Selected: `ink` fill + white text.
- **Segmented control** — `paper2` track, selected segment is `paper` with a
  `ruleStrong` border. Used for price, language, and booking day.
- **Primary button** — `accent` fill, white text, radius `md`, full width.
- **Secondary button** — `paper` fill, `ruleStrong` border, `ink` text.
- **Row** — hairline-separated, name truncates to one line, metadata beneath.
- **Tab bar** — top hairline, 4 label-only tabs. Active: `accent` + weight 700.

## Honest data

Restaurants with zero in-app reviews display **"No reviews yet"**. They must
not display the seeded `userRating` as though it were a real community score.
Google ratings stay labelled "Google" because they are attributed to a source.

## What screens MUST share

The wordmark, the accent and its placement rule, the type scale, the button
voice, the row pattern, the hairline language.

## What screens MAY differ on

Header composition (Explore carries the wordmark; Detail carries a back link
and the restaurant name), and which sections appear.

## Per-screen notes

- **Auth** — labelled inputs above fields, not placeholder-only. Left-aligned,
  no card border.
- **Explore** — wordmark header, search field, one refinement chip row, one
  cuisine chip row, segmented price. Down from four stacked pill rows.
- **Detail** — one primary action (Book a table); Directions and Save sit
  together as secondary buttons. Previously three stacked full-width buttons.
- **Booking** — segmented day, wrapped time-slot chips, stepper, confirmation.
- **Quick find** — user bubbles `accent`, bot bubbles `paper2`.
- **Profile** — neutral letter avatar (legitimate for a person, unlike the
  monogram tiles previously used for restaurants), hairline info rows,
  segmented language control.
