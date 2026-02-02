import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        oltremare: {
          950: "#061225",
          900: "#081a33",
          800: "#0b2447",
          700: "#0f2f5f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
