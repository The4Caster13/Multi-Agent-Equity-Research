import { useState } from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { PREFERENCE_STACK, payoutCurve } from "@/data/site";
import { useLayout } from "@/lib/layout";
import { fonts, palette } from "@/theme";

import { Tooltip } from "@/components/DistributionChart";

const VB_W = 720;
const VB_H = 320;
const PLOT = { left: 64, right: 684, top: 16, bottom: 268 };
const MAX_EXIT = 400;
const MAX_PAYOUT = 180;
const Y_TICKS = [0, 45, 90, 135, 180];
const X_TICKS = [0, 100, 200, 300, 400];

const xOf = (exit: number) =>
  PLOT.left + (exit / MAX_EXIT) * (PLOT.right - PLOT.left);
const yOf = (v: number) =>
  PLOT.bottom - (v / MAX_PAYOUT) * (PLOT.bottom - PLOT.top);

/** The curve is flat to the preference stack, then linear — include the kink. */
const vertices = [
  { x: xOf(0), y: yOf(0) },
  { x: xOf(PREFERENCE_STACK), y: yOf(0) },
  ...payoutCurve
    .filter((p) => p.exit > PREFERENCE_STACK)
    .map((p) => ({ x: xOf(p.exit), y: yOf(p.toCommon) })),
];

const linePath = vertices
  .map((v, i) => `${i === 0 ? "M" : "L"}${v.x},${v.y}`)
  .join(" ");

const areaPath = `${linePath} L${PLOT.right},${PLOT.bottom} Z`;

const last = payoutCurve[payoutCurve.length - 1];

export function PayoutChart() {
  const { isMid } = useLayout();
  const [chartWidth, setChartWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const scale = chartWidth / VB_W;

  const axisSize = isMid ? 12 : 16;
  const labelSize = isMid ? 13 : 18;
  const noteSize = isMid ? 12 : 15;

  const bandWidth = (PLOT.right - PLOT.left) / (payoutCurve.length - 1);

  const onLayout = (e: LayoutChangeEvent) =>
    setChartWidth(e.nativeEvent.layout.width);

  // Sized from the viewBox so the marks render during static export, where
  // onLayout never fires; only the interaction layer needs measured pixels.
  return (
    <View onLayout={onLayout} style={{ width: "100%", aspectRatio: VB_W / VB_H }}>
      <>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            accessibilityRole="image"
            aria-label={
              `Line chart of proceeds to common against exit value. Common receives nothing below a $${PREFERENCE_STACK}M exit, ` +
              `where the liquidation preference stack clears. Above that the payout rises linearly, reaching $${last.toCommon}M at a $${last.exit}M exit.`
            }
          >
            {Y_TICKS.map((t) => (
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

            {Y_TICKS.map((t) => (
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

            {/* Where the preference stack clears */}
            <Line
              x1={xOf(PREFERENCE_STACK)}
              y1={PLOT.bottom}
              x2={xOf(PREFERENCE_STACK)}
              y2={104}
              stroke={palette.periwinkle}
              strokeWidth={1}
            />
            <SvgText
              x={xOf(PREFERENCE_STACK) + 8}
              y={108}
              fontFamily={fonts.mono}
              fontSize={noteSize}
              fill={palette.indigo}
            >
              {`preference stack clears · $${PREFERENCE_STACK}M`}
            </SvgText>

            <Path d={areaPath} fill={palette.indigo} opacity={0.12} />
            <Path
              d={linePath}
              fill="none"
              stroke={palette.navy}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {active !== null ? (
              <Line
                x1={xOf(payoutCurve[active].exit)}
                y1={PLOT.top}
                x2={xOf(payoutCurve[active].exit)}
                y2={PLOT.bottom}
                stroke={palette.periwinkle}
                strokeWidth={1}
              />
            ) : null}

            {/* Endpoint marker carries a surface ring so it stays legible */}
            <Circle
              cx={xOf(last.exit)}
              cy={yOf(last.toCommon)}
              r={4.5}
              fill={palette.navy}
              stroke={palette.surface}
              strokeWidth={2}
            />
            <SvgText
              x={xOf(last.exit) - 8}
              y={30}
              textAnchor="end"
              fontFamily={fonts.sansMedium}
              fontSize={labelSize}
              fill={palette.navy}
            >
              {`$${last.toCommon}M`}
            </SvgText>

            {active !== null ? (
              <Circle
                cx={xOf(payoutCurve[active].exit)}
                cy={yOf(payoutCurve[active].toCommon)}
                r={4.5}
                fill={palette.navy}
                stroke={palette.surface}
                strokeWidth={2}
              />
            ) : null}

            {X_TICKS.map((t) => (
              <SvgText
                key={`x${t}`}
                x={xOf(t)}
                y={PLOT.bottom + 24}
                textAnchor="middle"
                fontFamily={fonts.mono}
                fontSize={axisSize}
                fill={palette.indigo}
              >
                {t === 0 ? "$0" : `$${t}M`}
              </SvgText>
            ))}
            <SvgText
              x={(PLOT.left + PLOT.right) / 2}
              y={PLOT.bottom + 46}
              textAnchor="middle"
              fontFamily={fonts.mono}
              fontSize={axisSize}
              fill={palette.indigo}
            >
              exit value
            </SvgText>
          </Svg>

          {chartWidth > 0 && payoutCurve.map((p, i) => (
            <Pressable
              key={p.exit}
              accessibilityRole="button"
              accessibilityLabel={`$${p.exit}M exit: common receives $${p.toCommon}M`}
              onHoverIn={() => setActive(i)}
              onHoverOut={() => setActive(null)}
              onPressIn={() => setActive(i)}
              onPressOut={() => setActive(null)}
              style={{
                position: "absolute",
                left: (xOf(p.exit) - bandWidth / 2) * scale,
                top: PLOT.top * scale,
                width: bandWidth * scale,
                height: (PLOT.bottom - PLOT.top) * scale,
              }}
            />
          ))}

          {active !== null ? (
            <Tooltip
              left={xOf(payoutCurve[active].exit) * scale}
              top={yOf(payoutCurve[active].toCommon) * scale}
              chartWidth={chartWidth}
              label={`$${payoutCurve[active].exit}M exit`}
              value={`Common: $${payoutCurve[active].toCommon}M`}
            />
          ) : null}
      </>
    </View>
  );
}
