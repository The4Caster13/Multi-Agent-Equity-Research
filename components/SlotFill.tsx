import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { palette } from "@/theme";

/**
 * The diagonal hatch that marks an unfilled image slot. CSS did this with
 * repeating-linear-gradient, which React Native has no equivalent for, so it is
 * an SVG pattern instead.
 */
export function SlotFill({ id }: { id: string }) {
  const patternId = `slot-${id}`;

  return (
    <Svg
      width="100%"
      height="100%"
      style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <Pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={22}
          height={22}
          patternTransform="rotate(45)"
        >
          <Rect x={0} y={0} width={22} height={22} fill={palette.surface} />
          <Rect x={0} y={0} width={11} height={22} fill={palette.blush} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
    </Svg>
  );
}
