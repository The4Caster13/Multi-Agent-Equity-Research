import { Link, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useLayout } from "@/lib/layout";
import { Btn, Wrap } from "@/components/ui";

const ACCESS_MAILTO = "mailto:access@equitylabs.example?subject=Request%20access";

const NAV = [
  { href: "/", label: "How it works" },
  { href: "/about", label: "About us" },
  { href: "/feature", label: "Feature" },
] as const;

function NavLink({
  href,
  label,
  current,
  stacked,
}: {
  href: string;
  label: string;
  current: boolean;
  stacked: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityRole="link"
        aria-current={current ? "page" : undefined}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        className={`rounded-full ${stacked ? "px-4 py-3" : "px-4 py-2.5"} ${
          current ? "bg-periwinkle" : hovered ? "bg-periwinkle/40" : "bg-transparent"
        } ${stacked ? "w-full" : ""}`}
      >
        <Text
          className={`${current ? "font-sans-md" : "font-sans"} text-navy`}
          style={{ fontSize: stacked ? 15 : 13 }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

export function SiteHeader() {
  const { isMid } = useLayout();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The panel is a small-screen affordance; widening the window closes it.
  useEffect(() => {
    if (isMid) setOpen(false);
  }, [isMid]);

  return (
    <View className="border-b border-rule bg-blush">
      <Wrap>
        <View
          className={
            isMid
              ? "flex-row items-center justify-between gap-6 py-[18px]"
              : "py-3.5"
          }
        >
          <View className={isMid ? "" : "flex-row items-center justify-between"}>
            <Link href="/" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Equity Labs, home"
                className="flex-row items-center gap-3"
              >
                <View className="h-[22px] w-[22px] rounded-full bg-navy" />
                <Text className="font-sans-md text-[17px] text-navy">Equity Labs</Text>
              </Pressable>
            </Link>

            {isMid ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onPress={() => setOpen((v) => !v)}
                className="h-[42px] w-[42px] items-center justify-center rounded-full border border-rule"
              >
                <View className="gap-[4px]">
                  <View className="h-[1.5px] w-4 bg-navy" />
                  <View className="h-[1.5px] w-4 bg-navy" />
                  <View className="h-[1.5px] w-4 bg-navy" />
                </View>
              </Pressable>
            )}
          </View>

          {isMid ? (
            <>
              <View className="flex-row items-center gap-1">
                {NAV.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    current={pathname === item.href}
                    stacked={false}
                  />
                ))}
              </View>
              <Btn label="Request access" href={ACCESS_MAILTO} />
            </>
          ) : open ? (
            <View className="mt-3 gap-0.5 border-t border-rule pt-3">
              {NAV.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  current={pathname === item.href}
                  stacked
                />
              ))}
              <View className="mt-2">
                <Btn label="Request access" href={ACCESS_MAILTO} full />
              </View>
            </View>
          ) : null}
        </View>
      </Wrap>
    </View>
  );
}
