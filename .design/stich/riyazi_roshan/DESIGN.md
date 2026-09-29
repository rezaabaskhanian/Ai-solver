---
name: Riyazi Roshan
colors:
  surface: '#fbf8ff'
  surface-dim: '#d8d9ea'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ececfe'
  surface-container-high: '#e7e7f8'
  surface-container-highest: '#e1e1f2'
  on-surface: '#191b27'
  on-surface-variant: '#454655'
  inverse-surface: '#2e303c'
  inverse-on-surface: '#f0efff'
  outline: '#757687'
  outline-variant: '#c5c5d8'
  surface-tint: '#394be0'
  primary: '#2d40d7'
  on-primary: '#ffffff'
  primary-container: '#4a5cf0'
  on-primary-container: '#f1efff'
  inverse-primary: '#bcc2ff'
  secondary: '#5644d0'
  on-secondary: '#ffffff'
  secondary-container: '#6f5fea'
  on-secondary-container: '#fffbff'
  tertiary: '#00623f'
  on-tertiary: '#ffffff'
  tertiary-container: '#007d52'
  on-tertiary-container: '#bcffd8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc2ff'
  on-primary-fixed: '#000a64'
  on-primary-fixed-variant: '#172dc9'
  secondary-fixed: '#e4dfff'
  secondary-fixed-dim: '#c6bfff'
  on-secondary-fixed: '#160066'
  on-secondary-fixed-variant: '#4029ba'
  tertiary-fixed: '#86f9be'
  tertiary-fixed-dim: '#69dca3'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#005234'
  background: '#fbf8ff'
  on-background: '#191b27'
  surface-variant: '#e1e1f2'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: 0px
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: 0px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0px
  math-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: 0.5px
  math-inline:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.2px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-xxs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
---

## Brand & Style
The design system embodies a modern, calming, and structured pedagogical atmosphere tailored specifically for Iranian students (K-12 through university prep) and their parents. Mathematical learning often provokes cognitive overload and anxiety; the visual language counteracts this with clarity, quiet confidence, and frictionless comprehension.

The aesthetic blends **Modern Pedagogical Clarity** with **Soft Tactility**:
- Pure surfaces with tinted structural dividers to keep complex mathematical steps distinct.
- Uncluttered whitespace allowing complex formula typesetting (KaTeX/LaTeX) and geometric step-by-step visualizations to breathe.
- Native Persian RTL-first orientation where progressive disclosure moves intuitively from right to left, while formula blocks retain isolated standard mathematical directionality (LTR).
- Trustworthy, vibrant accents that celebrate milestones, correct answers, and comprehension without infantilizing older students or frustrating parents monitoring homework progress.

## Colors
The palette balances vibrant educational focus with a neutral canvas designed to reduce eye strain during extended homework sessions.

### Functional Palette Mapping
- **Primary (`#4A5CF0`)**: Serves as the interactive anchor—used for primary action triggers (e.g., "Scan Equation", "Solve Step"), focused states, and key navigational indicators.
- **Secondary / Accent (`#6C5CE7`)**: Reserved for AI-driven capabilities, deep explanations, step-by-step insight toggles, and conceptual breakdown highlights.
- **Surface (`#FFFFFF`) & Background (`#F7F8FC`)**: Background holds a soft, cool tint that frames pure white cards without harsh contrast.
- **Surface-Variant (`#EEF1F8`)**: Utilized for mathematical step blocks, formula containers, scratchpad backgrounds, and interactive chips.
- **Text Primary (`#1B1D29`) & Text Secondary (`#686D82`)**: Meets WCAG AAA compliance for Persian typographic readability on light backgrounds.
- **Feedback Accents**:
  - **Success (`#1E9E6B`)**: Correct answers, verified mathematical identity proofs, and mastery indicators.
  - **Danger (`#E0435B`)**: Syntax calculation errors, negative domain warnings, and cancellation indicators.
  - **Warning (`#F59E0B`)**: Undefined expressions, extraneous roots, or attention-needed conceptual notes.
- **Border (`#E2E6F0`)**: Low-contrast structural boundaries for equation separation and input outlines.

## Typography
Typographic rhythm in this system is architected around Persian text dynamics using Vazirmatn in implementation (with Plus Jakarta Sans handling fallback Latin & system numerical values).

### Persian & RTL Typesetting Directives
- **Font Line Height Buffering**: Persian script characters possess taller ascenders and deeper descenders than standard Latin alphabets. Line heights are expanded by 8–12% relative to Latin norms to prevent visual clipping of Persian diacritics (Erab) and Tanween.
- **Bi-Directional Isolation (Bidi)**:
  - Standard descriptive explanations, guidance, and solution headers strictly read Right-to-Left (RTL).
  - Mathematical equations, variables, and LaTeX expressions run Left-to-Right (LTR) inside isolated sub-containers (`writing-direction: ltr; text-align: left;`).
- **Persian Numerals**: Interface operational numbers (timestamps, steps, page indicators) render with native Persian digits (`۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹`). Pure algebraic expressions, Cartesian graphs, and universal notation retain conventional mathematical formatting.

