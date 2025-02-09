import { ColorTheme, TailwindBaseColor } from '.'

export const BasicColors: TailwindBaseColor[] = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]

export const DefaultThemes: { [name: string]: ColorTheme | TailwindBaseColor } = {
  dark: 'neutral',
  light: {
    DEFAULT: 'zinc-950',
    1: 'zinc-900',
    2: 'zinc-800',
    3: 'zinc-700',
    4: 'zinc-600',
    5: 'zinc-500',
    6: 'zinc-400',
    7: 'zinc-300',
    8: 'zinc-200',
    9: 'zinc-100',
    10: 'zinc-50',
  },
}

export type DefaultTheme = keyof typeof DefaultThemes
