/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0C10",
        panel: "#12151B",
        panel2: "#171B22",
        border: "#22262E",
        ink: "#E4E7EB",
        muted: "#7A8290",
        positive: "#00D9A3",
        negative: "#FF5C5C",
        accent: "#F5A623",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      fontWeight: {
        500: "500",
        600: "600",
        700: "700",
      },
    },
  },
  plugins: [],
};
