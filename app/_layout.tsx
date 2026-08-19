import "../global.css";

import { DMMono_400Regular } from "@expo-google-fonts/dm-mono/400Regular";
import { DMMono_500Medium } from "@expo-google-fonts/dm-mono/500Medium";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { Fraunces_400Regular } from "@expo-google-fonts/fraunces/400Regular";
import { Fraunces_500Medium } from "@expo-google-fonts/fraunces/500Medium";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SiteHeader } from "@/components/SiteHeader";
import { palette } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    DMSans_400Regular,
    DMSans_500Medium,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Deliberately not gated on `fontsLoaded`: the static web export renders this
  // tree in Node at build time, and returning null there would ship empty HTML.
  // Text paints in the fallback face and swaps when the webfont arrives.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View className="flex-1 bg-blush">
        <SiteHeader />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.blush },
            animation: "none",
          }}
        />
      </View>
    </SafeAreaProvider>
  );
}
