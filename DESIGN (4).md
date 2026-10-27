---
name: Academic Mastery
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d4e4fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#424654'
  inverse-surface: '#223144'
  inverse-on-surface: '#eaf1ff'
  outline: '#737785'
  outline-variant: '#c3c6d6'
  surface-tint: '#0056d2'
  primary: '#0040a1'
  on-primary: '#ffffff'
  primary-container: '#0056d2'
  on-primary-container: '#ccd8ff'
  inverse-primary: '#b2c5ff'
  secondary: '#ad0795'
  on-secondary: '#ffffff'
  secondary-container: '#fd5eda'
  on-secondary-container: '#670057'
  tertiary: '#474746'
  on-tertiary: '#ffffff'
  tertiary-container: '#5f5e5e'
  on-tertiary-container: '#dad8d7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#ffd7ef'
  secondary-fixed-dim: '#ffade4'
  on-secondary-fixed: '#3a0031'
  on-secondary-fixed-variant: '#850072'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1b1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d4e4fc'
  surface-subtle-blue: '#F0F6FF'
  surface-canvas: '#FFFFFF'
  text-headline: '#1F1F1F'
  border-subtle: '#DDE5EF'
  partner-accent-gold: '#F5A623'
  success-emerald: '#137333'
typography:
  display-hero:
    fontFamily: Source Sans 3
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Source Sans 3
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Source Sans 3
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Source Sans 3
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Source Sans 3
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Source Sans 3
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
  caption:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4.5rem
  container-max: 1280px
  gutter-desktop: 1.5rem
  gutter-mobile: 1rem
---

## Brand & Style

This design system embodies academic rigor, democratic access to world-class knowledge, and structured clarity. Designed for a global cohort of learners, educators, and enterprise partners, the visual language balances institution-grade credibility with digital efficiency. 

The aesthetic is grounded in **Corporate / Modern Minimalism** with an intentional editorial sensibility. It emphasizes generous whitespace, strict typographic cadence, low-noise functional framing, and a commanding signature blue that evokes authority, trust, and focus. Visual elements avoid decorative gimmickry; every border, tint, and module exists to lower cognitive load, highlight curriculum pathways, and celebrate academic achievements.

## Colors

The color palette centers on functional hierarchy and universal accessibility (WCAG AAA compliant for standard reading text):

- **Primary (`#0056D2`)**: Coursera Royal Blue. Anchor for primary calls to action, active navigation states, interactive links, and verification badges.
- **Secondary (`#C429A8`)**: Vibrant Magenta. Reserved as an accent for high-impact milestones, specializations, master track degrees, and promotional callouts.
- **Neutral & Surface Hierarchy**: Pure white (`#FFFFFF`) serves as the foundational card and input canvas. Soft tint blue (`#F0F6FF`) acts as secondary sectioning and active card highlight. Slate neutral (`#5E6D82`) establishes metadata, supporting instructional copy, and structured delimiters.
- **Semantic Text (`#1F1F1F`)**: High-contrast near-black to ensure maximum legibility against light backgrounds.
- **Accent Signals**: Verification gold (`#F5A623`) and completion emerald (`#137333`) provide status indicators across certificates, progress bars, and institutional partnership endorsements.

## Typography

Typographic rhythm utilizes **Source Sans 3** across all operational surfaces to maintain unyielding clarity, multi-lingual compatibility, and authoritative utilitarian balance.

- **Headlines**: Set in bold (700) and semi-bold (600) with slight negative letter tracking for large sizes to deliver clear informational anchoring across courses, syllabus overviews, and hero value propositions.
- **Body Text**: Tuned for sustained reading during complex course descriptions, assignment prompts, and transcript reviews. Line heights remain generous (1.5x) to alleviate fatigue.
- **Labels & Overlines**: Rendered with subtle tracking for badge taxonomy (e.g., "BEGINNER · PROFESSIONAL CERTIFICATE") ensuring institutional descriptors are immediately digestible.

## Layout & Spacing

The layout model is governed by a strict 8pt grid with a 12-column responsive layout:

