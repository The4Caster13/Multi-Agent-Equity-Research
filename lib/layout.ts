import { useWindowDimensions } from "react-native";

import { BREAKPOINTS, MEASURE } from "@/theme";

/**
 * React Native has no media queries and no clamp(), so the responsive rules the
 * CSS build expressed declaratively are computed here instead and passed down
 * as plain values.
 */
export type Layout = {
  width: number;
  /** >= 1040: full four/three-column grids. */
  isWide: boolean;
  /** >= 860: side-by-side sections, horizontal header. */
  isMid: boolean;
  /** Horizontal page padding. */
  gutter: number;
  /** Width available to content inside the gutters. */
  contentWidth: number;
};

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINTS.wide;
  const isMid = width >= BREAKPOINTS.mid;
  const gutter = isWide ? 56 : isMid ? 36 : 24;

  return {
    width,
    isWide,
    isMid,
    gutter,
    contentWidth: Math.min(width, MEASURE) - gutter * 2,
  };
}

/**
 * Stand-in for CSS clamp(): interpolates between `min` and `max` across the
 * viewport range, so headings scale the way they did in the stylesheet.
 */
export function fluid(
  width: number,
  min: number,
  max: number,
  minViewport = 360,
  maxViewport = 1440
): number {
  const t = Math.min(
    1,
    Math.max(0, (width - minViewport) / (maxViewport - minViewport))
  );
  return Math.round(min + (max - min) * t);
}

/** Columns for a grid that collapses as the viewport narrows. */
export function columns(layout: Layout, wide: number, mid: number): number {
  if (layout.isWide) return wide;
  if (layout.isMid) return mid;
  return 1;
}
