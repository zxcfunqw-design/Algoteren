import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          900: "#064E3B"
        },
        ink: "#1F2937",
        muted: "#6B7280",
        line: "#E5E7EB",
        canvas: "#F8F9FA"
      },
      borderRadius: {
        xl2: "16px"
      },
      boxShadow: {
        card: "0 18px 45px rgba(15, 23, 42, 0.07)",
        lift: "0 22px 60px rgba(4, 120, 87, 0.13)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
