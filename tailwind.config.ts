import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1100px" } },
    extend: {
      colors: {
        cream: "var(--cream)",
        surface: "var(--surface)",
        "surface-sunken": "var(--surface-sunken)",
        border: "var(--border)",
        ink: { DEFAULT: "var(--ink)", muted: "var(--ink-muted)", faint: "var(--ink-faint)" },
        red: { DEFAULT: "var(--red)", strong: "var(--red-strong)" },
        green: "var(--green)",
        blue: "var(--blue)",
        gold: "var(--gold)",
        amber: "var(--amber)",
        flap: { top: "var(--flap-top)", bottom: "var(--flap-bottom)", ink: "var(--flap-ink)" },
        input: "var(--border)",
        ring: "var(--red)",
      },
      fontFamily: {
        marcador: ["var(--font-rajdhani)", "sans-serif"],
        sans: ["var(--font-archivo)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 5px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        flip: { "0%": { transform: "rotateX(-90deg)" }, "100%": { transform: "rotateX(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        flip: "flip 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
