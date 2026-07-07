# Diamant Laan Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Diamant Laan Angular homepage to match the new OB-brand, warm/rounded, full-viewport hero design with animated clouds and dynamic CTA routing.

**Architecture:** Update global design tokens and shared components (navbar, buttons), convert cloud EPS assets, replace the inline homepage template/styles with the new hero/stats/how-it-works/footer structure, and preserve existing auth-aware routing and API-driven stats.

**Tech Stack:** Angular 19 (standalone components), SCSS, Leaflet (existing), Google Fonts (Montserrat), optional local Frutiger font. ImageMagick available for asset conversion.

---

## File Structure

### Files to Create

| File | Responsibility |
|------|---------------|
| `src/DiamantLaan.Web/public/clouds/cloud-1.png` | Animated hero cloud (slow drift, leftmost) |
| `src/DiamantLaan.Web/public/clouds/cloud-2.png` | Animated hero cloud (medium drift, center) |
| `src/DiamantLaan.Web/public/clouds/cloud-3.png` | Animated hero cloud (fast drift, rightmost) |

### Files to Modify

| File | Responsibility |
|------|---------------|
| `src/DiamantLaan.Web/src/styles.scss` | Global design tokens (`:root`), button classes, base typography |
| `src/DiamantLaan.Web/src/index.html` | Google Fonts link update for Montserrat weights |
| `src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts` | White OB-style navbar, home icon + "Tuis", remove old logo |
| `src/DiamantLaan.Web/src/app/components/home/home.component.ts` | Full hero/stats/how-it-works/footer template+style rewrite, class cleanup |

### Files Unchanged (reference only)

| File | Purpose |
|------|---------|
| `src/DiamantLaan.Web/public/hero-bg.jpeg` | Hero background image — kept as-is |
| `for redesign/Orania beweging/logo-removebg-preview.png` | OB logo source — copied to `public/ob-logo.png` (mandatory, Task 11) |
| `src/DiamantLaan.Web/public/ob-logo.png` | OB logo in public dir — referenced by hero template |
| `src/DiamantLaan.Web/src/app/services/auth.service.ts` | Auth service — `currentUser()` signal used for CTA routing |
| `src/DiamantLaan.Web/src/app/services/settings.service.ts` | Stats visibility flags preserved |
| `src/DiamantLaan.Web/src/app/services/road.service.ts` | Road stats API preserved |
| `src/DiamantLaan.Web/src/app/app.routes.ts` | Routes unchanged |

---

## Tasks

### Phase 1 — Asset Preparation

#### Task 1: Create output directory and convert cloud EPS assets to PNG

- [ ] 1.1 Create the output directory:

```bash
mkdir -p src/DiamantLaan.Web/public/clouds
```

- [ ] 1.2 Convert cloud-1.eps to PNG:

```bash
convert -density 300 "for redesign/clouds/realistic-white-vector-cloud-png-mockup-isolated-black-transparent-sky-background-smoky-air-cloud/4670737a-5b52-4769-9abc-91767e193b61.eps" \
  -resize 1600x -background none -flatten "src/DiamantLaan.Web/public/clouds/cloud-1.png"
```

- [ ] 1.3 Convert cloud-2.eps to PNG:

```bash
convert -density 300 "for redesign/clouds/realistic-white-vector-cloud-png-mockup-isolated-black-transparent-sky-background-smoky-air-cloud (1)/e57979a4-c792-4f95-a26a-7b105719bc3e.eps" \
  -resize 1600x -background none -flatten "src/DiamantLaan.Web/public/clouds/cloud-2.png"
```

- [ ] 1.4 Convert cloud-3.eps to PNG:

```bash
convert -density 300 "for redesign/clouds/transparent-vector-white-cloud-sky-realistic-set-fog-smoke-png-texture-isolated-design-abstract-clou/2306.w018.n002.1968A.p30.1968.eps" \
  -resize 1600x -background none -flatten "src/DiamantLaan.Web/public/clouds/cloud-3.png"
```

- [ ] 1.5 Verify all three PNGs exist and have reasonable file sizes:

```bash
ls -lh src/DiamantLaan.Web/public/clouds/
```

- [ ] 1.6 Commit:

