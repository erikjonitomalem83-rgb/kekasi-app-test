/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "kekasi-blue": "#00325f",
        "kekasi-blue-dark": "#002447",
        "kekasi-blue-light": "#004080",
        "kekasi-yellow": "#efbc62",
        "kekasi-yellow-dark": "#d9a851",
        "kekasi-yellow-light": "#f5d084",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
