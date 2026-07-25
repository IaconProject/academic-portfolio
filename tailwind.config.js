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
        'academic-bg': '#f7f5f0',
        'academic-surface': '#ffffff',
        'academic-slate': '#57534e',
        'academic-border': '#e7e3d8',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Lora', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['var(--font-mono)', 'Space Grotesk', 'monospace'],
      },
      spacing: {
        touch: '48px',
      },
    },
  },
  plugins: [],
}