```bash
git add src/DiamantLaan.Web/public/clouds/ && git commit -m "feat: add converted cloud PNG assets for hero animation"
```

---

### Phase 2 — Global Styles Update

#### Task 2: Replace CSS custom properties in `styles.scss`

**File:** `src/DiamantLaan.Web/src/styles.scss`

- [ ] 2.1 Replace the entire `:root` block (lines 1-37) with the OB token set and legacy compat aliases:

```css
:root {
  /* === Orania Beweging Brand Colors === */
  --ob-orange: #F58220;
  --ob-blue:   #034EA2;
  --ob-yellow: #FBCA0E;
  --ob-lime:   #BED738;
  --ob-black:  #000000;

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

- [ ] 2.2 Update the `.btn-primary` and `.btn-outline` classes to use new tokens and pill shape variant. Replace the existing block (lines 63-97) with:

```css
button, .btn {
  font-family: var(--font-heading);
  font-size: 0.9375rem;
  font-weight: 600;
  padding: 0.75rem 1.75rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--ob-orange);
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(245, 130, 32, 0.25);
}
.btn-primary:hover {
  background: #D96E10;
  color: #FFFFFF;
  box-shadow: 0 6px 20px rgba(245, 130, 32, 0.35);
}

/* Pill variant for hero CTA */
.btn-pill {
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.875rem 2.5rem;
}
.btn-pill:hover {
  background: #D96E10;
  transform: translateY(-1px);
}
.btn-pill:focus-visible {
  transform: translateY(-1px);
}

.btn-outline {
  background: transparent;
  color: var(--ob-orange);
  border: 2px solid var(--ob-orange);
}
.btn-outline:hover {
  background: rgba(245, 130, 32, 0.08);
  color: #D96E10;
}

