import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Палитра макета — токены через CSS-переменные (см. app/globals.css).
        // Эти алиасы оставлены для совместимости с прежними классами.
        cream: "#F5F1E8",
        slate900: "#0F141A",
        accent: "#3B82F6",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
