import type { Config } from "tailwindcss";

/*
  Tailwind v4 config — minimal.

  All design tokens (colors, fonts, tracking, etc.) live in
  client/src/styles/design-tokens.css inside an `@theme inline` block.
  That file is the SINGLE SOURCE OF TRUTH for the project's visual system.
  Do NOT add tokens here — add them to design-tokens.css and they will be
  auto-exposed as Tailwind utilities.

  This file only retains:
    - content globs (kept explicit for scanner determinism)
    - darkMode strategy (legacy, not actively toggled)
*/
export default {
	darkMode: "class",
	content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
} satisfies Config;
