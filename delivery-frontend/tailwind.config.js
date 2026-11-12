/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Outfit"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#EA580C',
          hover: '#C2410C',
          light: '#FFF7ED',
          dark: '#F97316',
        },
        crimson: {
          DEFAULT: '#DC2626',
          dark: '#EF4444',
        },
        tracking: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
          dark: '#3B82F6',
        },
      },
      boxShadow: {
        warm: '0 10px 30px -10px rgba(234, 88, 12, 0.18)',
        card: '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
