import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          0: "#08080a",
          1: "#0a0a0c",
          2: "#111114",
          3: "#15151a",
          4: "#1c1c22",
          5: "#24242c",
          6: "#2e2e38",
        },
        fog: {
          0: "#f4f4f6",
          1: "#d8d8df",
          2: "#a8a8b3",
          3: "#76767f",
          4: "#52525a",
          5: "#38383f",
        },
        iris: {
          DEFAULT: "#7c89ff",
          soft: "#5a67e0",
          deep: "#3a45a8",
          glow: "rgba(124,137,255,0.16)",
        },
        mint: "#7aebc4",
        amber: "#f0b86c",
      },
      keyframes: {
        blink: {
          "0%, 50%": { opacity: "1" },
          "50.01%, 100%": { opacity: "0" },
        },
        drawerIn: {
          from: { transform: "translateX(24px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        dashShift: {
          to: {
            backgroundPosition: "24px 0, -24px 0, 0 24px, 0 -24px",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        blink: "blink 0.9s steps(2) infinite",
        drawerIn: "drawerIn 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        dashShift: "dashShift 600ms linear infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
