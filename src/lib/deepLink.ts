/**
 * Roteador de deep links interno à app (Expo Router / React Navigation).
 *
 * Regras aplicadas:
 *  - Apenas o esquema custom definido em app.json (scheme: "jarvis")
 *    é tratado. URLs com outros esquemas (https://, mailto:, etc.) NÃO
 *    abrem nenhum aplicativo/navegador — são ignoradas em alternativa.
 *  - Qualquer rota resultante é SEMPRE um ecrã interno:
 *        jarvis://pair       -> /pair
 *        jarvis://settings   -> /settings
 *        jarvis://fitness    -> /fitness
 *        jarvis://           -> / (index)
 *  - Rotas desconhecidas (ex: jarvis://google) retornam null e são
 *    ignoradas, sem navegação externa.
 *  - NÃO existem chamadas a Linking.openURL, WebBrowser, Linking.parseUrl
 *    com destinos externos nem <Link> com href externo neste projeto.
 */

import { useEffect } from 'react';
import { addEventListener, getInitialURL } from 'expo-linking';
import { router } from 'expo-router';

const SCHEME = 'jarvis';

/** Rotas internas existentes no app/ (nenhuma outra rota está registada). */
const INTERNAL_ROUTES = ['index', 'pair', 'settings', 'fitness'];

/**
 * Extrai da URL de deep link a rota interna.
 * Retorna o nome da rota ou null se a URL não pertencer à app.
 */
export function parseInAppUrl(url: string | null): string | null {
  if (!url) return null;
  let path = stripScheme(url);
  const queryIndex = path.indexOf('?');
  const route = queryIndex >= 0 ? path.slice(0, queryIndex) : path;
  const trimmed = route.trim().toLowerCase().replace(/^[\\/]+/, '');
  if (trimmed === '' || trimmed === '/') return 'index';
  if (INTERNAL_ROUTES.includes(trimmed)) return trimmed;
  return null;
}

function stripScheme(url: string): string {
  const idx = url.indexOf('://');
  return idx >= 0 ? url.slice(idx + 3) : url;
}

/** Navega para a rota interna. Usa exclusivamente o router do expo-router. */
export function navigateFromDeepLink(url: string | null): void {
  const route = parseInAppUrl(url);
  if (route === null) return;
  switch (route) {
    case 'pair':
      router.push('/pair');
      break;
    case 'settings':
      router.push('/settings');
      break;
    case 'fitness':
      router.push('/fitness');
      break;
    case 'index':
    default:
      router.push('/');
      break;
  }
}

/**
 * Hook: regista o ouvinte de deep links do iOS dentro da app.
 * NÃO abre navegadores ou aplicações externas.
 */
export function useInAppDeepLinking(): void {
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      navigateFromDeepLink(event.url);
    };
    const subscription = addEventListener('url', handleUrl);
    getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    return () => subscription.remove();
  }, []);
}
