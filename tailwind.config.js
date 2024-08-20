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
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          1: 'var(--color-primary-1)',
          2: 'var(--color-primary-2)',
          3: 'var(--color-primary-3)',
          4: 'var(--color-primary-4)',
          5: 'var(--color-primary-5)',
          6: 'var(--color-primary-6)',
          7: 'var(--color-primary-7)',
          8: 'var(--color-primary-8)',
          9: 'var(--color-primary-9)',
          10: 'var(--color-primary-10)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          1: 'var(--color-accent-1)',
          2: 'var(--color-accent-2)',
          3: 'var(--color-accent-3)',
          4: 'var(--color-accent-4)',
          5: 'var(--color-accent-5)',
          6: 'var(--color-accent-6)',
          7: 'var(--color-accent-7)',
          8: 'var(--color-accent-8)',
          9: 'var(--color-accent-9)',
          10: 'var(--color-accent-10)',
        }
      }
    },
    plugins: [],
  }
}