.btn-success {
  background: #6B7B3C;
  color: #fff;
  box-shadow: 0 2px 8px rgba(107, 123, 60, 0.3);
}
.btn-success:hover {
  background: #5A6A32;
  color: #fff;
}
```

- [ ] 2.3 Update the `a` link color to use `--ob-orange`:

Ensure lines ~60-61 read:
```css
a { color: var(--ob-orange); text-decoration: none; }
a:hover { color: #D96E10; }
```

- [ ] 2.4 Update form focus styles to use `--ob-orange`:

Ensure input focus rule reads:
```css
input:focus, select:focus, textarea:focus {
  border-color: var(--ob-orange);
  box-shadow: 0 0 0 4px rgba(245, 130, 32, 0.12);
}
```

- [ ] 2.5 Add the global `:focus-visible` rule for focus ring consistency:

```css
:focus-visible {
  outline: 2px solid var(--ob-blue);
  outline-offset: 2px;
}
```

(Add this after the `body` rule, before the `h1` heading rule.)

- [ ] 2.6 Keep the existing `@media (prefers-reduced-motion: reduce)` block at the end unchanged.

- [ ] 2.7 Commit:

```bash
git add src/DiamantLaan.Web/src/styles.scss && git commit -m "feat: replace design tokens with OB-brand palette, add btn-pill class, add focus-visible rule"
```

---

#### Task 3: Update Google Fonts link in `index.html`

**File:** `src/DiamantLaan.Web/src/index.html`

- [ ] 3.1 Replace the existing Google Fonts `<link>` (line 10) with the updated Montserrat-only link (remove Questrial as it's no longer the body font):

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
```

(The `<link rel="preconnect">` lines 8-9 remain unchanged.)

- [ ] 3.2 Commit:

```bash
git add src/DiamantLaan.Web/src/index.html && git commit -m "feat: update Google Fonts to Montserrat 400-900, remove Questrial"
```

---

### Phase 3 — Navbar Update

#### Task 4: Redesign the Navbar to OB white style

**File:** `src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts`

- [ ] 4.1 Replace the navbar template (lines 9-43). Remove the Stadsboufonds logo `<img>`, add the home icon + "Tuis" link as first item:

```html
<nav class="navbar">
  <div class="container navbar-inner">
    <a routerLink="/" class="nav-brand" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      Tuis
    </a>

    <button class="hamburger" (click)="menuOpen.set(!menuOpen())" [attr.aria-label]="menuOpen() ? 'Maak spyskaart toe' : 'Maak spyskaart oop'">
      @if (menuOpen()) {
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      } @else {
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      }
    </button>

    <div class="navbar-links" [class.open]="menuOpen()">
      <a routerLink="/kaart" routerLinkActive="active" (click)="menuOpen.set(false)">Kaart</a>
      @if (auth.currentUser(); as user) {
        <a routerLink="/my-blokke" routerLinkActive="active" (click)="menuOpen.set(false)">My Blokke</a>
        <a routerLink="/my-transaksies" routerLinkActive="active" (click)="menuOpen.set(false)">My Transaksies</a>
        @if (auth.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="active" (click)="menuOpen.set(false)">Admin Portaal</a>
        }
        <span class="navbar-user desktop-only">{{ user.firstName }}</span>
        <button class="btn-logout" (click)="logout()">Teken Uit</button>
      } @else {
        <a routerLink="/meld-aan" class="btn-nav" (click)="menuOpen.set(false)">Meld aan</a>
      }
    </div>
  </div>
  @if (menuOpen()) {
    <div class="backdrop" (click)="menuOpen.set(false)"></div>
  }
</nav>
```

Key changes from old template:
- Removed: `<a routerLink="/" class="navbar-brand">` with `<img src="stadsboufonds-logo-orange.png">` — replaced with home icon SVG + "Tuis" text link with `.nav-brand` class.
- Added: `routerLinkActive="active"` on all navigation links for active state styling.
- Preserved: hamburger menu, auth-aware links, mobile backdrop — all unchanged.

- [ ] 4.2 Replace the styles block (lines 44-190) with OB white navbar styling:

```css
.navbar {
  background: var(--surface);
  border-bottom: 1px solid #E5E7EB;
  padding: 0;
  position: fixed;
  top: 0;
  z-index: 100;
}
.navbar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

/* Home icon + Tuis brand link */
.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease, background 0.15s ease;
  flex-shrink: 0;
}
.nav-brand:hover {
  color: var(--ob-blue);
  background: rgba(3, 78, 162, 0.06);
}
.nav-brand.active {
  color: var(--ob-blue);
}

.hamburger {
  display: none;
  background: none;
  border: none;
  color: var(--text-body);
  cursor: pointer;
  padding: 0.25rem;
  margin: 0;
  line-height: 1;
}
.hamburger:hover { opacity: 0.7; }

.navbar-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.navbar-links a {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease, background 0.15s ease;
  white-space: nowrap;
}
.navbar-links a:hover {
  color: var(--ob-blue);
  background: rgba(3, 78, 162, 0.06);
  text-decoration: none;
}
.navbar-links a.active {
  color: var(--ob-blue);
}
.navbar-user {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--text-muted);
  white-space: nowrap;
  padding: 0.5rem 0.75rem;
}
.btn-nav {
  background: var(--ob-orange);
  color: #FFFFFF !important;
  padding: 0.45rem 1.1rem !important;
  border-radius: var(--radius-sm) !important;
  font-weight: 600 !important;
  transition: background 0.2s;
}
.btn-nav:hover {
  background: #D96E10 !important;
  color: #FFFFFF !important;
}
.btn-logout {
  font-family: var(--font-heading);
  background: transparent;
  color: var(--text-muted);
  border: 1px solid #E5E7EB;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-logout:hover {
  color: var(--ob-blue);
  border-color: var(--ob-blue);
}

.backdrop { display: none; }

@media (max-width: 768px) {
  .hamburger { display: flex; align-items: center; justify-content: center; }
  .desktop-only { display: none; }

  .navbar-links {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surface);
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0.5rem 0;
    border-top: 1px solid #E5E7EB;
    border-bottom: 1px solid #E5E7EB;
  }
  .navbar-links.open { display: flex; }

  .navbar-links a {
    padding: 0.75rem 1.5rem;
    font-size: 0.9375rem;
    border-bottom: 1px solid #E5E7EB;
  }
  .navbar-links a:hover { background: var(--bg-warm); }

  .btn-nav {
    margin: 0.5rem 1.25rem;
    text-align: center;
    justify-content: center;
    display: flex;
  }

  .navbar-user {
    padding: 0.5rem 1.5rem;
    font-size: 0.875rem;
    border-bottom: 1px solid #E5E7EB;
  }

  .btn-logout {
    margin: 0.75rem 1.25rem;
    text-align: center;
    justify-content: center;
    display: flex;
    padding: 0.5rem;
  }

  .backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    z-index: -1;
  }
}
```

Key style changes:
- Navbar: `position: fixed` + `z-index: 100` (was `sticky` + `z-index: 1000`). Border: `1px solid #E5E7EB` (was `2px solid var(--color-border)`).
- Links: font-family `var(--font-body)` (was `var(--font-heading)`). Font-size `0.875rem` (was `0.8125rem`). Added `routerLinkActive` support via `.active` class. Added `border-radius: var(--radius-sm)` and hover background tint.
- Removed: `.navbar-brand`, `.brand-logo` CSS — replaced with `.nav-brand`.
- `btn-logout` border: `1px solid #E5E7EB` (was `2px solid var(--color-border)`).

- [ ] 4.3 The `NavbarComponent` class (lines 192-199) remains unchanged — no TypeScript logic changes needed.

- [ ] 4.4 Commit:

```bash
git add src/DiamantLaan.Web/src/app/components/shared/navbar/navbar.component.ts && git commit -m "feat: redesign navbar to OB white style with home icon, fixed position, active link states"
```

---

### Phase 4 — Home Component Hero Rewrite

#### Task 5: Remove particle canvas, bracket decorations, and bottom band from template

**File:** `src/DiamantLaan.Web/src/app/components/home/home.component.ts`

- [ ] 5.1 Remove from the template (lines 35-189):

Delete these blocks entirely:
- Line 38: `<canvas #particleCanvas class="particle-canvas" aria-hidden="true"></canvas>`
- Lines 57-73: The entire `<div class="hero-brackets">` block with `@for` loop and bracket SVGs.
- Lines 76-86: The entire `<div class="hero-bottom">` block with "bou saam" text and `bouer-underline`.
- Lines 89-107: The entire `<section class="actions-band">` block.
- Lines 168-180: The entire `<section class="cta-section">` block with `.cta-card` and `stadsboufonds-logo-white.png`.

- [ ] 5.2 Also remove from imports (line 34): Remove `ShareButtonComponent` from the `imports` array (keep `CommonModule` and `RouterLink`).

The import line should become:
```typescript
imports: [CommonModule, RouterLink],
```

- [ ] 5.3 Commit checkpoint (we'll commit after the full template rewrite in Task 6):

```bash
git add src/DiamantLaan.Web/src/app/components/home/home.component.ts && git commit -m "refactor: remove particle canvas, brackets, hero-bottom, actions-band, and cta-section from home template"
```

---

#### Task 6: Add cloud layer, restructure hero content, add pill CTA, and build new below-hero sections in the template

**File:** `src/DiamantLaan.Web/src/app/components/home/home.component.ts`

- [ ] 6.1 Replace the **entire template** (the `template:` string from the `@Component` decorator) with:

```html
<section class="hero">
  <img src="hero-bg.jpeg" alt="" class="hero-bg" aria-hidden="true" />

  <!-- Cloud layer -->
  <div class="cloud-layer" aria-hidden="true">
    <img src="clouds/cloud-1.png" class="cloud cloud--slow" alt="" />
    <img src="clouds/cloud-2.png" class="cloud cloud--medium" alt="" />
    <img src="clouds/cloud-3.png" class="cloud cloud--fast" alt="" />
  </div>

  <div class="hero-content">
    <div class="hero-inner">
      <!-- Left text block -->
      <div class="hero-text">
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

       <!-- Right OB logo -->
      <div class="hero-logo">
        <img
          src="ob-logo.png"
          alt="Orania Beweging"
          class="hero-ob-logo"
        />
      </div>
    </div>

    <!-- Bottom-center pill CTA -->
    <div class="hero-cta">
      <a [routerLink]="ctaLink" class="pill-cta">Begin <span class="pill-cta-em">Bou</span>!</a>
      <div class="scroll-cue" aria-hidden="true">
        <svg class="scroll-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span class="scroll-label">Sien meer</span>
      </div>
    </div>
  </div>
</section>

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

<section class="how-it-works">
  <div class="container">
    <h2 class="section-heading">Bou jou blokkie</h2>
    <div class="steps">
      <div class="step" #stepEl>
        <div class="step-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="step-body">
          <h3>Kies jou koördinate</h3>
          <p>Gebruik die kaart om enige beskikbare vierkante meter te kies wat jy wil bou.</p>
        </div>
      </div>
      <div class="step" #stepEl>
        <div class="step-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
          </svg>
        </div>
        <div class="step-body">
          <h3>Bou met jou bydrae</h3>
          <p>Bou 'n vierkante meter teen R 500. Elke meter bring ons nader aan 'n geteerde pad.</p>
        </div>
      </div>
      <div class="step" #stepEl>
        <div class="step-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div class="step-body">
          <h3>Volg die vordering</h3>
          <p>Kyk hoe jou blok vanuit 'n grondpad tot teerpad verander. Sien die impak wat jy maak.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<footer class="site-footer">
  <div class="container footer-inner">
    <p class="footer-copy">&copy; 2026 Stephan Bredenhann &mdash; <a href="https://stephanbredenhann.github.io" target="_blank" rel="noopener">stephanbredenhann.github.io</a></p>
  </div>
</footer>
```

- [ ] 6.2 Commit checkpoint (template-only, styles come next):

```bash
git add src/DiamantLaan.Web/src/app/components/home/home.component.ts && git commit -m "feat: rewrite home template with cloud layer, hero restructure, stats cards, how-it-works icons, OB footer"
```

---

#### Task 7: Replace the component styles completely

**File:** `src/DiamantLaan.Web/src/app/components/home/home.component.ts`

- [ ] 7.1 Replace the **entire `styles:` array** in the `@Component` decorator with:

```css
:host {
  display: block;
}

/* ===== HERO ===== */
.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--surface);
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 0;
}

/* ===== CLOUD LAYER ===== */
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
  left: 5%;
  animation: cloud-drift 60s linear infinite;
  animation-delay: 0s;
}
.cloud--medium {
  left: 35%;
  animation: cloud-drift 45s linear infinite;
  animation-delay: -20s;
}
.cloud--fast {
  left: 65%;
  animation: cloud-drift 30s linear infinite;
  animation-delay: -40s;
}

@keyframes cloud-drift {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100vw); }
}

@media (prefers-reduced-motion: reduce) {
  .cloud { animation: none; }
}

/* ===== HERO CONTENT ===== */
.hero-content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
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

/* Left text block */
.hero-text {
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

.hero-title {
  font-family: var(--font-heading);
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -2px;
}

.hero-title-black { color: var(--text-body); }
.hero-title-orange { color: var(--ob-orange); }

/* Dual underline bar */
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

.hero-subtitle-accent { color: var(--ob-orange); }
.hero-subtitle-muted { color: var(--text-body); }

/* Right OB logo */
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

/* Bottom-center CTA pill */
.hero-cta {
  margin-top: auto;
  padding-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

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
  border-radius: 999px;
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

/* Scroll cue */
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

/* ===== STATS SECTION ===== */
.stats-section {
  background: var(--bg-warm);
  padding: 5rem 0 4rem;
}

.stats-grid {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.stat-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  padding: 1.75rem 2rem;
  text-align: center;
  flex: 1;
  min-width: 180px;
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

/* ===== HOW-IT-WORKS SECTION ===== */
.how-it-works {
  background: var(--surface);
  padding: 4rem 0 5rem;
}

.section-heading {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-body);
  text-align: center;
  margin-bottom: 2.5rem;
}

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
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.step.visible {
  opacity: 1;
  transform: translateY(0);
}

.step:nth-child(1).visible { transition-delay: 0ms; }
.step:nth-child(2).visible { transition-delay: 120ms; }
.step:nth-child(3).visible { transition-delay: 240ms; }

.step-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ob-orange);
  color: #FFFFFF;
  border-radius: 50%;
}

.step-body h3 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-body);
  margin-bottom: 0.5rem;
}

.step-body p {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--text-muted);
  line-height: 1.65;
}

/* ===== FOOTER ===== */
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

/* ===== RESPONSIVE ===== */
@media (min-width: 768px) {
  .hero-content {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

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
    text-align: left;
    width: 100%;
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

@media (prefers-reduced-motion: reduce) {
  .step {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

- [ ] 7.2 Commit:

```bash
git add src/DiamantLaan.Web/src/app/components/home/home.component.ts && git commit -m "feat: replace home component styles with OB-branded hero, cloud animations, rounded cards, and blue footer"
```

---

### Phase 5 — Component Class Cleanup & CTA Logic

#### Task 8: Clean up the TypeScript class and add dynamic CTA routing

**File:** `src/DiamantLaan.Web/src/app/components/home/home.component.ts`

- [ ] 8.1 Remove unused imports. In the import block at the top:

Remove from `@angular/core` imports (line 1-13):
- `NgZone` (line 6) — only used for particle animation loop
- `ViewChild` (line 10) — `canvasRef` and `heroRef`; both removed since particles and mouse tracking are gone

Keep: `CommonModule`, `AfterViewInit`, `Component`, `ElementRef`, `OnDestroy`, `OnInit`, `QueryList`, `ViewChildren`, `inject`.

Remove from other imports:
- Line 19: `import { ShareButtonComponent } from '../shared/share-button/share-button.component';` — remove entirely

Keep: `RouterLink` (line 14), `Subject, catchError, filter, of, switchMap, takeUntil, tap` from rxjs (line 15), `AuthService`, `RoadService`, `SettingsService` (lines 16-18).

- [ ] 8.2 Remove the `Particle` interface (lines 21-29):

Delete the entire `interface Particle { ... }` block.

- [ ] 8.3 Remove unused `@ViewChild` declarations (lines 651-653):

Change from:
```typescript
@ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
@ViewChild('heroSection') heroRef!: ElementRef<HTMLElement>;
@ViewChildren('stepEl') stepElements!: QueryList<ElementRef<HTMLElement>>;
```

To:
```typescript
@ViewChildren('stepEl') stepElements!: QueryList<ElementRef<HTMLElement>>;
```

(Remove both `canvasRef` and `heroRef` lines. `canvasRef` was for particles. `heroRef` was for mouse tracking event listener cleanup — both removed. Keep `stepElements` — used in `setupScrollAnimations`.)

- [ ] 8.4 Remove the injected `NgZone` (line 656):

Delete:
```typescript
private ngZone = inject(NgZone);
```

- [ ] 8.5 Remove particle-related class fields (lines 676-686):

Delete all of:
```typescript
private particles: Particle[] = [];
private animationFrameId = 0;
private mouseX = -1000;
private mouseY = -1000;
private resizeObserver?: ResizeObserver;
private onMouseMove?: (e: MouseEvent) => void;
private onMouseLeave?: () => void;
private readonly particleCount = 160;
private readonly mouseRadius = 140;
```

Keep:
```typescript
private intersectionObserver?: IntersectionObserver;
private reducedMotion = false;
private destroy$ = new Subject<void>();
```

(Note: remove `resizeObserver` — it was only for particles. Remove `animationFrameId`, `mouseX`, `mouseY`, `onMouseMove`, `onMouseLeave`, `particleCount`, `mouseRadius`.)

- [ ] 8.6 Remove the `brackets` array (lines 666-674):

Delete all 7 bracket objects.

- [ ] 8.7 Add the CTA link computed/getter. After the `siteUrl` line (line 664), add:

```typescript
get ctaLink(): string {
  return this.auth.currentUser() ? '/kaart' : '/meld-aan';
}
```

(The `auth` field is already declared as `auth = inject(AuthService)` on line 658. `currentUser()` is already a signal per `auth.service.ts` line 10. Since `HomeComponent` uses `OnPush` change detection implicitly through standalone + signal usage, a getter that reads a signal will recalculate when the template re-evaluates. This is the simplest approach per the spec.)

- [ ] 8.8 Remove the `initParticles()` method (lines 745-833). Delete the entire method.

- [ ] 8.9 Remove the `setupMouseTracking()` method (lines 835-852). Delete the entire method.

- [ ] 8.10 Update `ngAfterViewInit()` (lines 715-726). Remove particle initialization:

Change from:
```typescript
ngAfterViewInit() {
  if (typeof window === 'undefined') return;

  this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!this.reducedMotion) {
    this.initParticles();
    this.setupMouseTracking();
  }

  this.setupScrollAnimations();
}
```

To:
```typescript
ngAfterViewInit() {
  if (typeof window === 'undefined') return;

  this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  this.setupScrollAnimations();
}
```

- [ ] 8.11 Update `ngOnDestroy()` (lines 728-743). Remove references to removed fields:

Change from:
```typescript
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();

  cancelAnimationFrame(this.animationFrameId);
  this.resizeObserver?.disconnect();
  this.intersectionObserver?.disconnect();

  const hero = this.heroRef?.nativeElement;
  if (hero && this.onMouseMove) {
    hero.removeEventListener('mousemove', this.onMouseMove);
  }
  if (hero && this.onMouseLeave) {
    hero.removeEventListener('mouseleave', this.onMouseLeave);
  }
}
```

To:
```typescript
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();

  this.intersectionObserver?.disconnect();
}
```

- [ ] 8.12 The `setupScrollAnimations()` method (lines 854-880) remains functionally identical — the `#stepEl` template reference variables are preserved in the new template, so the `QueryList` approach still works.

