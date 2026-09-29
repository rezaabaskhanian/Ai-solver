# UI Design Brief — MathMotion (AI math solver, Android, Persian)

Design a complete, modern mobile UI for **MathMotion**, an Android app that solves school math
problems step by step and teaches *why* each step happens. Please produce every screen listed below,
with a consistent design system (colors, type scale, spacing, components) I can hand to a React Native
developer.

## Audience & tone
- Iranian middle/high-school students (12–18) and their parents.
- Friendly, calm, confidence-building — "a patient tutor", not a cheat tool. Modern and clean, not childish.
- Light theme first; a dark theme is a bonus.

## Hard constraints
- **Language: Persian (Farsi), RTL layout.** Font: **Vazirmatn** (Regular / Medium / Bold).
- **Math is always LTR**, even inside RTL screens: equations, the equation input field, math keys and
  step expressions must read left-to-right (e.g. `2x + 5 = 17`).
- Android phone, ~360–412 dp wide. Touch targets ≥ 44 dp. Must work with the on-screen keyboard open.
- Framework is React Native — stick to things buildable with standard views (no heavy 3D, no web-only effects).
- Current placeholder palette (feel free to replace, but give me the tokens):
  primary `#4A5CF0`, background `#F7F8FC`, surface `#FFFFFF`, text `#1B1D29`, success `#1E9E6B`, danger `#E0435B`.

## What the app does (features)
1. **Type a problem** — keyboard input with a live "detected type" chip (e.g. «معادله خطی») as you type.
   A row of math keys under the field inserts symbols a phone keyboard hides:
   `x  x²  xⁿ  √  ( )  =  ×  ÷  sin  cos  tan  π  d/dx  ∫dx`. When empty, tappable example problems are shown.
2. **Scan a problem** — camera screen; AI reads the photo. If the photo has several problems, the user
   sees a list of recognized problems, can edit/confirm each one, then solves.
3. **Step-by-step solution** — each step shows `before → operation → after` plus a short Persian explanation.
   Controls: Previous / Next / Play / Pause / Replay, progress dots, animated transitions between steps,
   a **"Verified ✓"** badge on the final answer (the answer is checked by substituting back).
4. **AR solution** — the steps are drawn on top of the photo the student took (overlay on camera image).
5. **Check my steps** — student types their own solution line by line; the app marks the first wrong line
   and gives a hint.
6. **Practice similar** — generates a new problem of the same type to try.
7. **Quiz mode** — at each step, "What's the next step?" with 4 choices; correct/incorrect feedback.
8. **Share** — export the solution as an image and share it.
9. **Topics (مباحث درسی)** — 9 topics, each with explanation, tips, worked examples and practice.
10. **History** — previously solved problems; tap to reopen the solution. Pull to refresh.
11. **Free quota & Premium** — 5 free solves per device, then a paywall for a one-time Premium unlock
    (Cafe Bazaar in-app purchase). Show remaining free solves as a small badge.

Supported problem types: linear equation, quadratic equation, algebraic simplification, arithmetic,
numeric equality check, derivative, integral, trig simplification.

## Screens to design
1. **Home** — two big primary actions: «اسکن مسئله» (camera) and «تایپ مسئله» (keyboard); recent history
   (last 3); free-solves badge; entry to the side drawer.
2. **Side drawer** — Home, Topics (مباحث درسی), History, Premium.
3. **Type problem** — input field (LTR), detected-type chip, math key row, example chips (empty state),
   buttons: «حل کن» (primary), «پاک کردن», «حل خودم رو چک کن», «با کوییز یاد بگیر»; inline error area.
4. **Scan** — full-screen camera, capture button, flash, gallery pick, framing guide; loading state while AI reads.
5. **Recognized problems** — list of detected problems from one photo, each editable, confirm & solve.
6. **Solution** — step card (before / operation badge / after / explanation), step navigation and playback
   controls, progress dots, final answer with Verified badge, actions: Share, Practice similar, Quiz.
7. **AR solution** — photo with steps overlaid, same playback controls.
8. **Check my steps** — multi-line LTR input (one step per line), result view highlighting the wrong line + hint.
9. **Quiz** — current expression, 4 answer choices, correct/wrong feedback, progress, finish summary.
10. **Topics list** and **Topic detail** (explanation, tips, examples, "practice" button).
11. **History** — list items (problem, type chip, date), empty state.
12. **Paywall** — benefits of Premium, price, buy button, restore purchase.

## States to include
Loading (solving / reading photo), empty states (no history), errors — use these exact messages:
- «ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید.» (network)
- «متوجه این مسئله نشدیم. لطفاً معادله را بررسی کنید.» (couldn't understand)
- «این نوع مسئله هنوز پشتیبانی نمی‌شود.» (unsupported type)
- «حل‌های رایگانت تموم شد. برای ادامه، پرمیوم رو فعال کن.» (quota exhausted → paywall)

## Deliverables
- Design tokens: colors (light + dark), type scale for Vazirmatn, spacing, radii, shadows.
- Components: buttons (primary / secondary / ghost), chips/badges, cards, math key, step card,
  operation badge, input field, list item, bottom sheet, toast/error.
- All 12 screens above, with the states listed.
