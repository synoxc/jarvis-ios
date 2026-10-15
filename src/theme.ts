/**
 * Design system JARVIS 2.0 — identidade visual premium.
 *
 * Linguagem: fundo preto/grafite/azul-noite, ciano luminoso como cor
 * principal, gradientes subtis, superfícies translúcidas com profundidade,
 * cartões arredondados, tipografia SF (sistema) com hierarquia clara.
 * Mantém os tokens antigos (font.mono, radius, spacing) para compatibilidade
 * com os ecrãs que ainda não foram migrados (pair, fitness).
 */
import { Platform } from 'react-native';

export const theme = {
  colors: {
    // Fundos e superfícies
    bg: '#04070d', // preto azulado profundo
    bgAlt: '#070b13', // grafite azulado
    surface: '#0b111c', // cartões
    surfaceAlt: '#101a29', // inputs, chips
    surfaceGlass: 'rgba(17, 27, 43, 0.72)', // barras flutuantes
    border: '#1b2739',
    borderSoft: 'rgba(45, 62, 88, 0.5)',

    // Texto
    text: '#e8eef7',
    textDim: '#8b9ab1',
    textFaint: '#55647c',

    // Identidade
    primary: '#22d3ee', // ciano JARVIS
    primaryDim: '#0e7490',
    primarySoft: 'rgba(34, 211, 238, 0.14)',
    glow: 'rgba(34, 211, 238, 0.35)',

    // Estados do assistente
    listening: '#34d399', // verde-menta a ouvir
    processing: '#fbbf24', // âmbar a pensar
    speaking: '#38bdf8', // azul-ciano a falar
    danger: '#fb7185',
    warning: '#fbbf24',
    success: '#34d399',

    // Bolhas de conversa (compat)
    bubbleUser: '#0f3d3e',
    bubbleJarvis: '#0d131f',
    bubbleSystem: '#111827',
  },

  /** Gradientes prontos para LinearGradient. */
  gradient: {
    bg: ['#04070d', '#071019', '#050a12'] as const,
    orbIdle: ['rgba(34,211,238,0.0)', 'rgba(34,211,238,0.25)', 'rgba(34,211,238,0.0)'] as const,
    orbListening: ['rgba(52,211,153,0.0)', 'rgba(52,211,153,0.3)', 'rgba(52,211,153,0.0)'] as const,
    orbProcessing: ['rgba(251,191,36,0.0)', 'rgba(251,191,36,0.3)', 'rgba(251,191,36,0.0)'] as const,
    orbSpeaking: ['rgba(56,189,248,0.0)', 'rgba(56,189,248,0.32)', 'rgba(56,189,248,0.0)'] as const,
    orbError: ['rgba(251,113,133,0.0)', 'rgba(251,113,133,0.28)', 'rgba(251,113,133,0.0)'] as const,
    header: ['rgba(11,17,28,0.95)', 'rgba(4,7,13,0.85)'] as const,
  } satisfies Record<string, readonly string[]>,

  radius: { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 },
  spacing: (n: number) => n * 4,

  font: {
    /** Apenas para o wordmark "JARVIS" — identidade técnica. */
    mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
  },

  /** Sombras/glow usados de forma consistente. */
  glow: {
    soft: {
      shadowColor: '#22d3ee',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    strong: {
      shadowColor: '#22d3ee',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 18,
      elevation: 10,
    },
  },
} as const;

export type Theme = typeof theme;

/** Mapeia o estado do assistente para a cor correspondente. */
export function stateColor(
  state: 'offline' | 'idle' | 'listening' | 'processing' | 'speaking' | 'error',
): string {
  switch (state) {
    case 'listening':
      return theme.colors.listening;
    case 'processing':
      return theme.colors.processing;
    case 'speaking':
      return theme.colors.speaking;
    case 'error':
      return theme.colors.danger;
    case 'idle':
      return theme.colors.primary;
    case 'offline':
    default:
      return theme.colors.textFaint;
  }
}

/** Rótulos pt-PT do estado do avatar (partilhados com a Live Activity). */
export function stateLabel(
  state: 'offline' | 'idle' | 'listening' | 'processing' | 'speaking' | 'error',
): string {
  switch (state) {
    case 'listening':
      return 'A ouvir…';
    case 'processing':
      return 'A pensar…';
    case 'speaking':
      return 'A responder…';
    case 'error':
      return 'Sem ligação ao PC';
    case 'idle':
      return 'À tua espera';
    case 'offline':
    default:
      return 'Em espera';
  }
}