- [ ] 8.13 The `ngOnInit()` method (lines 689-713) remains unchanged — it fetches settings and road stats as before.

- [ ] 8.14 Commit:

```bash
git add src/DiamantLaan.Web/src/app/components/home/home.component.ts && git commit -m "refactor: remove particle system, brackets, NgZone, add computed ctaLink getter for auth-aware routing"
```

---

### Phase 6 — Responsive & Accessibility Verification

#### Task 9: Verify responsive layout and accessibility compliance

- [ ] 9.1 Run the Angular dev build to check for compilation errors:

```bash
npx ng build --configuration development
```

(Workdir: `src/DiamantLaan.Web`)

- [ ] 9.2 Verify there are no TypeScript compilation errors. If any exist, fix and re-run.

- [ ] 9.3 Manually verify (or note for visual QA):

| Check | Expected |
|-------|----------|
| Cloud layer renders at top 15% of hero on 1920px viewport | 3 cloud images visible, drifting at different speeds |
| Cloud layer renders at top 15% on 375px mobile viewport | Same behavior, clouds scale with viewport |
| OB logo renders to the right of text on desktop | Logo max-height 180px, balanced beside text |
| OB logo stacks above text on mobile (<768px) | `flex-direction: column` on `.hero-inner` |
| Stats cards are side-by-side on desktop, stacked on mobile | `flex-wrap: wrap` on `.stats-grid` |
| Step cards stacked vertically, icons centered on mobile | `flex-direction: column` on `.step` |
| Step cards have entrance animation | `IntersectionObserver` fires `.visible` class |
| Footer has blue background, white centered text | `var(--ob-blue)` background |
| Pill CTA links to `/meld-aan` when logged out | `ctaLink` getter returns `/meld-aan` |
| Pill CTA links to `/kaart` when logged in | `ctaLink` getter returns `/kaart` |
| Navbar has white background, fixed position | `position: fixed`, `background: var(--surface)` |
| Navbar home icon + "Tuis" is first link | SVG home icon visible |
| Navbar active link is blue | `.active` class applies `color: var(--ob-blue)` |
| No old logo in navbar | `stadsboufonds-logo-orange.png` removed |