## Layout & Spacing
The layout model employs a flexible 4-column structure on mobile devices transitioning to an 8-column layout on small tablets (iPad Mini/Android tablets often utilized by students for digital scratchpads).

### Grid & Margins
- **Mobile (<600dp)**: 4 columns, 16dp outer screen margin (`margin-mobile`), 12dp internal gutter (`gutter-mobile`).
- **Tablet / Split Screen (>=600dp)**: 8 columns, 24dp margin, 16dp gutters, centered max-width constraint of 720dp for solution reading sheets.

### Touch Target Mandate
All interactive components maintain a strict minimum bounding box of **44 × 44dp** to accommodate quick finger navigation, one-handed camera operation, and younger learners with developing motor precision.

## Elevation & Depth
Elevation utilizes ultra-low diffusion shadows tinted with the primary hue rather than dirty grayscale drops. This ensures that floating cards feel integrated with the `#F7F8FC` canvas.

### Elevation Hierarchy
- **Level 0 (Flat / Canvas)**: Background base `#F7F8FC`. No shadow.
- **Level 1 (Card & Content Blocks)**: Surface `#FFFFFF` with border `1px solid #E2E6F0` and subtle shadow:
  - `box-shadow: 0px 2px 8px rgba(74, 92, 240, 0.04), 0px 1px 2px rgba(27, 29, 41, 0.03);`
- **Level 2 (Interactive Modules & Accordions)**: Exploded solution steps and interactive calculators:
  - `box-shadow: 0px 4px 16px rgba(74, 92, 240, 0.08), 0px 1px 3px rgba(27, 29, 41, 0.04);`
- **Level 3 (Modals & Persistent Bottom Bars)**: Camera triggers, formula drawers, and math keyboards:
  - `box-shadow: 0px -4px 24px rgba(27, 29, 41, 0.08);`

## Shapes
Shapes feature friendly, welcoming rounded corners reflecting clarity and safety.

- **Base Radius (12px / `rounded-md`)**: Used for input fields, formula step snippets, and interactive toggle chips.
- **Large Radius (16px / `rounded-lg`)**: Applied to all primary solution cards, math camera viewfinders, modals, and solver panels.
- **Full Radius (`rounded-full`)**: Dedicated to floating camera action buttons, tag pills, step count bullets, and verification badges.

## Components

### Buttons
- **Primary Action (حل مسئله / Scan & Solve)**: Background `#4A5CF0`, text `#FFFFFF`, height `52dp`, border radius `16px`. Active press scales down slightly (`scale: 0.98`) with opacity `0.9`. Minimum width `120dp`.
- **Secondary (مراحل گام‌به‌گام / Step-by-Step)**: Background `#EEF1F8`, text `#4A5CF0`, height `48dp`, border radius `14px`, `0px` border.
- **Ghost / Tertiary**: Transparent background, text `#686D82`, active state background `rgba(74, 92, 240, 0.06)`.

### Math Input & Camera Viewfinder
- **Equation Input Field**: Surface `#FFFFFF`, border `1.5px solid #E2E6F0`, radius `14px`, minimum height `56dp`. Padding `12dp 16dp`. Focused state animates border to `#4A5CF0` with a subtle glow ring (`0 0 0 3px rgba(74, 92, 240, 0.15)`).
- **Scanner Reticle**: Overlay with 4 corner markers in `#4A5CF0`, radius `16px`, with a soft animated scan ray tinted in `#6C5CE7` at 20% opacity.

### Solution Cards & Step Trees
- **Container**: Surface `#FFFFFF`, 1px border `#E2E6F0`, radius `16px`, padding `16dp`.
- **Step Item**: Sequential numbered circle on the right side (RTL alignment) with `#EEF1F8` fill and `#4A5CF0` bold Persian digit. A continuous vertical connector line (`2px solid #EEF1F8`) links each subsequent step.
- **Equation Highlight Box**: Inside steps, formulas reside within an LTR-isolated container with `#EEF1F8` fill, radius `10px`, and internal horizontal padding of `12dp`.

### Chips & Filter Pills
- **Topic Filter (جبر، هندسه، حسابان)**: Height `36dp`, radius `18dp`.
  - Default: `#FFFFFF` fill, `1px solid #E2E6F0`, text `#686D82`.
  - Selected: `#4A5CF0` fill, text `#FFFFFF`, elevation level 1.

### Checkboxes & Verification Indicators
- **Parent/Student Verification Checkbox**: Dimensions `24 × 24dp` placed within a `44 × 44dp` touch target. Radius `6px`. Unchecked state uses `#E2E6F0` border; checked state features `#1E9E6B` fill with white checkmark.

### Bottom Navigation & Solver Dock
- **Navigation Dock**: Fixed bottom bar, background `#FFFFFF`, border-top `1px solid #E2E6F0`, height `64dp` plus device safe area.
- **Center Floating Action Button (Camera Solver)**: Elevated 56 × 56dp circle in `#4A5CF0` with dual icon (lens + sigma symbol) in `#FFFFFF`, elevated at Level 3.