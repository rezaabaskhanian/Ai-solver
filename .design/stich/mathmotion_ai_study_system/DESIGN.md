---
name: MathMotion AI Study System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#424936'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#727a64'
  outline-variant: '#c2cab0'
  surface-tint: '#446900'
  primary: '#446900'
  on-primary: '#ffffff'
  primary-container: '#a3e635'
  on-primary-container: '#416400'
  inverse-primary: '#98da27'
  secondary: '#4d661c'
  on-secondary: '#ffffff'
  secondary-container: '#ceee93'
  on-secondary-container: '#536d22'
  tertiary: '#006d30'
  on-tertiary: '#ffffff'
  tertiary-container: '#85e797'
  on-tertiary-container: '#00682e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2f746'
  primary-fixed-dim: '#98da27'
  on-primary-fixed: '#121f00'
  on-primary-fixed-variant: '#334f00'
  secondary-fixed: '#ceee93'
  secondary-fixed-dim: '#b3d17a'
  on-secondary-fixed: '#131f00'
  on-secondary-fixed-variant: '#364e03'
  tertiary-fixed: '#95f8a7'
  tertiary-fixed-dim: '#79db8d'
  on-tertiary-fixed: '#00210a'
  on-tertiary-fixed-variant: '#005323'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1.25rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style
The brand personality is energetic, encouraging, lucid, and modern. Designed for modern learners mastering mathematics and analytical sciences, the interface dispels cognitive fatigue and math anxiety through vibrant, positive visual cues.

The design movement combines **Neo-Clean Minimalism** with **Playful Tactility**:
- Crisp, rounded surfaces with organic pill contours that feel friendly and approachable.
- Calming soft sage and mint surfaces contrasted against high-voltage electric lime accents to convey AI intelligence and active progress.
- Fluid bilingual rhythm with seamless RTL/LTR balance, supporting contemporary Persian typography alongside structured mathematical equations.
- Generous breathing space and clean structural cards that make step-by-step problem solving intuitive and digestible.

## Colors
The color architecture relies on high-energy botanic limes against muted, anti-glare sage backgrounds.

- **Primary (`#a3e635`)**: Electric lime green used for call-to-action buttons, key AI prompt highlights, completed step markers, and celebration banners.
- **Secondary (`#d9f99d`)**: Soft pastel lime-mint used for active chip states, step indicator badges, and highlight cards.
- **Tertiary (`#15803d`)**: Deep forest emerald utilized for high-legibility icons, active text links, and mathematical symbols within highlighted green cards.
- **Neutral Primary (`#111827`)**: Crisp deep slate-black providing AA/AAA contrast for headlines, mathematical formulations, and primary reading paths.
- **Neutral Secondary (`#4b5563` / `#6b7280`)**: Balanced slate gray for explanatory step subtext, metadata, and placeholder copy.
- **Surface Foundations**:
  - `bg-canvas`: `#f8faf8` — ultra-soft mint-tinted white canvas.
  - `surface-card`: `#ffffff` — pristine white elevated containers.
  - `surface-subtle`: `#f0fdf4` and `#ecfdf5` — pale honeydew containers for AI solution blocks and prompt inputs.
  - `border-subtle`: `#e2ece2` — delicate hairline borders maintaining edge definition without visual noise.

## Typography
The system employs **Plus Jakarta Sans** for Latin glyphs and numerals, with paired support for **Vazirmatn** across Persian locales to ensure typographic harmony.

- **Display & Headings**: Geometric, friendly, with tight letter spacing (`-0.02em`) on display sizes to yield an authoritative yet approachable feel.
- **Math & Formulas**: Formulas utilize clean tabular monospace or LaTeX rendering with optical alignment matching `body-lg` line height.
- **Bilingual Considerations**: In Persian (RTL) mode, line heights are increased by 15-20% to accommodate ascenders and descenders characteristic of Persian calligraphic typography.

## Layout & Spacing
The layout follows an 8pt dynamic fluid grid designed for single-hand mobile interactions while extending to 12 columns on desktop viewports.

