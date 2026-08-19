import { Link } from "expo-router";
import { type ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { fluid, useLayout } from "@/lib/layout";
import { MEASURE } from "@/theme";

/* ----------------------------------------------------------------- layout -- */

/** Centres content to the measure and applies the responsive gutter. */
export function Wrap({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { gutter } = useLayout();
  return (
    <View className={`w-full self-center ${className}`} style={{ maxWidth: MEASURE }}>
      <View style={{ paddingHorizontal: gutter }}>{children}</View>
    </View>
  );
}

/** Vertical rhythm between major sections, scaled down on small screens. */
export function Section({
  children,
  tight = false,
  className = "",
}: {
  children: ReactNode;
  tight?: boolean;
  className?: string;
}) {
  const { width } = useLayout();
  const pad = tight ? fluid(width, 44, 64) : fluid(width, 56, 88);
  return (
    <View className={className} style={{ paddingVertical: pad }}>
      {children}
    </View>
  );
}

/**
 * A grid of equal columns with a fixed gap. React Native has no CSS grid, so
 * the column width is computed from the available content width.
 */
export function Grid({
  children,
  cols,
  gap = 32,
  available,
}: {
  children: ReactNode[];
  cols: number;
  gap?: number;
  available: number;
}) {
  const colWidth = cols === 1 ? available : (available - gap * (cols - 1)) / cols;

  return (
    <View className="flex-row flex-wrap" style={{ gap }}>
      {children.map((child, i) => (
        <View key={i} style={{ width: colWidth }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------- typography -- */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text className="font-mono-md text-[11px] uppercase tracking-[1.5px] text-indigo">
      {children}
    </Text>
  );
}

export function Display({
  children,
  size = "lg",
  className = "",
}: {
  children: ReactNode;
  size?: "lg" | "sm";
  className?: string;
}) {
  const { width } = useLayout();
  const fontSize = size === "lg" ? fluid(width, 38, 76) : fluid(width, 34, 64);
  return (
    <Text
      className={`font-display text-navy ${className}`}
      style={{ fontSize, lineHeight: fontSize * 1.04, letterSpacing: -fontSize * 0.025 }}
    >
      {children}
    </Text>
  );
}

export function H2({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { width } = useLayout();
  const fontSize = fluid(width, 28, 36);
  return (
    <Text
      className={`font-display text-navy ${className}`}
      style={{ fontSize, lineHeight: fontSize * 1.15, letterSpacing: -fontSize * 0.02 }}
    >
      {children}
    </Text>
  );
}

export function H3({
  children,
  className = "text-navy",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { width } = useLayout();
  const fontSize = fluid(width, 22, 26);
  return (
    <Text
      className={`font-display ${className}`}
      style={{ fontSize, lineHeight: fontSize * 1.18, letterSpacing: -fontSize * 0.015 }}
    >
      {children}
    </Text>
  );
}

export function Lede({
  children,
  className = "text-indigo",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { width } = useLayout();
  const fontSize = fluid(width, 17, 19);
  return (
    <Text
      className={`font-sans ${className}`}
      style={{ fontSize, lineHeight: fontSize * 1.6 }}
    >
      {children}
    </Text>
  );
}

export function Prose({
  children,
  className = "text-indigo",
  size = 17,
}: {
  children: ReactNode;
  className?: string;
  size?: number;
}) {
  return (
    <Text
      className={`font-sans ${className}`}
      style={{ fontSize: size, lineHeight: size * 1.7 }}
    >
      {children}
    </Text>
  );
}

export function Chip({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <View
      className="self-start rounded-md border border-rule bg-blush"
      style={{ paddingVertical: small ? 6 : 7, paddingHorizontal: small ? 8 : 10 }}
    >
      <Text
        className="font-mono text-indigo"
        style={{ fontSize: small ? 10 : 11, letterSpacing: 0.6 }}
      >
        {children}
      </Text>
    </View>
  );
}

export function Rule({ className = "bg-rule" }: { className?: string }) {
  return <View className={`h-px w-full ${className}`} />;
}

/* ----------------------------------------------------------------- button -- */

type BtnVariant = "solid" | "ghost";

export function Btn({
  label,
  href,
  onPress,
  variant = "solid",
  arrow = false,
  full = false,
}: {
  label: string;
  href?: string;
  onPress?: () => void;
  variant?: BtnVariant;
  arrow?: boolean;
  full?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const bg =
    variant === "solid"
      ? hovered
        ? "bg-indigo"
        : "bg-navy"
      : hovered
        ? "bg-surface"
        : "bg-transparent";
  const border = variant === "ghost" ? "border border-rule" : "";
  const fg = variant === "solid" ? "text-blush" : "text-navy";

  const body = (
    <Pressable
      accessibilityRole={href ? "link" : "button"}
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={`flex-row items-center justify-center gap-2 rounded-full px-5 py-3 ${bg} ${border} ${
        full ? "w-full" : "self-start"
      }`}
    >
      <Text className={`font-sans-md text-[13px] ${fg}`}>{label}</Text>
      {arrow ? (
        <Text
          className={`font-sans-md text-[13px] ${fg}`}
          style={{ transform: [{ translateX: hovered ? 3 : 0 }] }}
        >
          →
        </Text>
      ) : null}
    </Pressable>
  );

  if (!href) return body;

  // External links (mailto:) leave the router alone.
  if (href.includes(":")) {
    return (
      <Link href={href as never} asChild>
        {body}
      </Link>
    );
  }

  return (
    <Link href={href as never} asChild>
      {body}
    </Link>
  );
}
