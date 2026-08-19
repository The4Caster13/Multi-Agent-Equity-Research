import { useState } from "react";
import { LayoutChangeEvent, Pressable, Text, View } from "react-native";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";

import { distribution } from "@/data/site";
import { useLayout } from "@/lib/layout";
import { fonts, palette } from "@/theme";

/*
 * Single series, one hue. The brand palette is three tints of one hue, which is
 * a valid sequential ramp but fails as a categorical one (adjacent-pair
 * separation ΔE 14.8, under the 15 floor), so nothing here encodes identity by
 * colour — the axis does that.
 */

const VB_W = 720;
const VB_H = 320;
const PLOT = { left: 56, right: 700, top: 16, bottom: 268 };
const MAX = 60;
const TICKS = [0, 15, 30, 45, 60];
const BAR_W = 24;

const band = (PLOT.right - PLOT.left) / distribution.length;
const centreOf = (i: number) => PLOT.left + band * (i + 0.5);
const yOf = (v: number) => PLOT.bottom - (v / MAX) * (PLOT.bottom - PLOT.top);

/**
 * 4px rounded cap, square at the baseline. The explicit `H` back to the left
 * edge matters: without it `Z` closes on the diagonal and the bar renders as a
 * wedge.
 */
function barPath(i: number, value: number) {
  const x = centreOf(i) - BAR_W / 2;
  const top = yOf(value);
  return `M${x},${top + 4} q0,-4 4,-4 h${BAR_W - 8} q4,0 4,4 V${PLOT.bottom} H${x} Z`;
}

const peakIndex = distribution.reduce(
  (best, d, i) => (d.value > distribution[best].value ? i : best),
  0
);

export function DistributionChart() {
  const { isMid } = useLayout();
  const [chartWidth, setChartWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const scale = chartWidth / VB_W;

  // SVG text is measured in viewBox units, so it shrinks with the chart —
  // scale the type back up as the card narrows.
  const axisSize = isMid ? 12 : 16;
  const labelSize = isMid ? 13 : 18;

  const onLayout = (e: LayoutChangeEvent) =>
    setChartWidth(e.nativeEvent.layout.width);

  // The SVG sizes itself from the viewBox so it renders during static export,
  // where onLayout never fires. Only the interaction layer waits for a measured
  // width, because it needs pixels.
  return (
    <View onLayout={onLayout} style={{ width: "100%", aspectRatio: VB_W / VB_H }}>
      <>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            accessibilityRole="image"
            aria-label={
              "Column chart of distribution by holder at a $180M exit. " +
              distribution.map((d) => `${d.holder} ${d.value} million`).join(", ") +
              "."
            }
          >
            {TICKS.map((t) => (
              <Line
                key={t}
                x1={PLOT.left}
                y1={yOf(t)}
                x2={PLOT.right}
                y2={yOf(t)}
                stroke={palette.ruleFaint}
                strokeWidth={1}
              />
            ))}

            {TICKS.map((t) => (
              <SvgText
                key={`y${t}`}
                x={PLOT.left - 12}
                y={yOf(t) + 4}
                textAnchor="end"
                fontFamily={fonts.mono}
                fontSize={axisSize}
                fill={palette.indigo}
              >
                {t === 0 ? "$0" : `$${t}M`}
              </SvgText>
            ))}

            {distribution.map((d, i) => (
              <Path
                key={d.holder}
                d={barPath(i, d.value)}
                fill={palette.navy}
                opacity={active === null || active === i ? 1 : 0.45}
              />
            ))}

            {/* One direct label, on the extreme */}
            <SvgText
              x={centreOf(peakIndex)}
              y={yOf(distribution[peakIndex].value) - 10}
              textAnchor="middle"
              fontFamily={fonts.sansMedium}
              fontSize={labelSize}
              fill={palette.navy}
            >
              {`$${distribution[peakIndex].value.toFixed(1)}M`}
            </SvgText>

            {distribution.map((d, i) => (
              <SvgText
                key={`x${d.holder}`}
                x={centreOf(i)}
                y={PLOT.bottom + 24}
                textAnchor="middle"
                fontFamily={fonts.mono}
                fontSize={axisSize}
                fill={palette.indigo}
              >
                {d.short}
              </SvgText>
            ))}
          </Svg>

          {/* Hover targets, wider than the marks */}
          {chartWidth > 0 && distribution.map((d, i) => (
            <Pressable
              key={`hit-${d.holder}`}
              accessibilityRole="button"
              accessibilityLabel={`${d.holder}: $${d.value.toFixed(1)}M, ${d.share}%`}
              onHoverIn={() => setActive(i)}
              onHoverOut={() => setActive(null)}
              onPressIn={() => setActive(i)}
              onPressOut={() => setActive(null)}
              style={{
                position: "absolute",
                left: (PLOT.left + band * i) * scale,
                top: PLOT.top * scale,
                width: band * scale,
                height: (PLOT.bottom - PLOT.top) * scale,
              }}
            />
          ))}

          {active !== null ? (
            <Tooltip
              left={centreOf(active) * scale}
              top={yOf(distribution[active].value) * scale}
              chartWidth={chartWidth}
              label={distribution[active].holder}
              value={`$${distribution[active].value.toFixed(1)}M · ${distribution[active].share}%`}
            />
          ) : null}
      </>
    </View>
  );
}

export function Tooltip({
  left,
  top,
  chartWidth,
  label,
  value,
}: {
  left: number;
  top: number;
  chartWidth: number;
  label: string;
  value: string;
}) {
  const WIDTH = 168;
  const clamped = Math.max(
    WIDTH / 2 + 4,
    Math.min(left, chartWidth - WIDTH / 2 - 4)
  );

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: clamped - WIDTH / 2,
        top: Math.max(0, top - 62),
        width: WIDTH,
      }}
      className="rounded-lg border border-rule bg-surface px-3 py-2.5"
    >
      <Text className="font-mono text-[10px] uppercase tracking-[0.6px] text-indigo">
        {label}
      </Text>
      <Text className="mt-1 font-sans-md text-[12px] text-navy">{value}</Text>
    </View>
  );
}