- **Mobile Viewport (up to 640px)**: 4-column system, 20px outer margin, 16px gutter. Bottom navigation bar floats 16px above bottom edge with a centered pill geometry.
- **Tablet / Split Screen (641px - 1024px)**: 8-column layout with 24px margins. Allows two-up side-by-side mode (math prompt on left, step-by-step AI reasoning on right).
- **Desktop (1025px+)**: 12 columns with maximum container constraint of 1200px, 32px gutters, and generous 48px outer margins for focused study sessions.
- **Vertical Rhythm**: Generous intra-card spacing (16px to 24px) prevents cognitive overload during complex multi-step math breakdowns.

## Elevation & Depth
Elevation eschews heavy dark drop-shadows in favor of **Tonal Layering** and **Soft Mint Ambient Halos**:

- **Level 0 (Canvas Base)**: `#f8faf8` solid background, grounding the application in a soft, non-reflective tone.
- **Level 1 (Card & Containers)**: Crisp `#ffffff` elevated by subtle ambient glow: `0 4px 20px -2px rgba(163, 230, 53, 0.12), 0 2px 6px -1px rgba(17, 24, 39, 0.04)`. Outlined with a 1px solid border in `#e2ece2`.
- **Level 2 (Floating Modals & Active Bottom Nav)**: `0 12px 36px -4px rgba(17, 24, 39, 0.08)`, frosted backdrop filter blur (`backdrop-blur-md` with `rgba(255, 255, 255, 0.85)`).
- **Interactive Focus & Active Tokens**: Hovering and focus states trigger an electric lime diffuse glow: `0 0 0 3px rgba(163, 230, 53, 0.35)`.

## Shapes
The shape philosophy is built on high-radius, ultra-friendly pill forms (`roundedness: 3`):

- **Buttons & Interactive Tags**: Completely rounded pill silhouettes (`rounded-full` / 9999px) for friendly tap targets.
- **Content Cards & Containers**: Highly softened corners using `rounded-3xl` (24px to 28px) evoking a playful, tactile notebook or tablet feel.
- **Avatars & AI Sparks**: Softened squircle or pill housings (`rounded-2xl` to `rounded-full`) that cradle icons and illustration badges smoothly.
- **Step Counters**: Perfectly circular badges (`w-6 h-6` / `w-8 h-8`) for numbered proof sequences.

## Components

### Buttons
- **Primary Action (Pill)**: Filled `#a3e635` with `#111827` bold text. Height 52px for mobile thumbs, full-width or auto-padded `px-8`. No harsh borders. Subtle inner glow on active press.
- **Secondary / Ghost Button**: White `#ffffff` background with 1.5px border `#e2ece2` and `#111827` text. Smooth transition to soft lime background on hover.
- **Icon Action Buttons**: 44x44px circles with subtle borders (`#e2ece2`), housing contextual triggers (camera scan, microphone, stylus input).

### Chips & Model Selectors
- **AI Mode Switcher (e.g., Tutor AI / Pro / Max)**: Pill-shaped segmented control in light sage background. Selected chip fills with `#a3e635` or pure white with a delicate shadow and green icon accent.
- **Subject / Topic Tags**: 32px height, `rounded-full`, soft mint fill (`#f0fdf4`), green text (`#15803d`), and active status icon.

### Cards & Problem Solver Containers
- **Hero Upgrade Card**: Vibrant lime gradient (`linear-gradient(135deg, #a3e635 0%, #bef264 100%)`) with dark slate typography, rounded-3xl container, and embedded white pill call-to-action.
- **Solution Step Card**: White container with clean hairline border (`#e2ece2`). Houses indexed step indicators (green circled numbers), mathematical notation cards with gentle `#f9fbf9` inset backgrounds, and checkmark validation tags.

### Input Fields & Search Bars
- **Ask AI Prompt Bar**: Floating full-width pill input (`rounded-full`) with `#ffffff` fill, 1px border `#e2ece2`, magnifying or sparkle icon prefix, and a green circle send button docked inside the right (or left in Persian RTL) edge.

### Navigation
- **Floating Island Dock**: Floating rounded-full pill bar containing navigational items (Home, Chat, Library, Settings), with active icon cradled in dark charcoal pill pill-indicator and inactive icons in slate gray.