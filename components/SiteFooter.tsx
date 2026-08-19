import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useLayout } from "@/lib/layout";
import { Wrap } from "@/components/ui";

const LINKS = ["Security", "Privacy", "Contact"];

function FooterLink({ label }: { label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="link"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      <Text className={`font-sans text-[13px] ${hovered ? "text-navy" : "text-indigo"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SiteFooter() {
  const { isMid } = useLayout();

  return (
    <View className="border-t border-rule bg-surface">
      <Wrap>
        <View
          className={`py-10 ${
            isMid ? "flex-row items-center justify-between gap-6" : "gap-4"
          }`}
        >
          <Text className="font-mono text-[12px] text-indigo">
            © {new Date().getFullYear()} Equity Labs
          </Text>
          <View className="flex-row gap-6">
            {LINKS.map((label) => (
              <FooterLink key={label} label={label} />
            ))}
          </View>
        </View>
      </Wrap>
    </View>
  );
}
