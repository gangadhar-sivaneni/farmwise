/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        card: 'var(--card)',
        soft: 'var(--soft)',
        line: 'var(--line)',
        'line-2': 'var(--line-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        green: {
          DEFAULT: 'var(--green)',
          2: 'var(--green-2)',
        },
        leaf: 'var(--leaf)',
        pale: 'var(--pale)',
        orange: 'var(--orange)',
        yellow: 'var(--yellow)',
        'paper-2': 'var(--paper-2)',
      },
      fontFamily: {
        sans: ['Geist', 'Noto Sans Telugu', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        r: 'var(--r)',
        'r-lg': 'var(--r-lg)',
      },
      transitionTimingFunction: {
        custom: 'cubic-bezier(.2,.7,.2,1)',
      },
      screens: {
        'max-1180': { max: '1180px' },
        'max-1100': { max: '1100px' },
        'max-960': { max: '960px' },
        'max-860': { max: '860px' },
        'max-640': { max: '640px' },
        'max-600': { max: '600px' },
      },
    },
  },
  plugins: [],
}
