import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        sand: "#f5efe4",
        text: "#201a14",
        mutedText: "#6f665c",
        coral: "#dd6b4d",
        sky: "#2d75a5",
        amber: "#d99d32",
        ink: "#2a3142",
        mint: "#4f8f6a",
        danger: "#b84237"
      },
      boxShadow: {
        float: "0 22px 60px rgba(62, 41, 20, 0.12)"
      },
      borderRadius: {
        xl2: "28px"
      },
      fontFamily: {
        sans: ["Sora", "Avenir Next", "Segoe UI", "sans-serif"]
      },
      backgroundImage: {
        "hero-wash":
          "radial-gradient(circle at top left, rgba(221, 107, 77, 0.2), transparent 22%), radial-gradient(circle at bottom right, rgba(45, 117, 165, 0.18), transparent 18%), linear-gradient(145deg, #f8f1e5 0%, #f2eadf 42%, #efe8dd 100%)"
      }
    }
  },
  plugins: []
};

export default config;
