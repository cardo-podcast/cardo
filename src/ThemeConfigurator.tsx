import colors from 'tailwindcss/colors'


interface TailwindColor {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
  950: string
}

export function loadColor(color: 'primary' | 'accent', twColor: TailwindColor) {

  for (const tonality of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
    document.documentElement.style.setProperty(`--color-${color}-${tonality}`, (twColor as any)[tonality])
  }
}


export function loadDefaultColors() {
  loadColor('primary', colors.neutral)
  loadColor('accent', colors.red)
}