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
        'academic-navy': 'rgb(var(--academic-navy) / <alpha-value>)',
        'academic-blue': 'rgb(var(--academic-blue) / <alpha-value>)',
        'academic-bg': 'rgb(var(--academic-bg) / <alpha-value>)',
        'academic-surface': 'rgb(var(--academic-surface) / <alpha-value>)',
        'academic-surface-muted': 'rgb(var(--academic-surface-muted) / <alpha-value>)',
        'academic-ink': 'rgb(var(--academic-ink) / <alpha-value>)',
        'academic-slate': 'rgb(var(--academic-slate) / <alpha-value>)',
        'academic-border': 'rgb(var(--academic-border) / <alpha-value>)',
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
