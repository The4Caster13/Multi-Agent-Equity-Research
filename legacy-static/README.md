# Equity Labs — marketing site

Static, dependency-free site built from the `Equity Labs Site.dc.html` design
component and the four-colour palette. No build step: open `index.html`, or

```sh
python3 -m http.server 8000
```

## Pages

| File | Screen |
|---|---|
| `index.html` | How it works (landing) |
| `about.html` | About us |
| `feature.html` | Feature — Scenario modeling |

The design component switched these three screens with client-side state. Here
they are real pages, so each has its own URL, title, and description, and the
nav marks the current one with `aria-current="page"`.

## Palette

| Token | Hex | Role |
|---|---|---|
| `--blush` | `#FFF2F2` | page background |
| `--periwinkle` | `#A9B5DF` | rules, borders, active nav pill |
| `--indigo` | `#7886C7` | secondary text, links |
| `--navy` | `#2D336B` | primary text, dark band, data marks |

White (`#FFFFFF`) is the panel surface, and `--rule-faint` (`#E6EAF7`) is a
one-step-off-surface tint used only for gridlines and table rules.

Type: Fraunces (display), DM Sans (UI), DM Mono (labels, numerals).

## Charts

Both charts are hand-authored SVG in the markup — they render with JavaScript
disabled, and `app.js` only adds the hover layer on top.

They are deliberately **single-series**. The brand palette is three tints of one
hue, which makes a correct sequential ramp but fails as a categorical palette
(adjacent-pair separation ΔE 14.8, below the 15 floor), so nothing here encodes
identity by colour. Each chart carries a descriptive `aria-label` and a
`View data` table, so no value is reachable only by hovering.

## Notes for whoever picks this up

- `.reveal` scroll animations are gated behind a `js` class set in `<head>`, so
  content is never hidden when scripting is unavailable. Keep that gate if you
  add more.
- Placeholder content is marked as such: team headshots (`headshot_01`…) and the
  `example` email domains in the CTA links.
- Figures in the copy (`$4.2B`, `1,900`, `SOC 2`, the cap table, both charts) are
  illustrative and carried over from the design component. Replace before launch.
