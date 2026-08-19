/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // The four brand colours plus the two neutrals they need. `indigo`
      // deliberately shadows Tailwind's default indigo scale so an off-palette
      // `indigo-500` can never slip into the design.
      colors: {
        blush: "#FFF2F2",
        periwinkle: "#A9B5DF",
        indigo: "#7886C7",
        navy: "#2D336B",
        surface: "#FFFFFF",
        rule: "#A9B5DF",
        "rule-faint": "#E6EAF7",
      },
      // React Native bakes weight into the family name, so there is no
      // font-medium — pick the family that already is medium.
      fontFamily: {
        display: ["Fraunces_400Regular"],
        "display-md": ["Fraunces_500Medium"],
        sans: ["DMSans_400Regular"],
        "sans-md": ["DMSans_500Medium"],
        mono: ["DMMono_400Regular"],
        "mono-md": ["DMMono_500Medium"],
      },
    },
  },
  plugins: [],
};
