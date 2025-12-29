import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        dark: {
          bg: "#0f172a",
          card: "#1e293b",
          border: "rgba(255, 255, 255, 0.05)",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Inter", "Geist", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "float-up": "floatUp 1s ease-out forwards",
      },
      keyframes: {
        floatUp: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-50px)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
