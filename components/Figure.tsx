import { type ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";

/** The white card every chart and table sits in. */
export function Figure({
  title,
  subtitle,
  children,
  footer,
  bodyPadding = 20,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  bodyPadding?: number;
}) {
  return (
    <View className="overflow-hidden rounded-[14px] border border-rule bg-surface">
      <View className="border-b border-rule-faint px-7 pb-[18px] pt-6">
        <Text className="font-sans-md text-[15px] leading-[21px] text-navy">{title}</Text>
        {subtitle ? (
          <Text className="mt-1.5 font-sans text-[13px] leading-[20px] text-indigo">
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: bodyPadding, paddingTop: 22, paddingBottom: 8 }}>
        {children}
      </View>

      {footer ? <View className="px-7 pb-[22px]">{footer}</View> : null}
    </View>
  );
}

/**
 * The `<details>` disclosure the HTML build used, rebuilt as state — every
 * chart keeps a table view so no value is reachable only by hovering.
 */
export function DataDisclosure({
  label = "View data",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        className="flex-row items-center gap-2 self-start"
      >
        <Text
          className={`font-mono text-[12px] ${hovered || open ? "text-navy" : "text-indigo"}`}
          style={{ width: 12, textAlign: "center" }}
        >
          {open ? "–" : "+"}
        </Text>
        <Text
          className={`font-mono text-[12px] ${hovered || open ? "text-navy" : "text-indigo"}`}
        >
          {label}
        </Text>
      </Pressable>

      {open ? <View className="mt-4">{children}</View> : null}
    </View>
  );
}

/** A minimal table: header row plus body rows, right-aligned numeric columns. */
export function DataTable({
  head,
  rows,
  numericFrom = 1,
}: {
  head: string[];
  rows: (string | number)[][];
  numericFrom?: number;
}) {
  return (
    <View>
      <View className="flex-row border-b border-rule pb-2.5">
        {head.map((h, i) => (
          <Text
            key={h}
            className="font-mono-md text-[11px] uppercase tracking-[0.9px] text-indigo"
            style={{ flex: 1, textAlign: i >= numericFrom ? "right" : "left" }}
          >
            {h}
          </Text>
        ))}
      </View>

      {rows.map((row, r) => (
        <View key={r} className="flex-row border-b border-rule-faint py-2.5">
          {row.map((cell, i) => (
            <Text
              key={i}
              className="font-sans text-[13px] text-navy"
              style={{ flex: 1, textAlign: i >= numericFrom ? "right" : "left" }}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
