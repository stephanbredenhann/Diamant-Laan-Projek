# Diamant Laan Homepage Redesign — Design Specification

**Date:** 2026-07-07
**Status:** Approved
**Project:** Diamant Laan (part of Orania Beweging site family)
**Framework:** Angular 19 (standalone components)
**Source File:** `src/DiamantLaan.Web/src/app/components/home/home.component.ts`

---

## Table of Contents

1. [Brand Identity & Design Tokens](#1-brand-identity--design-tokens)
2. [Typography](#2-typography)
3. [Hero Section](#3-hero-section)
4. [CTA Logic](#4-cta-logic)
5. [Navbar](#5-navbar)
6. [Below-Hero Sections](#6-below-hero-sections)
7. [Footer](#7-footer)
8. [Responsive Strategy](#8-responsive-strategy)
9. [Asset Conversion](#9-asset-conversion)
10. [Accessibility](#10-accessibility)
11. [Implementation Checklist](#11-implementation-checklist)

---

## 1. Brand Identity & Design Tokens

### 1.1 Design Philosophy

Rural town feel: flat colors, rounded edges, homely but professional. The site is now part of the **Orania Beweging (OB)** site family and must adopt the OB palette and conventions.

### 1.2 CSS Custom Properties

Replace the existing `:root` block in `src/DiamantLaan.Web/src/styles.scss` with the OB token set. The old palette (brown, terracotta, olive, sand, cream) is **fully retired** on this page.

```css
:root {
  /* === Orania Beweging Brand Colors === */
  --ob-orange: #F58220;         /* Primary CTA, accents */
  --ob-blue:   #034EA2;         /* Headings, footer, links, navbar active */
  --ob-yellow: #FBCA0E;         /* Stats callouts, highlights */
  --ob-lime:   #BED738;         /* Avoid; minimal usage only */
  --ob-black:  #000000;         /* Rare; sparing use */

  /* === Semantic Mapping === */
  --color-primary:    var(--ob-orange);
  --color-primary-hover: #D96E10;
  --color-accent:     var(--ob-blue);
  --color-accent-hover: #023A7A;
  --color-highlight:  var(--ob-yellow);

  /* === Text === */
  --text-body:  #1A1A1A;
  --text-muted: #6B7280;

  /* === Backgrounds === */
  --bg-warm:  #FDFBF7;
  --surface:  #FFFFFF;

  /* === Borders & Radii === */
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-sm: 10px;

  /* === Shadows === */
  --shadow-soft: 0 8px 30px rgba(3, 78, 162, 0.08);

  /* === Typography === */
  --font-heading: 'Frutiger', 'Arial', 'Helvetica Neue', sans-serif;
  --font-body:    'Montserrat', sans-serif;

  /* === Legacy compat (remove after full migration) === */
  --color-orange:      var(--ob-orange);
  --color-orange-dark: #D96E10;
  --color-dark:        var(--ob-black);
  --color-bg:          var(--bg-warm);
  --color-surface:     var(--surface);
  --color-text:        var(--text-body);
  --color-text-muted:  var(--text-muted);
  --color-border:      #D1D5DB;
  --color-muted:       var(--text-muted);
  --color-info:        var(--ob-orange);
  --radius:            var(--radius-md);
}
```

### 1.3 Color Usage Rules

| Token | Use | Do Not Use For |
|-------|-----|----------------|
| `--ob-orange` | Primary CTA buttons, accent text in hero ("bou", "teerpad"), stat accent values, focus rings | Large background blocks |
| `--ob-blue` | Headings (h1–h4), footer background, in-text links, navbar active link indicator | Body text, CTA buttons |
| `--ob-yellow` | Stat callout accents, subtle highlights | Primary UI elements (keep rare) |
| `--ob-lime` | **Avoid entirely unless strictly necessary** | Do not use as a primary or secondary color |
| `--ob-black` | Rare; small decorative elements or extreme emphasis | Body text, backgrounds |
| `--text-body` | All body copy, paragraph text | — |
| `--text-muted` | Secondary/label text, step descriptions, footer sub-text | Primary headings, CTA text |
| `--bg-warm` | Section backgrounds (stats, how-it-works), page-level background | — |
| `--surface` | Card backgrounds | — |

**Explicit lime rule:** Lime `#BED738` is used only when unavoidable (e.g., inside the Orania Beweging logo asset itself, which may contain lime-colored elements). Avoid it in all UI elements, icons, accent text, and decorative accents. If a green tone is ever needed, use a muted neutral green derived from the palette — not lime.

---

## 2. Typography

### 2.1 Font Loading

Add the following to the `<head>` of `index.html` (Google Fonts):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
```

Frutiger is a commercial font. If a license is available, serve it locally via `@font-face`. The fallback stack is `'Arial', 'Helvetica Neue', sans-serif`.

### 2.2 Type Scale

| Element | Font | Weight | Size (desktop) | Notes |
|---------|------|--------|----------------|-------|
| Hero brand title ("Stadsboufonds") | Frutiger | 900 | `clamp(2.5rem, 7vw, 4.5rem)` | Unchanged from current |
| Hero "ORANIA" label | Frutiger | 700 | `0.8125rem` | Uppercase, letter-spacing 0.28em, OB orange |
| Hero tagline ("van grondpad / tot teerpad") | Frutiger | 600 | `clamp(1.125rem, 2.8vw, 1.625rem)` | Increased weight for visibility |
| Section headings | Frutiger | 800 | `1.75rem` | |
| Step card headings | Frutiger | 700 | `1.25rem` | |
| Body text | Montserrat | 400 | `1rem` | |
| Button text | Frutiger | 600 | `0.9375rem` | |
| CTA pill ("Begin Bou!") | Frutiger | 700 | `1rem` | `letter-spacing: 0.05em` |
| "Sien meer" | Montserrat | 500 | `0.8125rem` | |
| Nav links | Montserrat | 600 | `0.875rem` | |
| Stat values | Frutiger | 800 | `2rem` | |
| Stat labels | Frutiger | 600 | `0.6875rem` | Uppercase, letter-spacing 0.8px |

---

## 3. Hero Section

### 3.1 Layout Overview

- **Full viewport height:** `100dvh` (keep existing `min-height` approach).
- **Background:** Keep the existing `hero-bg.jpeg` image unchanged (`object-fit: cover`, `object-position: center`).
- **Remove particle/dust canvas:** Delete the `<canvas #particleCanvas>` element and all associated TypeScript (`Particle` interface, `initParticles()`, `setupMouseTracking()`, particle field, animation frame, mouse tracking, `ResizeObserver` for canvas). Remove `NgZone` usage for particles. Remove `ElementRef` for `particleCanvas`.
- **Remove bracket decorations:** Delete the `<div class="hero-brackets">` SVG block and the `brackets` array from the component class.
- **Remove bottom-center "bou saam" text:** Delete the `<div class="hero-bottom">` block entirely.

### 3.2 Cloud Layer

Add an animated cloud layer over the hero background, positioned in the **top 15%** of the viewport.

#### Asset Source

Convert the three EPS cloud files from `for redesign/clouds/` to transparent PNG or SVG. Source files:

```
for redesign/clouds/
  realistic-white-vector-cloud-png-mockup-isolated-black-transparent-sky-background-smoky-air-cloud/
    4670737a-5b52-4769-9abc-91767e193b61.eps
  realistic-white-vector-cloud-png-mockup-isolated-black-transparent-sky-background-smoky-air-cloud (1)/
    e57979a4-c792-4f95-a26a-7b105719bc3e.eps
  transparent-vector-white-cloud-sky-realistic-set-fog-smoke-png-texture-isolated-design-abstract-clou/
    2306.w018.n002.1968A.p30.1968.eps
```

Output to: `src/DiamantLaan.Web/public/clouds/cloud-1.png`, `cloud-2.png`, `cloud-3.png` (or `.svg`).

#### HTML Structure

```html
<div class="cloud-layer" aria-hidden="true">
  <img src="clouds/cloud-1.png" class="cloud cloud--slow" alt="" />
  <img src="clouds/cloud-2.png" class="cloud cloud--medium" alt="" />
  <img src="clouds/cloud-3.png" class="cloud cloud--fast" alt="" />
</div>
```

Place the `.cloud-layer` div inside `section.hero`, after the `<img class="hero-bg">` and before `<div class="hero-content">`.

**Explicit z-index values:** The cloud layer must have `z-index: 1` and the hero content must have `z-index: 3`. The hero background image sits at `z-index: 0` (default). This stacking ensures clouds render above the background image but below all hero text, logo, and CTA.

#### CSS

```css
.cloud-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 15%;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.cloud {
  position: absolute;
  top: 0;
  height: 100%;
  width: auto;
  opacity: 0.85;
  will-change: transform;
}

.cloud--slow {
  animation: cloud-drift 60s linear infinite;
}

.cloud--medium {
  animation: cloud-drift 45s linear infinite;
}

.cloud--fast {
  animation: cloud-drift 30s linear infinite;
}

@keyframes cloud-drift {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100vw); }
}

@media (prefers-reduced-motion: reduce) {
  .cloud { animation: none; }
}
```

Each cloud image should be approximately 15–25% of the hero width so they span with natural variety. Use `left` offsets or varied starting positions so all three are not synchronized at page load.

### 3.3 Hero Content

Three-zone layout replacing the current `hero-content` split.

```
┌──────────────────────────────────────────────────────┐
│  Cloud layer (top 15%)                                │
├──────────────────────────────────────────────────────┤
│                                                       │
│   Left text block          Right logo (OB)            │
│   "ORANIA" label           Orania Beweging logo       │
│   "Stadsboufonds"          (no link, decorative)      │
│   "van grondpad                                          │
│    tot teerpad"                                        │
│                                                       │
│                  ┌─────────────┐                      │
│                  │ Begin Bou!  │  ← pill CTA           │
│                  └─────────────┘                      │
│                       ⌄                               │
│                    Sien meer   ← scroll cue            │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### 3.3.1 Left Text Block

```html
<div class="hero-text">
  <!-- "ORANIA" is a simple text label — NOT a bordered pill or badge. Plain text with uppercase + letter-spacing only, in OB orange. -->
  <p class="hero-label">ORANIA</p>
  <h1 class="hero-title">
    <span class="hero-title-black">Stads</span><span class="hero-title-orange">bou</span><span class="hero-title-black">fonds</span>
  </h1>
  <div class="title-underline" aria-hidden="true">
    <span class="title-underline--black"></span>
    <span class="title-underline--orange"></span>
  </div>
   <p class="hero-subtitle">
     <span class="hero-subtitle-muted">van</span> grondpad /
     <span class="hero-subtitle-muted">tot</span> <span class="hero-subtitle-accent">teerpad</span>
   </p>
</div>
```

Key styling rules:

```css
.hero-title {
  font-family: var(--font-heading);
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -2px;
}

.hero-title-black { color: var(--text-body); }
.hero-title-orange { color: var(--ob-orange); }  /* "bou" */

/* Dual underline bar below the title */
.title-underline {
  display: flex;
  width: 100%;
  max-width: 280px;
  height: 6px;
  margin: 0.75rem 0 1rem;
  border-radius: 3px;
  overflow: hidden;
}
.title-underline--black  { flex: 1.15; background: var(--text-body); }
.title-underline--orange { flex: 1;    background: var(--ob-orange); }

.hero-subtitle {
  font-family: var(--font-heading);
  font-size: clamp(1.125rem, 2.8vw, 1.625rem);
  font-weight: 600;
  color: var(--text-body);
}

.hero-subtitle-accent { color: var(--ob-orange); }  /* "teerpad" */
.hero-subtitle-muted { color: var(--text-body); }    /* "van", "tot" */
```

**Keep** the dual `title-underline` bar below the main title (black + orange) as part of the existing Stadsboufonds wordmark design. **Remove** only the `bouer-underline` from the old bottom-center "bou saam" text (because that text is removed).

#### 3.3.2 Right Logo

```html
<div class="hero-logo">
  <img
    src="for redesign/Orania beweging/logo-removebg-preview.png"
    alt="Orania Beweging"
    class="hero-ob-logo"
  />
</div>
```

The logo is **not a link** — it is purely decorative brand reinforcement.

Balance the logo size to sit comfortably beside the text block. On desktop, the logo occupies roughly the same vertical space as the text block. Suggested CSS:

```css
.hero-logo {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.hero-ob-logo {
  height: auto;
  max-height: 180px;
  width: auto;
  max-width: 240px;
  object-fit: contain;
}
```

#### 3.3.3 Bottom-Center CTA Pill

```html
<div class="hero-cta">
  <!-- "Begin Bou!" — the word "Bou" is wrapped in <span> for extra bold emphasis: font-weight 900 vs 700 on the rest -->
  <a [routerLink]="ctaLink" class="pill-cta">Begin <span class="pill-cta-em">Bou</span>!</a>
  <div class="scroll-cue" aria-hidden="true">
    <svg class="scroll-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
    <span class="scroll-label">Sien meer</span>
  </div>
</div>
```

```css
.pill-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ob-orange);
  color: #FFFFFF;
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.875rem 2.5rem;
  border-radius: 999px;           /* pill shape */
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(245, 130, 32, 0.35);
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
}

.pill-cta:hover {
  background: #D96E10;
  box-shadow: 0 6px 20px rgba(245, 130, 32, 0.45);
  transform: translateY(-1px);
}

.pill-cta:focus-visible {
  outline: 3px solid var(--ob-blue);
  outline-offset: 2px;
}

.pill-cta-em {
  font-weight: 900;
}

.scroll-cue {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-top: 1.5rem;
  color: var(--text-muted);
}

.scroll-chevron {
  animation: scroll-bounce 2s ease-in-out infinite;
}

@keyframes scroll-bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(6px); }
  60% { transform: translateY(3px); }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-chevron { animation: none; }
}

.scroll-label {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 500;
}
```

#### 3.3.4 Hero Layout CSS

```css
.hero-content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
  /* padding-top: 5.5rem pushes hero content below the 15% cloud zone */
  padding: 5.5rem 1.5rem 3rem;
  max-width: 1200px;
  margin: 0 auto;
}

.hero-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 2rem;
  flex: 1;
}

.hero-label {
  font-family: var(--font-heading);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ob-orange);
  margin-bottom: 0.5rem;
}

.hero-cta {
  margin-top: auto;
  padding-bottom: 2rem;
}
```

Replace the old `.hero-top` / `.hero-bottom` split with `.hero-inner` (flex row) and `.hero-cta` (bottom center).

---

## 4. CTA Logic

### 4.1 Pill Button RouterLink

The "Begin Bou!" pill button must dynamically resolve its target based on authentication state.

```typescript
import { computed } from '@angular/core';

// In the component class:
ctaLink = computed(() => {
  return this.auth.currentUser() ? '/kaart' : '/meld-aan';
});
```

The `computed` signal from Angular core reacts to `AuthService.currentUser()` (a signal). When logged in, the CTA goes to `/kaart`. When logged out, it goes to `/meld-aan`.

If Angular 19 signals are not yet used in `AuthService`, use a getter:

```typescript
get ctaLink(): string {
  return this.auth.currentUser() ? '/kaart' : '/meld-aan';
}
```

### 4.2 Actions Band Removal

**Remove** the existing `<section class="actions-band">` block entirely. Its content (secondary CTA and share button) is replaced by the hero pill CTA and the new layout.

If the share button is still desired, relocate it to a new position outside the hero (e.g., the how-it-works section or a dedicated share strip below stats). The specification does not prescribe a new location; it may be omitted unless stakeholders request otherwise.

---

## 5. Navbar

### 5.1 Visual Style

- **Background:** White (`var(--surface)`).
- **Position:** Fixed (`position: fixed; top: 0; z-index: 100`).
- **Border:** Subtle bottom border: `border-bottom: 1px solid #E5E7EB`.
- **Height:** Approximately `60px` (consistent with current).
- **Padding:** Horizontal padding to align with `.container` max-width.

### 5.2 Link List

| Position | Label | Route / Action | Auth Required |
|----------|-------|----------------|---------------|
| Left (brand) | Home icon + "Tuis" | `/` | No |
| Left | Kaart | `/kaart` | Yes |
| Left | My Blokke | `/my-blokke` | Yes |
| Left | My Transaksies | `/my-transaksies` | Yes |
| Right (admin) | Admin Portaal | `/admin` | Admin only |
| Right | Meld aan | `/meld-aan` | Only if logged out |
| Right | Teken Uit | (logout action) | Only if logged in |

**Remove:** The "Stadsboufonds / Groeifonds" logo from the navbar. The navbar is now brand-administered under the OB family.

### 5.3 Link Styling

```css
.nav-link {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-link:hover {
  color: var(--ob-blue);
  background: rgba(3, 78, 162, 0.06);
}

.nav-link.active {
  color: var(--ob-blue);
}
```

The active link indicator uses `--ob-blue` text color. No underline or background needed for active state — color alone is sufficient.

### 5.4 Home Icon

Use an inline SVG home icon (from Lucide or a simple path) paired with the text "Tuis":

```html
<a routerLink="/" class="nav-link nav-brand" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
  Tuis
</a>
```

---

## 6. Below-Hero Sections

### 6.1 Stats Section

- **Background:** `var(--bg-warm)` (`#FDFBF7`).
- **Layout:** Three separate cards in a row (desktop), stacked (mobile).
- **Visibility:** Controlled by existing `SettingsService.getHomeStatsSettings()` — `showStatsSection` and `showTotalRaised` flags preserved.

#### Card Design

Each card is a **white rounded rectangle** with soft shadow:

```css
.stat-card {
  background: var(--surface);
  border-radius: var(--radius-lg);            /* 24px */
  box-shadow: var(--shadow-soft);             /* 0 8px 30px rgba(3,78,162,0.08) */
  padding: 1.75rem 2rem;
  text-align: center;
  flex: 1;
  min-width: 180px;
}
```

Three cards:

1. **Progress** — "Voltooi": shows `progress`% with orange accent color.
2. **Total Raised** — "Ingesamel": shows `R {totalRaised}` (conditionally visible via `showTotalRaised`).
3. **Per m²** — "Per m²": shows `R500` with orange accent color.

```html
@if (showStatsSection) {
  <section class="stats-section">
    <div class="container">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value stat-value--accent">{{ progress }}<small>%</small></div>
          <div class="stat-label">Voltooi</div>
        </div>

        @if (showTotalRaised) {
          <div class="stat-card">
            <div class="stat-value">R{{ totalRaised | number:'1.0-0' }}</div>
            <div class="stat-label">Ingesamel</div>
          </div>
        }

        <div class="stat-card">
          <div class="stat-value stat-value--accent">R500</div>
          <div class="stat-label">Per m²</div>
        </div>
      </div>
    </div>
  </section>
}
```

```css
.stats-grid {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.stat-value {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-body);
  line-height: 1.2;
}

.stat-value--accent {
  color: var(--ob-orange);
}

.stat-value small {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
}

.stat-label {
  font-family: var(--font-heading);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-top: 0.5rem;
}
```

**Remove** the old single `stats-card` block with inline `stat-divider` separators.

### 6.2 How-It-Works Section

- **Background:** `var(--surface)` (white).
- **Layout:** Section heading ("Bou jou blokkie") centered, followed by three rounded cards in a vertical stack, centered with `max-width: 800px`.

#### Step Card Design

Each card has a rounded appearance (matching the new design language):

```css
.steps {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 800px;
  margin: 0 auto;
}

.step {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  background: var(--bg-warm);
  border-radius: var(--radius-md);          /* 16px */
  box-shadow: var(--shadow-soft);
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.step.visible {
  opacity: 1;
  transform: translateY(0);
}
```

#### Icons

Replace the numbered square blocks (`.step-number`) with **SVG icons** in a circular container. Use Lucide icons or simple custom SVGs:

```html
<div class="step-icon" aria-hidden="true">
  <!-- Icon: map/location for step 1 -->
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
</div>
```

Use: map-pin icon for step 1, hand-coins/heart for step 2, trending-up/chart for step 3.

```css
.step-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ob-orange);
  color: #FFFFFF;
  border-radius: 50%;                      /* circular */
}
```

#### Step Content

Step headings and descriptions unchanged in copy. Steps:

1. **Kies jou koördinate** — Gebruik die kaart om enige beskikbare vierkante meter te kies wat jy wil bou.
2. **Bou met jou bydrae** — Bou 'n vierkante meter teen R 500. Elke meter bring ons nader aan 'n geteerde pad.
3. **Volg die vordering** — Kyk hoe jou blok vanuit 'n grondpad tot teerpad verander. Sien die impak wat jy maak.

#### Scroll Animation

Keep the existing `IntersectionObserver` logic (`setupScrollAnimations()`) but update the selector from `stepEl` to target `.step` elements. Remove the `stepEl` `@ViewChildren` query if refactoring; it may be reused.

**Remove** the section logo image (`stadsboufonds-logo-orange.png`) from the section header.

### 6.3 Bottom CTA Section

**Remove** the existing dark background `.cta-section` / `.cta-card` block with `stadsboufonds-logo-white.png`.

The single "Begin Bou!" pill in the hero replaces this redundant CTA.

---

## 7. Footer

### 7.1 Design

- **Background:** `var(--ob-blue)` (`#034EA2`).
- **Text color:** White (`#FFFFFF`).
- **Padding:** `3rem 0`.
- **Content:** Centered.
- **Typography:** Body font (Montserrat), sizes per spec below.

### 7.2 Content

```html
<footer class="site-footer">
  <div class="container footer-inner">
    <p class="footer-copy">&copy; 2026 Stephan Bredenhann &mdash; <a href="https://stephanbredenhann.github.io" target="_blank" rel="noopener">stephanbredenhann.github.io</a></p>
  </div>
</footer>
```

**Remove:**
- The old footer logo (`stadsboufonds-logo-full.png`).
- The tagline "van grondpad tot teerpad".
- The "Diamant Laan · Orania Stadsboufonds" sub-line.
- Any OB initiative line.

### 7.3 CSS

```css
.site-footer {
  background: var(--ob-blue);
  padding: 3rem 0;
  text-align: center;
}

.footer-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.footer-copy {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: #FFFFFF;
  margin: 0;
}

.footer-copy a {
  color: #FFFFFF;
  text-decoration: underline;
  text-underline-offset: 2px;
}
```

The copyright text contains a GitHub Pages URL wrapped in a clickable anchor tag (`<a href="https://stephanbredenhann.github.io" target="_blank" rel="noopener">`). The link opens in a new tab with `rel="noopener"` for security.

---

## 8. Responsive Strategy

### 8.1 Breakpoints

| Breakpoint | Target | Behavior |
|------------|--------|----------|
| ≥ 768px | Desktop | Full layout as described |
| < 768px | Tablet / Mobile | Stacked layout |
| < 480px | Small Mobile | Reduced font sizes |

### 8.2 Mobile Layout (< 768px)

**Hero:**
- The `.hero-inner` flex row becomes a column: the OB logo stacks **above** the text block.
- Logo size reduces: `max-height: 120px`, `max-width: 160px`.
- Text block remains left-aligned (or centered — left-aligned preferred for readability).
- Pill CTA and scroll cue remain centered at bottom.
- Hero section padding-top reduced to `4.5rem` to account for fixed navbar.

**Clouds:**
- Cloud layer remains at `top: 0`, `height: 15%`. No changes needed — clouds already scale with viewport width via percentage-based animation.

**Stats:**
- Cards stack vertically, full width.
- `flex-direction: column` on `.stats-grid`.

**How-It-Works:**
- Step cards stack with icon centered above body text.
- `flex-direction: column` on `.step`.
- Text alignment: center.

### 8.3 Small Mobile (< 480px)

- Hero brand title drops to `font-size: 2.25rem`.
- Section headings: `1.375rem`.
- Stat values: `1.75rem`.

### 8.4 Media Queries

```css
@media (max-width: 768px) {
  .hero-content {
    padding-top: 4.5rem;
  }

  .hero-inner {
    flex-direction: column;
    text-align: center;
  }

  .hero-ob-logo {
    max-height: 120px;
    max-width: 160px;
  }

  .hero-text {
    text-align: left;     /* keep left even when stacked */
  }

  .stats-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .step {
    flex-direction: column;
    text-align: center;
  }

  .step-body {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2.25rem;
  }

  .section-heading {
    font-size: 1.375rem;
  }

  .stat-value {
    font-size: 1.75rem;
  }
}
```

---

## 9. Asset Conversion

### 9.1 Cloud EPS → PNG/SVG

**Source directory:** `for redesign/clouds/`

Three `.eps` files with accompanying `.jpg` previews:

| Source EPS | Output File |
|------------|-------------|
| `realistic-white-vector-cloud-png-mockup-isolated-black-transparent-sky-background-smoky-air-cloud/4670737a-5b52-4769-9abc-91767e193b61.eps` | `public/clouds/cloud-1.png` |
| `realistic-white-vector-cloud-png-mockup-isolated-black-transparent-sky-background-smoky-air-cloud (1)/e57979a4-c792-4f95-a26a-7b105719bc3e.eps` | `public/clouds/cloud-2.png` |
| `transparent-vector-white-cloud-sky-realistic-set-fog-smoke-png-texture-isolated-design-abstract-clou/2306.w018.n002.1968A.p30.1968.eps` | `public/clouds/cloud-3.png` |

**Conversion method:** Use ImageMagick (`convert`), Inkscape CLI, or a rasterization service. The output must be:

- **Format:** PNG (with alpha transparency) or SVG.
- **Background:** Transparent.
- **Color:** White cloud on transparent background.
- **Resolution:** Sufficient for 2x displays. Recommended: ~1200–1800px wide at 72 DPI, or SVG for infinite scaling.

**Output directory:** `src/DiamantLaan.Web/public/clouds/`

**Command (ImageMagick, if available):**

```bash
# Example for one cloud:
convert -density 300 "source.eps" -resize 1600x \
  -background none -flatten "public/clouds/cloud-1.png"
```

For SVG output, use Inkscape:

```bash
inkscape --export-type=svg --export-plain-svg \
  --export-filename="public/clouds/cloud-1.svg" "source.eps"
```

### 9.2 OB Logo

**Source:** `for redesign/Orania beweging/logo-removebg-preview.png`

Already in PNG format with transparent background. Use as-is in the hero. If the file is large, consider optimizing with `pngquant` or `oxipng`.

---

## 10. Accessibility

### 10.1 Reduced Motion

- Cloud animations **must pause** when `prefers-reduced-motion: reduce` is active.
- Scroll chevron bounce animation must pause.
- Step card entrance animations must be skipped (elements remain visible).
- Global `@media (prefers-reduced-motion: reduce)` rule in `styles.scss` already disables all animations/transitions — ensure it does not interfere with cloud layout (clouds should remain visible but static).

### 10.2 Focus Rings

All interactive elements must show a visible focus ring on keyboard focus:

```css
:focus-visible {
  outline: 2px solid var(--ob-blue);
  outline-offset: 2px;
}
```

- Pill CTA: blue focus ring with 2px offset.
- Nav links: blue focus ring.
- Any links in the footer: white or light focus ring.

### 10.3 Color Contrast

Verify these critical combinations meet WCAG AA (minimum 4.5:1 for normal text, 3:1 for large text):

| Element | Foreground | Background | Expected Ratio |
|---------|------------|------------|----------------|
| Body text | `#1A1A1A` | `#FDFBF7` | ~16.2:1 (pass) |
| Muted text | `#6B7280` | `#FDFBF7` | ~5.2:1 (pass) |
| Orange CTA text | `#FFFFFF` | `#F58220` | Needs verification — see note below |
| Blue heading | `#034EA2` | `#FDFBF7` | Needs verification |
| Footer text | `#FFFFFF` | `#034EA2` | Needs verification |

If any combination fails, adjust the darker/lighter variant accordingly.

**Important — Orange CTA contrast note:** White text (`#FFFFFF`) on the OB orange CTA background (`#F58220`) must be verified with a WCAG contrast tool. The contrast ratio of white-on-`#F58220` is approximately 2.6:1, which falls below the 3:1 minimum for large text (18px+ bold) and well below 4.5:1 for normal text. **Recommendation:** If the ratio is below 3:1 for large text (18px+, which the pill CTA text is not), use **black text** (`#1A1A1A`) on the orange button for sufficient contrast, or **darken the orange** to at least `#D96E10` (the hover state value) for the button background to improve contrast with white text. The hover color `#D96E10` with white text yields approximately 3.5:1 — acceptable for large text only. For the safest approach, prefer black text on the orange button.

### 10.4 Semantic HTML

- Hero: `<section>`, heading is `<h1>`.
- Stats: `<section>`, each stat is a `<div>` (decorative, not tabular data).
- How-it-works: `<section>`, `<h2>` heading, each step is an `<article>` or `<div>`.
- Footer: `<footer>` landmark.
- All decorative images: `alt=""` and `aria-hidden="true"`.
- OB logo in hero: `alt="Orania Beweging"` (meaningful alt text).
- Cloud images: `alt=""` and `aria-hidden="true"`.

### 10.5 Keyboard Navigation

- Pill CTA is a `<a>` with `routerLink` — inherently keyboard-focusable.
- Nav links are `<a>` elements.
- Scroll cue is decorative (`aria-hidden="true"`), not interactive.

---

## 11. Implementation Checklist

### Phase 1 — Design Tokens

- [ ] Replace `:root` block in `styles.scss` with OB token set (Section 1.2).
- [ ] Add Google Fonts link for Montserrat in `index.html`.
- [ ] Verify Frutiger font availability; set up fallback stack.

### Phase 2 — Asset Conversion

- [ ] Convert `cloud-1.eps` → `public/clouds/cloud-1.png` (or `.svg`).
- [ ] Convert `cloud-2.eps` → `public/clouds/cloud-2.png` (or `.svg`).
- [ ] Convert `cloud-3.eps` → `public/clouds/cloud-3.png` (or `.svg`).
- [ ] Verify OB logo (`logo-removebg-preview.png`) is accessible at its current path.

### Phase 3 — Hero Section

- [ ] Remove `<canvas #particleCanvas>` from template.
- [ ] Remove `Particle` interface from component.
- [ ] Remove `initParticles()`, `setupMouseTracking()` methods.
- [ ] Remove particle-related fields (`particles`, `animationFrameId`, `mouseX`, `mouseY`, `resizeObserver`, `particleCount`, `mouseRadius`, `onMouseMove`, `onMouseLeave`).
- [ ] Remove `NgZone` injection (if no longer needed elsewhere).
- [ ] Remove `canvasRef` and `heroRef` `@ViewChild` declarations (keep `heroRef` if still needed for any reason).
- [ ] Remove `<div class="hero-brackets">` SVG block and `brackets` array.
- [ ] Remove `<div class="hero-bottom">` "bou saam" block.
- [ ] Keep `<div class="title-underline">` (black + orange dual bar). Remove only `<div class="bouer-underline">`.
- [ ] Add cloud layer `<div>` with three `<img>` elements.
- [ ] Add cloud animation CSS (`@keyframes cloud-drift`, `.cloud--slow/medium/fast`).
- [ ] Add `@media (prefers-reduced-motion)` rule for clouds.
- [ ] Restructure hero content into `.hero-inner` (flex row) + `.hero-cta` (bottom).
- [ ] Build left text block: "ORANIA" label, "Stadsboufonds" title, tagline.
- [ ] Build right logo: OB logo, no link, balanced size.
- [ ] Build bottom-center pill CTA with dynamic `routerLink`.
- [ ] Build scroll-down cue (chevron + "Sien meer").
- [ ] Add CTA `computed()` or getter logic for `/kaart` vs `/meld-aan`.
- [ ] Remove `<section class="actions-band">` (and its `ShareButtonComponent` import if no longer used elsewhere).
- [ ] Remove old hero CSS classes (`.hero-top`, `.hero-brand`, `.orania`, `.brand-title`, `.stads/.bou/.fonds`, `.hero-tagline`, `.hero-brackets`, `.bracket`, `.hero-bottom`, `.bottom-line`, `.stads-inline`, `.bouer-underline`). Keep `.title-underline`.

### Phase 4 — Navbar

- [ ] Set navbar background to white, fixed position, subtle bottom border.
- [ ] Add home icon + "Tuis" as first link.
- [ ] Remove Stadsboufonds/Groeifonds logo from navbar.
- [ ] Apply OB blue (`--ob-blue`) to active link.
- [ ] Apply subtle hover effect (opacity or background tint).
- [ ] Preserve existing auth-aware links (Kaart, My Blokke, My Transaksies, Admin Portaal, Meld aan/Teken Uit).

### Phase 5 — Stats Section

- [ ] Replace single `stats-card` with three individual `.stat-card` cards in a `.stats-grid`.
- [ ] Apply `border-radius: var(--radius-lg)` and `box-shadow: var(--shadow-soft)`.
- [ ] Use `var(--bg-warm)` section background.
- [ ] Preserve `showStatsSection` / `showTotalRaised` flags.
- [ ] Remove `stats-card` and `stat-divider` CSS.

### Phase 6 — How-It-Works Section

- [ ] Remove `stadsboufonds-logo-orange.png` from section header.
- [ ] Replace square `.step-number` blocks with circular `.step-icon` containers holding SVG icons.
- [ ] Apply `border-radius: var(--radius-md)` and `box-shadow: var(--shadow-soft)` to step cards.
- [ ] Update `setupScrollAnimations()` if selectors change.
- [ ] Remove `.step-number` CSS.

### Phase 7 — Bottom CTA Section

- [ ] Remove `<section class="cta-section">` and `.cta-card` HTML.
- [ ] Remove `.cta-section`, `.cta-card`, `.cta-logo`, `.bou-cta` CSS.

### Phase 8 — Footer

- [ ] Replace footer background with `var(--ob-blue)`.
- [ ] Remove footer logo, tagline, and sub-line.
- [ ] Set content to: `&copy; 2026 Stephan Bredenhann &mdash; stephanbredenhann.github.io`.
- [ ] Update footer CSS (background color, text color, padding).

### Phase 9 — Responsive

- [ ] Verify mobile hero layout (logo above text, reduced sizes).
- [ ] Verify stats cards stack vertically on mobile.
- [ ] Verify step cards stack vertically with centered text on mobile.
- [ ] Verify cloud layer remains at top 15% on all breakpoints.
- [ ] Verify font size reductions at 480px breakpoint.

### Phase 10 — Accessibility & QA

- [ ] Verify all `prefers-reduced-motion` rules work (clouds, chevron, steps).
- [ ] Verify visible focus rings on all interactive elements.
- [ ] Verify color contrast for all text/background combinations.
- [ ] Verify semantic HTML landmarks (`<h1>`, `<footer>`, `alt` attributes, `aria-hidden`).
- [ ] Test keyboard navigation through entire page.
- [ ] Test with screen reader (decorative elements hidden, meaningful content accessible).

---

## Appendix A — Component Class Cleanup

After the redesign, remove the following from `HomeComponent`:

### Imports to Remove
- `NgZone` (if only used for particles)
- `ShareButtonComponent` (if actions band removed)

### Fields to Remove
- `canvasRef: ElementRef<HTMLCanvasElement>` — `@ViewChild('particleCanvas')`
- `brackets` array
- `particles: Particle[]`
- `animationFrameId`
- `mouseX`, `mouseY`
- `resizeObserver?: ResizeObserver`
- `reducedMotion` (may keep for step animations)
- `onMouseMove`, `onMouseLeave` handlers
- `particleCount`, `mouseRadius`
- `Particle` interface

### Methods to Remove
- `initParticles()`
- `setupMouseTracking()`

### Fields to Add
- Nothing new required beyond the `ctaLink` computed/getter (if using Angular signals).

---

## Appendix B — File Manifest

| File | Action |
|------|--------|
| `src/DiamantLaan.Web/src/styles.scss` | Replace `:root` block with OB tokens |
| `src/DiamantLaan.Web/src/index.html` | Add Google Fonts `<link>` for Montserrat |
| `src/DiamantLaan.Web/src/app/components/home/home.component.ts` | Full rewrite of template, styles, and class per this spec |
| `src/DiamantLaan.Web/public/clouds/cloud-1.png` | New — converted from EPS |
| `src/DiamantLaan.Web/public/clouds/cloud-2.png` | New — converted from EPS |
| `src/DiamantLaan.Web/public/clouds/cloud-3.png` | New — converted from EPS |
| `for redesign/Orania beweging/logo-removebg-preview.png` | No change — referenced from hero |
| `src/DiamantLaan.Web/public/hero-bg.jpeg` | No change — kept as-is |

---

## Appendix C — Reference Images

- Existing hero background: `src/DiamantLaan.Web/public/hero-bg.jpeg`
- OB logo: `for redesign/Orania beweging/logo-removebg-preview.png`
- Cloud source EPS files: `for redesign/clouds/` (three subdirectories)
- Cloud JPG previews: same directories, `.jpg` suffix
