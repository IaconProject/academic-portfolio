/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'academic-navy': '#1c1917',
        'academic-blue': '#292524',
        // Closest warm site background that Android Chrome accepts as a
        // toolbar theme color (its bright-theme cutoff is 0.94 lightness).
        'academic-bg': '#f3efe6',
        'academic-surface': '#ffffff',
        'academic-slate': '#57534e',
        'academic-border': '#e7e3d8',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      spacing: {
        touch: '48px',
      },
    },
  },
  plugins: [],
}
