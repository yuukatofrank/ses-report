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
        brand: {
          dark: "#1a1a2e",
          accent: "#0f6e56",
          "accent-light": "#138a6b",
          bg: "#f7f7f5",
        },
      },
      fontFamily: {
        sans: [
          '"Hiragino Kaku Gothic Pro"',
          '"Yu Gothic"',
          "Meiryo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
