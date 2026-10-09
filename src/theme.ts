/** Paleta e tokens visuais do JARVIS (consistente com o dashboard web). */
export const theme = {
  colors: {
    bg: '#07090f',
    surface: '#0e1219',
    surfaceAlt: '#141a24',
    border: '#1e2733',
    text: '#dde3ed',
    textDim: '#5e6a7e',
    primary: '#22d3ee', // ciano JARVIS
    primaryDim: '#0e7490',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    bubbleUser: '#134e4a',
    bubbleJarvis: '#0e1219',
    bubbleSystem: '#1a1410',
  },
  radius: { sm: 8, md: 14, lg: 20, pill: 999 },
  spacing: (n: number) => n * 4,
  font: {
    mono: 'Menlo',
  },
} as const;

export type Theme = typeof theme;
