import type { Config } from "tailwindcss";

// Adobe brand palette from docs/DESIGN_SYSTEM.md. Color used with restraint:
// black text on white with generous whitespace, red for the one thing that
// matters. Verdict colors follow Option A (restrained semantic colors).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        adobe: "#EB1000",
        ink: {
          DEFAULT: "#000000",
          900: "#292929",
          500: "#5F5F5F",
          300: "#BDBDBD",
          100: "#F2F2F2",
        },
        verdict: {
          authentic: "#1A7F37",
          unknown: "#5F5F5F",
          tampered: "#EB1000",
          ai: "#B25E00",
        },
      },
      fontFamily: {
        sans: [
          '"Adobe Clean"',
          '"Source Sans 3"',
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ['"SF Mono"', "ui-monospace", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        card: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
