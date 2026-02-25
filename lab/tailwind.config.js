/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../primitives/**/*.tsx",
    "../components/**/*.tsx",
    "../patterns/**/*.tsx",
    "../layouts/**/*.tsx",
    "../pages/**/*.tsx",
    "../foundations/**/*.tsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
