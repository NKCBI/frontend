/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Define the "slate blue" and "cool gray" palette for backgrounds, surfaces, and text
        'brand': {
          '900': '#1e293b', // Dark Slate Blue (Primary Background)
          '800': '#334155', // Slate Blue (Surfaces, Modals)
          '700': '#475569', // Slate Blue (Borders, Hover)
          '400': '#94a3b8', // Cool Gray (Secondary Text)
          '300': '#d1d5db', // Cool Gray (Primary Text)
        },
        // Define the "glowing cyan" as your primary accent color
        'accent': {
          'DEFAULT': '#22d3ee', // Bright Cyan
          'hover': '#67e8f9',   // Lighter Cyan for hover states
        },
      },
      boxShadow: {
        // Create a custom shadow utility for the "glowing" effect
        'glow': '0 0 15px 0 rgba(34, 211, 238, 0.4)',
      },
    },
  },
  plugins: [],
}