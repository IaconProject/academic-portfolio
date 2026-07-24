/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'academic-navy': '#041627',
        'academic-blue': '#1a2b3c',
        'academic-bg': '#f8f9ff',
        'academic-surface': '#ffffff',
        'academic-slate': '#505f76',
        'academic-border': '#e2e8f0',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        touch: '48px',
      },
    },
  },
  plugins: [],
}
