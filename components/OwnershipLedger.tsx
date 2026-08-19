import { Text, View } from "react-native";

import { ownership } from "@/data/site";
import { useLayout } from "@/lib/layout";

/**
 * Ownership by share class. The proportional bar is a single-hue magnitude
 * mark, not a categorical one — the row label carries identity.
 */
export function OwnershipLedger() {
  const { isMid } = useLayout();

  return (
    <View>
      <View className="flex-row items-end border-b border-rule pb-3">
        <Text className="flex-[1.6] font-mono-md text-[11px] uppercase tracking-[0.9px] text-indigo">
          Share class
        </Text>
        {isMid ? (
          <Text className="flex-1 font-mono-md text-[11px] uppercase tracking-[0.9px] text-indigo">
            Fully diluted
          </Text>
        ) : null}
        <Text className="flex-1 text-right font-mono-md text-[11px] uppercase tracking-[0.9px] text-indigo">
          Shares
        </Text>
        <Text className="w-14 text-right font-mono-md text-[11px] uppercase tracking-[0.9px] text-indigo">
          %
        </Text>
      </View>

      {ownership.map((row, i) => (
        <View
          key={row.holder}
          className={`flex-row items-center py-3.5 ${
            i === ownership.length - 1 ? "" : "border-b border-rule-faint"
          }`}
        >
          <View className="flex-[1.6] pr-4">
            <Text className="font-sans-md text-[14px] text-navy">{row.holder}</Text>
            <Text className="mt-0.5 font-mono text-[12px] text-indigo">{row.meta}</Text>
          </View>

          {isMid ? (
            <View className="flex-1 pr-4">
              <View className="h-2 overflow-hidden rounded-full bg-rule-faint">
                <View
                  className="h-full rounded-full bg-navy"
                  style={{ width: `${row.pct}%` }}
                />
              </View>
            </View>
          ) : null}

          <Text className="flex-1 text-right font-sans text-[14px] text-navy">
            {row.shares}
          </Text>
          <Text className="w-14 text-right font-sans text-[14px] text-navy">
            {row.pct}%
          </Text>
        </View>
      ))}
    </View>
  );
}
