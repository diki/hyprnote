import type { Config } from "tailwindcss";
import uiConfig from "@hypr/ui/tailwind.config";

const config = {
  presets: [uiConfig],
  content: [
    "src/**/*.{js,ts,jsx,tsx}",
    "index.html",
    "../../packages/ui/src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        "racing-sans": ["Racing Sans One", "cursive"],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
