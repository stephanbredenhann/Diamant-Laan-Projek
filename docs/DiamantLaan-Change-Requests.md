# Change Requests — Diamant Laan Projek

Gathered from the planning session on 2026-06-23.

---

## 1. Fix Square Overlap at Road Curves

**Original request:** Convert Leaflet squares to hexagons to prevent overlap at road turns.

**Refined after discussion:** Stay with squares. Fix overlap only using arc-length-adjusted spacing (Approach A).

**Details:**
- At curve segments (90° turn and 10m kink), compute each width-row's longitudinal spacing proportionally to its distance from the road centerline
- Outer squares get wider spacing, inner squares get narrower
- All squares remain exactly 1m²
- Implementation in `coordinate-config.ts`

---

## 2. Corporate Sponsor & Public Square Numbering

**Original request:** Only 2000 squares for the general public. Customer squares start numbering at 1. Corporate sponsors (Orania Ontwikkelings Maatskapy R1.6m, Orania Dorpstraad R400k) start where current #1 is. Sponsor squares still sellable under "Dra ook by".

**Refined after discussion:**
- Single display numbering 1–4200 (DB ID = display number)
- Squares 1–1000: "Orania Ontwikkelings Maatskapy"
- Squares 1001–2000: "Orania Dorpstraad"
- Squares 2001–4200: General public
- Sponsor squares display gold color, tooltip shows "Borg: [name] — Dra ook by"
- All squares are purchasable by the public

---

## 3. Sell Blocks Regardless of Construction Status

**Original request:** Blocks can still be sold even if they are already being worked on.

**Refined after discussion:** All statuses sellable — any unsold square (`OwnerId == null`) can be purchased regardless of status (0–3).

---

## 4. Signup Fields: Phone Number & Orania Resident

**Original request:** Ask phone number ("foon nommer") and if the person is a resident of Orania on signup. Do a DB migration. Check user secrets for admin default login.

**Refined after discussion:**
- Phone number: already exists as column on `AspNetUsers`, populate during registration
- Is Orania Resident: new bool column via migration
- Registration form adds "Foon Nommer" input and "Inwoner van Orania?" checkbox
- JWT token includes both fields

**Admin secrets verified:** `admin@diamantlaan.co.za` / `Admin123!` — no changes needed.

---

## 5. Full Admin Dashboard

**Original request:** Full admin dashboard with daily sales, information on each buyer in a table exportable as CSV, useful graphs and tables.

**Refined after discussion:**
- Separate tab/page: `/admin/stats` (map stays at `/admin`)
- Charts: daily sales bar/line, status distribution donut, sponsor vs public pie
- Table: buyer info (name, email, phone, resident, squares, total spent) — sortable, searchable
- CSV export: "Laai Af as CSV" button
- Revenue progress bar: R2m sponsor baseline + public purchases
- Tech: Chart.js + ng2-charts

---

## Key Decisions

| Topic | Decision |
|-------|----------|
| Hexagons | **No** — keep squares, fix overlap only |
| Display numbering | **Single 1–4200** (DB IDs) |
| Sponsor/Public split | **~2000 sponsor + ~2200 public** |
| Completed squares sellable? | **Yes**, all statuses sellable |
| Dashboard layout | **Separate tab** (`/admin/stats`) |