- **Desktop (>= 1024px)**: 12 columns, `1280px` max-width container, `1.5rem` (24px) gutters, and `2rem` (32px) page margin bounds. Grid modules accommodate 3- or 4-column card rows for catalog discovery.
- **Tablet (768px - 1023px)**: 8 columns, `1.5rem` (24px) gutters, `1.5rem` (24px) page margins. Cards reflow to 2 columns.
- **Mobile (< 768px)**: 4 columns, `1rem` (16px) gutters, `1rem` (16px) outer edge margins. Discovery rails convert to horizontal swipe cards or single-column stacked feeds.

Spacing relies on rhythmic vertical rhythm: `space-xl` separates distinct course modules; `space-sm` separates intra-card metadata lines; `space-3xl` defines major thematic sections.

## Elevation & Depth

This system avoids heavy drop shadows and glassmorphism, relying instead on **subtle structural borders** and **low-intensity ambient elevation** that prioritize crisp content legibility:

- **Base Layer (Flat)**: Content cards and modules sit flat using crisp 1px borders (`#DDE5EF`) against `#FFFFFF` or `#F0F6FF` canvas zones.
- **Resting Elevation**: When elevation is required for floating navigation, headers, or menus: `0 2px 4px rgba(31, 31, 31, 0.06), 0 1px 2px rgba(31, 31, 31, 0.04)`.
- **Card Hover Elevation**: Modular learning cards translate -2px along the Y-axis accompanied by an expanded soft ambient depth: `0 8px 16px rgba(0, 86, 210, 0.08), 0 2px 6px rgba(31, 31, 31, 0.04)` alongside a subtle border color shift to `#0056D2`.
- **Modal / Overlay Elevation**: High-focus dialogue modals and syllabus drilldowns leverage `0 16px 32px rgba(31, 31, 31, 0.16)`.

## Shapes

The design uses a restrained **Soft (`1`)** roundedness profile to project architectural stability and enterprise credibility:

- Standard elements (buttons, inputs, cards, notification banners) use `0.25rem` (4px) to `0.5rem` (8px) corner radii.
- Badges, pills, and status tags retain compact, structured rectangular geometry rather than round capsules, preserving an organized, academic layout.
- Partner university logos, instructor avatars, and certificate media frames use consistent 4px rounding to match layout lines without visual dissonance.

## Components

### Buttons
- **Primary**: Solid Royal Blue (`#0056D2`) fill, white text, 4px border radius, font-weight 600. Hover state darkens fill to `#00419E`. Focus ring uses a 2px offset outline in `#0056D2`.
- **Secondary / Outline**: 1px solid border in `#0056D2`, transparent background, Royal Blue text. On hover: background fills with `#F0F6FF`.
- **Tertiary (Ghost)**: Transparent background, Royal Blue text, underline on hover. Used for inline course links and syllabus expansions.

### Modular Course Cards
- **Architecture**: Contained within a 1px `#DDE5EF` border with 8px radius and white background. Contains:
  1. Top: Media thumbnail (16:9 ratio) featuring partner institution watermark.
  2. Institutional metadata line: Partner logo/name in `label-sm` with neutral slate color.
  3. Course Title: Truncated to 2 lines in `headline-sm` (`#1F1F1F`).
  4. Credential tag: Soft blue pill badge (`#F0F6FF` background with `#0056D2` text).
  5. Footer: Star rating with numeric value (e.g., 4.8), learner count, and difficulty level.

### Chips & Badges
- Categorical chips (e.g., "Data Science", "Computer Science") utilize a 4px radius, `#F0F6FF` background, and `#0056D2` label text.
- Selected state swaps to solid `#0056D2` with white text.

### Input Fields & Search Bars
- Global course search bar features a 48px height, 4px border radius, crisp 1px border (`#DDE5EF`), magnifying search icon prefix, and high-contrast placeholder text.
- Focus state: Border transitions to 2px solid `#0056D2` with zero layout shift.

### Checkboxes & Radios
- Square 18px checkboxes and circular 18px radios. Border color `#5E6D82` with a 1px width. Checked state fills with `#0056D2` featuring a white icon/dot.

### Progress & Milestone Trackers
- Horizontal segmented bars with 4px height. Unfilled states use `#DDE5EF`; completed segments fill with `#137333` (completion emerald) or `#0056D2` (in-progress).