- [ ] 9.4 Accessibility checklist:

| Check | Expected |
|-------|----------|
| Clouds hidden from screen readers | `aria-hidden="true"` on `.cloud-layer` and each `<img alt="">` |
| OB logo has meaningful alt text | `alt="Orania Beweging"` |
| Hero background has empty alt | `alt=""` on `.hero-bg` |
| Scroll cue hidden from screen readers | `aria-hidden="true"` on `.scroll-cue` |
| Step icons hidden from screen readers | `aria-hidden="true"` on `.step-icon` |
| Pill CTA is keyboard-focusable | `<a>` with `routerLink` — inherently focusable |
| Focus ring visible on CTA | `.pill-cta:focus-visible` with blue outline |
| Focus ring visible on nav links | `:focus-visible` global rule in `styles.scss` |
| Reduced motion pauses clouds | `@media (prefers-reduced-motion: reduce)` in component styles |
| Reduced motion pauses scroll chevron | Same media query |
| Reduced motion skips step entrance animation | `.step` set to `opacity: 1; transform: none` |
| Semantic landmarks present | `<section>` for hero, stats, how-it-works; `<footer>` for footer; `<h1>` for main title |
| WCAG contrast: body text on warm bg | `#1A1A1A` on `#FDFBF7` ≈ 16.2:1 (pass) |
| WCAG contrast: muted text on warm bg | `#6B7280` on `#FDFBF7` ≈ 5.2:1 (pass) |
| WCAG contrast: white on orange CTA | `#FFFFFF` on `#F58220` ≈ 2.6:1 (marginal — see spec note) |
| WCAG contrast: footer white on blue | `#FFFFFF` on `#034EA2` — verify with tool |

