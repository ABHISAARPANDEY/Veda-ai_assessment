import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#EAEBEB",
        card: "#FFFFFF",
        inset: "#F5F5F5",
        surface2: "#F0F0F0",
        primary: "#1A1A1A",
        secondary: "#7A7A7A",
        muted: "#A9A9A9",
        border: "#E5E5E5",
        dashed: "#D4D4D4",
        accent: "#F26B3A",
        accentSoft: "#FFE4D9",
        statusGreen: "#1AB45D",
        danger: "#E03131",
        diffEasy: "#1F8B4D",
        diffMedium: "#B86E00",
        diffHard: "#C7361C",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        cardLg: "0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)",
        toolkitGlow: "0 0 0 1px rgba(242,107,58,0.6), 0 0 24px rgba(242,107,58,0.25)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")({ strategy: "class" })],
};

export default config;
