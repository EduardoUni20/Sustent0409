/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        marca: {
          DEFAULT: "#111827",
          claro: "#374151",
          acento: "#e11d48",
        },
      },
    },
  },
  plugins: [],
};
