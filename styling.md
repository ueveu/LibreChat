# NEXT‑STRATEGY.AI – Digital Brand & UI Style Guide  
_Last updated: 22 June 2025_

---

## 1. Brand Colour Palette

| Role | Hex & RGB | CMYK | Usage guidelines |
|------|-----------|------|------------------|
| **Primary Teal** | `#87C6BA` • 135 198 186 | 32 0 6 22 | Main surfaces, section backgrounds, data‑viz accents |
| **Accent Mint** | `#86E2C0` • 134 226 192 | 41 0 15 11 | Gradients, infographics, secondary buttons |
| **Accent Lime** | `#95EE85` • 149 238 133 | 37 0 44 7 | Primary CTAs, tags, success states |
| **Highlight Neon** | `#98FF8E` • 152 255 142 | 40 0 44 0 | Hover flashes, progress bars, charts |
| **Graphite Black** | `#141414` • 20 20 20 | 0 0 0 92 | Copy, icons, outlines, dark mode bkgs |

> **Contrast check**  
> - Text on Lime or Mint must be `#141414` (AA≥4.5).  
> - Text on Teal surfaces uses white (`#FFFFFF`) at 80 % op.

---

## 2. Typography

| Element | Font stack | Weight • Size • Line‑height |
|---------|------------|-----------------------------|
| **Logo** | `Montserrat, "Helvetica Neue", sans‑serif` | 900 • 40 px • 110 % |
| **H1** | Montserrat | 700 • 48 px • 115 % |
| **H2** | Montserrat | 600 • 32 px • 120 % |
| **H3** | Montserrat | 600 • 24 px • 130 % |
| **Body / UI** | `Inter, Roboto, sans‑serif` | 400 • 16 px • 150 % |
| **Small / Caption** | Inter | 400 • 12 px • 140 % |
| **Button label** | Inter | 600 • 16 px • 100 % (all caps) |

_All fonts served via Google Fonts. Embed `display=swap` to avoid FOIT._

---

## 3. Logo Usage

1. **Safe‑zone:** 1 × logo‑height on all sides.  
2. **Minimum width:** 120 px digital, 30 mm print.  
3. **Colour:**  
   - Default: Graphite text on Primary Teal background.  
   - Monotone: Pure white on Graphite or photo backgrounds ≥ 40 % contrast.  
4. Never distort, recolour, add shadows, or place on Lime/Neon.

---

## 4. Buttons

| State | Background | Text | Border | Extras |
|-------|------------|------|--------|--------|
| **Primary** | Accent Lime `#95EE85` | Graphite | 0 | `border‑radius: 12px;` |
| **Hover / Focus** | Primary Teal `#87C6BA` | Graphite | 0 | Transition 120 ms ease‑out |
| **Disabled** | `rgba(20,20,20,0.15)` | `rgba(20,20,20,0.40)` | 0 | `cursor: not‑allowed;` |

> **Accessibility:** Focus ring `2px solid #141414` inset; meets WCAG 2.2 focus‑appearance.

---

## 5. Form Elements

```css
input,
select,
textarea {
  font: 400 16px/150% Inter, sans-serif;
  color: #141414;
  border: 2px solid #87C6BA;
  border-radius: 12px;
  padding: 0.625rem 1rem;
}
input:focus {
  outline: none;
  border-color: #95EE85;
  box-shadow: 0 0 0 2px rgba(152, 255, 142, 0.60);
}
6. Sample Component Mark‑up
html
Copy
<a class="btn" href="#">
  <span class="btn__label">Get Started</span>
</a>

<style>
.btn {
  display: inline-block;
  background: #95EE85;
  color: #141414;
  border-radius: 12px;
  padding: 0.75rem 2rem;
  font: 600 16px/100% Inter, sans-serif;
  text-transform: uppercase;
  text-decoration: none;
  transition: background 0.12s ease-out;
}
.btn:hover,
.btn:focus-visible {
  background: #87C6BA;
}
</style>
7. Layout & Spacing
Token	Value	Usage
--space‑xs	0.25rem (4 px)	Icon padding
--space‑s	0.5rem (8 px)	Inline gaps
--space‑m	1rem (16 px)	Default component padding
--space‑l	2rem (32 px)	Section gutters
--space‑xl	4rem (64 px)	Page padding on desktop

Grid: 12 col, 72 px max gutter, 1140 px content width, 100 % fluid below 768 px.

8. Iconography
Stroke icons, 2 px line, 24 × 24 bounding box.

Primary colour Graphite; Lime or Teal for active states.

Maintain optical alignment within the 24 px box.

9. Motion
Motion use‑case	Duration	Easing
Button hover	120 ms	ease-out
Section reveal	300 ms	cubic‑bezier(.16,1,.3,1)
Overlay fade	200 ms	linear

Reduce motion if the user’s OS has prefers‑reduced‑motion: reduce.

10. Asset Delivery Checklist
 SVG logo set (full, icon‑only, monotone)

 Favicon 32×32, 192×192, 512×512 PNG + site.webmanifest

 Webfont subsets (woff2) for Montserrat 700 & Inter 400/600

 CSS variables sheet (shown above)

 Storybook/MDX components for buttons, badges, forms

