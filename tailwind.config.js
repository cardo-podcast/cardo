/** @type {import('tailwindcss').Config} */

import colors, { black, neutral } from 'tailwindcss/colors'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /bg-(.+)-(500|800)/
    }
  ],
  theme: {
    colors: {
      primary: {
        50: 'var(--color-primary-50)',
        100: 'var(--color-primary-100)',
        200: 'var(--color-primary-200)',
        300: 'var(--color-primary-300)',
        400: 'var(--color-primary-400)',
        500: 'var(--color-primary-500)',
        600: 'var(--color-primary-600)',
        700: 'var(--color-primary-700)',
        800: 'var(--color-primary-800)',
        900: 'var(--color-primary-900)',
        950: 'var(--color-primary-950)',
      },
      accent: {
        50: 'var(--color-accent-50)',
        100: 'var(--color-accent-100)',
        200: 'var(--color-accent-200)',
        300: 'var(--color-accent-300)',
        400: 'var(--color-accent-400)',
        500: 'var(--color-accent-500)',
        600: 'var(--color-accent-600)',
        700: 'var(--color-accent-700)',
        800: 'var(--color-accent-800)',
        900: 'var(--color-accent-900)',
        950: 'var(--color-accent-950)',
      },

      slate: colors.slate,
      gray: colors.gray,
      zinc: colors.zinc,
      neutral: colors.neutral,
      stone: colors.stone,
      red: colors.red,
      orange: colors.orange,
      amber: colors.amber,
      yellow: colors.yellow,
      lime: colors.lime,
      green: colors.green,
      emerald: colors.emerald,
      teal: colors.teal,
      cyan: colors.cyan,
      sky: colors.sky,
      blue: colors.blue,
      indigo: colors.indigo,
      violet: colors.violet,
      purple: colors.purple,
      fuchsia: colors.fuchsia,
      pink: colors.pink,
      rose: colors.rose,
      white: colors.white,
      black: colors.black
    }
  },
  plugins: [],
}