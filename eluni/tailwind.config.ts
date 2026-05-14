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
        // светлая тема — молочно-бежевый
        cream: "#FAFAF5",
        // тёмная — основной серый
        slate900: "#1E1E1E",
        accent: "#4F46E5",
      },
    },
  },
  plugins: [],
};

export default config;
