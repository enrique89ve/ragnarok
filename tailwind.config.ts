import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Norse/Runeterra inspired color palette
      colors: {
        // Primary Norse gold tones
        norse: {
          gold: "#FFD700",
          "gold-light": "#FFF3D4",
          "gold-dark": "#B8860B",
          amber: "#92400e",
          "amber-dark": "#78350f",
        },
        // Card rarity colors (Hearthstone/Runeterra style)
        rarity: {
          basic: "#9CA3AF",
          common: "#D1D5DB",
          rare: "#3B82F6",
          epic: "#A855F7",
          mythic: "#F59E0B",
          token: "#6B7280",
        },
        // Game UI colors
        game: {
          bg: "hsl(var(--background))",
          card: "hsl(var(--card))",
          mana: "#0EA5E9",
          health: "#EF4444",
          attack: "#FBBF24",
          armor: "#6B7280",
        },
        // Shadcn/ui compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      // Card-specific sizing
      spacing: {
        "card-w": "var(--card-width, 130px)",
        "card-h": "var(--card-height, 185px)",
      },

      // Border radius following Runeterra style
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "8px",
        "card-lg": "12px",
      },

      // Card shadows and glows
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
        "card-playable": "var(--card-playable-glow)",
        "card-targetable": "var(--card-targetable-glow)",
        "card-legendary": "var(--card-legendary-glow)",
        "card-epic": "var(--card-epic-glow)",
      },

      // Game-specific animations
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        cardFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        cardPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.02)", opacity: "0.95" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "card-float": "cardFloat 3s ease-in-out infinite",
        "card-pulse": "cardPulse 2s ease-in-out infinite",
        "glow-pulse": "glowPulse 1.5s ease-in-out infinite",
        shake: "shake 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },

      // Typography
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        norse: ["Inter", "system-ui", "sans-serif"],
      },

      // Z-index layers (matching CSS variables)
      zIndex: {
        background: "0",
        board: "10",
        battlefield: "10",
        cards: "20",
        "player-field": "25",
        "active-card": "30",
        ui: "40",
        hand: "50",
        modal: "50",
        tooltip: "60",
        notification: "70",
        hud: "100",
        "end-turn": "200",
        tooltips: "500",
        modals: "1000",
        overlays: "2000",
        targeting: "5000",
        notifications: "9000",
        topmost: "10000",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwindcss-animated"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;
