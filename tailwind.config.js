/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: '#1a1b2e',
        navyLight: '#2d2f45',
        accent: '#00e5a0',
        accentDark: '#00b880',
        textPrimary: '#f0f0f5',
        textSecondary: '#8b8da3',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        dmSans: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 229, 160, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 229, 160, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
