# Equity Labs

The Equity Labs site as an **Expo / React Native** app that ships to web, iOS,
and Android from one codebase, styled with **Tailwind** (via NativeWind) and
served in production by **Node/Express**.

```sh
npm install
npm run agent      # research agent (Python) on :8000  — needed by the Feature page
npm run dev        # site on http://localhost:8081
npm run prod       # static export + Express on :3000
```

`dev` and `agent` are two processes: run them in separate terminals.

| Command | What it does |
|---|---|
| `npm run dev` | Expo dev server, web target (alias of `web`) |
| `npm run web` | the same thing |
| `npm run agent` | the ADK research agent behind the Feature page |
| `npm run agent:stub` | the same API, replaying a recorded run — no quota, no waiting |
| `npm run ios` / `npm run android` | the same screens as a native app |
| `npm run build:web` | static export → `dist/` |
| `npm run serve` | Express serves `dist/` on `:3000` |
| `npm run prod` | build then serve |

## About the stack

React Native has no web renderer of its own and Tailwind CSS does not run inside
React Native, so the three requested pieces fit together like this:

- **react-native-web** (bundled with Expo) compiles the React Native primitives
  to DOM elements. That is what makes this a website.
- **NativeWind** compiles Tailwind class names — real `tailwind.config.js`,
  real utility syntax — into React Native styles, on every platform.
- **Node** runs the Metro bundler and the Express host in `server/`.

`app.json` sets `web.output: "static"`, so `expo export` prerenders each route to
HTML. `/about` is a file on disk with its own `<title>` and meta description, not
a client-side redirect — the charts and copy are in the served markup before any
JavaScript runs.

## Layout

```
app/                 file-based routes; the URL structure is this directory
  _layout.tsx        fonts, header, Stack
  index.tsx          How it works        →  /
  about.tsx          About us            →  /about
  feature.tsx        Research agent      →  /feature
components/          header, footer, figure card, charts, research console
data/site.ts         all page copy and figures, in one file
lib/layout.ts        breakpoints, fluid type, column counts
lib/research.ts      client for the agent (SSE on web, POST on native)
theme.ts             palette + font family names
tailwind.config.js   the same palette as Tailwind tokens
server/index.js      Express: static host, waitlist API, agent proxy
service/main.py      FastAPI wrapper around my_agent's root_agent
my_agent/            the ADK research pipeline (Python, unmodified)
legacy-static/       the previous hand-written HTML/CSS build
```

## Palette

| Token | Hex | Role |
|---|---|---|
| `blush` | `#FFF2F2` | page background |
| `periwinkle` | `#A9B5DF` | rules, borders, active nav pill |
| `indigo` | `#7886C7` | secondary text, links |
| `navy` | `#2D336B` | primary text, dark band, data marks |

Plus `surface` (`#FFFFFF`) for panels and `rule-faint` (`#E6EAF7`) for gridlines.
`indigo` intentionally shadows Tailwind's default indigo scale so an off-palette
`indigo-500` cannot slip in.

Type is Fraunces / DM Sans / DM Mono, loaded through `@expo-google-fonts` so the
native builds get the same faces as the web build. React Native bakes weight into
the family name, so there is no `font-medium` — use `font-sans-md`, `font-mono-md`,
`font-display-md`.

## What React Native changed

These are real differences from the CSS build, not oversights:

- **No media queries.** `lib/layout.ts` reads `useWindowDimensions()` and returns
  breakpoints, gutters, and column counts as values.
- **No `clamp()`.** `fluid(width, min, max)` interpolates the same curve.
- **No CSS grid.** `<Grid>` computes column widths from the available content
  width.
- **No `<details>`.** The chart data tables are a `DataDisclosure` component.
- **No `repeating-linear-gradient`.** The placeholder hatch is an SVG pattern
  (`components/SlotFill.tsx`).
- **Charts are `react-native-svg`**, so the same geometry renders on all three
  platforms. They size from the viewBox so they appear in the prerendered HTML;
  the hover layer waits for a measured width, since it needs pixels.

## Charts

Both are deliberately **single-series**. The brand palette is three tints of one
hue — a valid sequential ramp, but it fails as a categorical palette
(adjacent-pair separation ΔE 14.8, below the 15 floor), so nothing encodes
identity by colour. Each chart carries a descriptive `aria-label` and a
`View data` table, so no value is reachable only by hovering.

## The research agent

The Feature page runs `my_agent` — a Google ADK pipeline on Gemini 2.5 Flash.
Type a ticker and `pm_agent` scopes it into a `ProjectBrief` — the mandate
plus a per-desk workstream — then the analyst agents it marks core or
supporting (balance sheet, valuation, technicals, macro) fan out over
yfinance/OpenBB data and search;
`vp_agent` reconciles their notes into a `ConsensusReport`; `drafting_agent`
writes the report. **A real run takes roughly 2–3 minutes.**

The website cannot import a Python agent, so `service/main.py` wraps it:

```
browser ──► Express :3000 ──► FastAPI :8000 ──► root_agent (ADK)
            /api/research*      /research*
```

| Endpoint | Purpose |
|---|---|
| `GET /research/stream?ticker=` | SSE: progress events, then the report. Used on web. |
| `POST /research` | Blocking. Used on native, which has no `EventSource`. |
| `GET /health` | Liveness. |

Progress streams because a 2–3 minute spinner is not a UI. Each event names the
agent currently working, and the console shows the last few.

The run returns both the drafted prose **and** the structured `ConsensusReport`,
so the page can show overall stance, analyst agreement, the VP's approval, any
flagged conflicts, and per-analyst notes with confidence and data gaps — not just
a wall of text.

Requires `GOOGLE_API_KEY` in `my_agent/.env` (already there), and the Python
interpreter that has `google-adk` installed — `python3.11` on this machine, which
is what the `agent` script calls.

### Working on the report UI

`npm run agent:stub` serves the same API from `service/fixtures/sample_report.json`,
a recorded AAPL run. Same shape, same streaming, no model calls and no two-minute
wait per reload. It replays the recorded text whatever ticker you type.

## The waitlist API

`POST /api/access-requests` takes `{ email, company?, note? }`, validates, and
appends to `server/access-requests.jsonl`. A file is the right amount of database
for a waitlist; swap it for a real one when there is a real one.

## Before launch

- Team headshots are placeholders (`headshot_01`…), and the CTA links point at
  `example` domains.
- Every figure — `$4.2B`, `1,900`, `SOC 2`, the cap table, both charts — is
  illustrative.
- `legacy-static/` is the previous plain HTML/CSS site, kept for reference. Delete
  it once you are happy with this one.
