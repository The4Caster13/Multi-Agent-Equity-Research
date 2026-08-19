/**
 * The palette, mirrored from tailwind.config.js.
 *
 * Tailwind classes cover everything rendered as a View or Text. These literals
 * exist for the places that take a colour as a value rather than a class:
 * react-native-svg props, and the Node server's rendered email.
 */
export const palette = {
  blush: "#FFF2F2",
  periwinkle: "#A9B5DF",
  indigo: "#7886C7",
  navy: "#2D336B",
  surface: "#FFFFFF",
  ruleFaint: "#E6EAF7",
} as const;

export const fonts = {
  display: "Fraunces_400Regular",
  displayMedium: "Fraunces_500Medium",
  sans: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  mono: "DMMono_400Regular",
  monoMedium: "DMMono_500Medium",
} as const;

/** Max content width, and the page gutter at each breakpoint. */
export const MEASURE = 1180;

export const BREAKPOINTS = {
  /** Below this the page is a single column. */
  mid: 860,
  /** Below this multi-column grids drop to two columns. */
  wide: 1040,
} as const;
