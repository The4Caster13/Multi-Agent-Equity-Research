/**
 * All page copy and figures in one place — the same role `renderVals()` played
 * in the original design component.
 *
 * Every number here is illustrative. Replace before launch.
 */

export const steps = [
  {
    n: "01",
    title: "Connect the documents",
    body: "Term sheets, SAFEs, and option grants come in as-is. We parse the terms that move the waterfall — liquidation preference, participation, seniority, conversion.",
  },
  {
    n: "02",
    title: "Reconcile ownership",
    body: "Every share class is checked against the source document, and conflicts surface before they compound. Nothing is carried forward on trust.",
  },
  {
    n: "03",
    title: "Model and distribute",
    body: "Run exit scenarios, then publish a statement each holder can open and verify themselves — down to the clause it came from.",
  },
];

export const stats = [
  { v: "$4.2B", k: "Equity under management" },
  { v: "1,900", k: "Cap tables reconciled" },
  { v: "11 days", k: "Average close time saved" },
  { v: "SOC 2", k: "Type II certified" },
];

export const aboutStats = [
  { v: "2022", k: "Founded in New York" },
  { v: "31", k: "People, four time zones" },
  { v: "6", k: "Former fund controllers" },
  { v: "SOC 2", k: "Type II certified" },
];

export const values = [
  {
    title: "Auditable by default",
    body: "If a number cannot be traced to a document, it does not ship. Every figure in the product carries a path back to the clause that produced it.",
  },
  {
    title: "Boring on purpose",
    body: "Finance infrastructure should be predictable. We optimize for no surprises — no silent migrations, no recalculated history, no clever defaults.",
  },
  {
    title: "Built with controllers",
    body: "Every release is reviewed by the people who close the books. If it does not survive a quarter-end, it does not leave the branch.",
  },
];

export const team = [
  { name: "Name Surname", role: "Co-founder, CEO", slot: "headshot_01" },
  { name: "Name Surname", role: "Co-founder, CTO", slot: "headshot_02" },
  { name: "Name Surname", role: "Head of Finance Ops", slot: "headshot_03" },
  { name: "Name Surname", role: "General Counsel", slot: "headshot_04" },
];

export const scenarioNotes = [
  {
    title: "Term overrides",
    body: "Change a preference multiple, toggle participation, add a cap, or convert a class — one field at a time, each with its own audit line.",
  },
  {
    title: "Side-by-side diff",
    body: "Any two scenarios compare holder by holder. Rows that moved are flagged with the term that moved them, not just the delta.",
  },
  {
    title: "Signed statements",
    body: "Publish a scenario and each holder gets a statement they can verify independently — same math, same sources, no spreadsheet attached.",
  },
];

export const awkwardQuestions = [
  {
    title: '"What if we take the bridge instead?"',
    body: "Model the note alongside the priced round. See where the discount and the cap actually bind, and what each does to the common pool at three exit values.",
  },
  {
    title: '"Does the new pool come before or after?"',
    body: "Pre-money and post-money pool expansions are separate scenarios, not a footnote. The dilution lands on whoever the term says it lands on.",
  },
  {
    title: '"Who is actually underwater at $90M?"',
    body: "Sweep the exit value and the answer comes back as a list of names and a break-even point — with the clause that produced each one attached.",
  },
];

/** Distribution at a $180M exit. Sums to 180.0. */
export const distribution = [
  { holder: "Series B preferred", short: "Series B", value: 52.0, share: 28.9 },
  { holder: "Series A preferred", short: "Series A", value: 34.5, share: 19.2 },
  { holder: "Seed preferred", short: "Seed", value: 21.8, share: 12.1 },
  { holder: "Common", short: "Common", value: 48.2, share: 26.8 },
  { holder: "Option pool", short: "Options", value: 17.4, share: 9.7 },
  { holder: "Advisors", short: "Advisors", value: 6.1, share: 3.4 },
];

export const ownership = [
  { holder: "Common", meta: "founders + employees", shares: "14,208,400", pct: 38.4 },
  { holder: "Series B", meta: "1× non-participating", shares: "8,177,000", pct: 22.1 },
  { holder: "Series A", meta: "1× non-participating", shares: "6,253,300", pct: 16.9 },
  { holder: "Seed", meta: "converted SAFEs", shares: "4,218,900", pct: 11.4 },
  { holder: "Option pool", meta: "granted + available", shares: "4,144,400", pct: 11.2 },
];

/** The preference stack the exit has to clear before common sees a dollar. */
export const PREFERENCE_STACK = 120;
/** Common's share of every dollar above the stack. */
export const COMMON_PARTICIPATION = 0.57;

/** Payout to common as the exit value is swept from $0 to $400M. */
export const payoutCurve = [0, 50, 100, 150, 200, 250, 300, 350, 400].map(
  (exit) => {
    const toCommon = Math.max(
      0,
      (exit - PREFERENCE_STACK) * COMMON_PARTICIPATION
    );
    return {
      exit,
      toCommon: Math.round(toCommon * 10) / 10,
      toPreferred: Math.round((exit - toCommon) * 10) / 10,
    };
  }
);
