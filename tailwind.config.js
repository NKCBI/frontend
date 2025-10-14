/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- MODIFICATION: Updated to match the provided icon ---
        'brand': {
          '900': '#2f3b4d', // Darker Blue-Grey (Primary Background, from icon base)
          '800': '#3d4a5c', // Medium Blue-Grey (Surfaces, Modals, from icon falcon body)
          '700': '#57677b', // Lighter Blue-Grey (Borders, Hover, slightly lighter than falcon)
          '400': '#a7b4c4', // Light Grey-Blue (Secondary Text, falcon highlights)
          '300': '#e0e7ef', // Near White (Primary Text, falcon white details)
        },
        // Accent color directly from the glowing location pin
        'accent': {
          'DEFAULT': '#00e0ff', // Bright Cyan
          'hover': '#40f0ff',   // Slightly lighter Cyan for hover states
        },
      },
      boxShadow: {
        // Updated the glow effect to match the new Cyan accent color.
        'glow': '0 0 15px 0 rgba(0, 224, 255, 0.4)',
      },
    },
  },
  plugins: [],
}