- [ ] 9.4a Test with screen reader — verify decorative elements (`aria-hidden`) are skipped and meaningful content (OB logo `alt`, nav links, CTA) is announced correctly. Check that cloud images, scroll cue, title underline, and step icons are not read out.

- [ ] 9.4b Run unit tests (if any exist) and production build to verify compilation:

```bash
npx ng test --watch=false --browsers=ChromeHeadless 2>/dev/null || echo "No tests configured — skipping test step"
npx ng build --configuration production
```

(Workdir: `src/DiamantLaan.Web`)

If either fails, fix compilation/test errors before proceeding.

- [ ] 9.5 Commit any fixes from verification:

```bash
git add -A && git commit -m "fix: responsive and accessibility adjustments from verification pass"
```

---

### Phase 7 — Final Integration Test

#### Task 10: Production build and final validation

- [ ] 10.1 Run the production build:

```bash
npx ng build --configuration production
```

(Workdir: `src/DiamantLaan.Web`)

- [ ] 10.2 Verify no build errors. If the build succeeds, the Angular compiler has validated all template syntax, style bindings, and TypeScript.

- [ ] 10.3 Inspect the built output to confirm cloud assets are included:

```bash
ls -lh dist/diamant-laan.web/browser/clouds/ 2>/dev/null || ls -lh dist/diamant-laan.web/clouds/ 2>/dev/null
```

