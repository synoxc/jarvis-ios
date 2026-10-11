// Estados visuais da Live Activity / Dynamic Island para o JARVIS.
// Mapeiam o estado do back-end (assistantState) + modo de voz + ligação.
//
// Estado do jarvis-ios-expogo:
//   AssistantState = 'active' | 'sleeping' | 'processing'
//   VoiceMode = 'idle' | 'dictating' | 'live-audio' | 'speaking'
//   ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type JarvisLiveActivityState =
  | 'inactive'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

/** Atributos expostos ao Live Activity. São guardados no UserDefaults do
 *  WidgetKit e partilhados com o ActivityKit / Dynamic Island. */
export interface JARVISAttributes {
  state: JarvisLiveActivityState;
  /** Rótulo curto mostrado no Dynamic Island. */
  stateLabel: string;
  /** Texto resumido (compact / minimal form). */
  summary: string;
  /** Modo de voz actual (idle, dictating, live-audio, speaking). */
  modeLabel: string;
}

/** Mapeamento concreto dos rótulos/estados para o widget. */
export interface JarvisLiveActivityConfig {
  inactiveLabel: string;
  inactiveSummary: string;
  connectingLabel: string;
  connectingSummary: string;
  listeningLabel: string;
  listeningSummary: string;
  processingLabel: string;
  processingSummary: string;
  speakingLabel: string;
  speakingSummary: string;
  errorLabel: string;
  errorSummary: string;
}
