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
        'academic-accent': 'rgb(var(--academic-accent) / <alpha-value>)',
        'academic-accent-strong': 'rgb(var(--academic-accent-strong) / <alpha-value>)',
        'academic-accent-soft': 'rgb(var(--academic-accent-soft) / <alpha-value>)',
        'academic-on-accent': 'rgb(var(--academic-on-accent) / <alpha-value>)',
        'academic-sidebar-bg': 'rgb(var(--academic-sidebar-bg) / <alpha-value>)',
        'academic-sidebar-surface': 'rgb(var(--academic-sidebar-surface) / <alpha-value>)',
        'academic-sidebar-ink': 'rgb(var(--academic-sidebar-ink) / <alpha-value>)',
        'academic-sidebar-muted': 'rgb(var(--academic-sidebar-muted) / <alpha-value>)',
        'academic-sidebar-border': 'rgb(var(--academic-sidebar-border) / <alpha-value>)',
        'academic-sidebar-hover': 'rgb(var(--academic-sidebar-hover) / <alpha-value>)',
        'academic-sidebar-active': 'rgb(var(--academic-sidebar-active) / <alpha-value>)',
        'academic-overlay': 'rgb(var(--academic-overlay) / <alpha-value>)',
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