(Workdir: `src/DiamantLaan.Web`)

- [ ] 10.4 Verify the OB logo path resolves correctly. The template references `ob-logo.png` in the `public/` directory (see mandatory Task 11). Verify the file exists:

- [ ] 10.5 Final commit:

```bash
git add -A && git commit -m "chore: final production build verification"
```

---

### Phase 8 — Mandatory: Copy OB Logo to Public Directory

#### Task 11: Copy OB logo into `public/` for reliable asset serving (MANDATORY)

- [ ] 11.1 Copy the logo:

```bash
cp "for redesign/Orania beweging/logo-removebg-preview.png" src/DiamantLaan.Web/public/ob-logo.png
```

- [ ] 11.2 Update the hero template to reference the public path. Change:

```html
src="for redesign/Orania beweging/logo-removebg-preview.png"
```

To:

```html
src="ob-logo.png"
```

- [ ] 11.3 Commit:

```bash
git add src/DiamantLaan.Web/public/ob-logo.png src/DiamantLaan.Web/src/app/components/home/home.component.ts && git commit -m "chore: copy OB logo to public/ for reliable asset serving"
```

---

## Completion Checklist

Before marking this plan complete:

- [ ] All 11 tasks have their checkboxes filled
- [ ] `ng build --configuration production` passes with zero errors
- [ ] The homepage renders at `/` with the new design
- [ ] CTA routes to `/meld-aan` when logged out
- [ ] CTA routes to `/kaart` when logged in
- [ ] Clouds animate (except when `prefers-reduced-motion: reduce`)
- [ ] Navbar shows home icon + "Tuis" as first link with active blue state
- [ ] Stats section shows three rounded white cards on warm background
- [ ] How-it-works shows three rounded cards with circular SVG icon containers
- [ ] Footer has blue background with white centered copyright text
- [ ] No particle canvas, bracket decorations, or old logo remain
- [ ] All removed CSS classes are confirmed absent from the codebase
