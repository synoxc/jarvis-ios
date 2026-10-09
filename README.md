# JARVIS iOS — App nativa (React Native + Expo)

Aplicação móvel para iPhone 16 que funciona como extensão do JARVIS que já
corre no teu PC (Windows). Reutiliza o **backend existente** (`dashboard/server.py`)
— não duplica a inteligência artificial nem cria um segundo assistente.

> **Idioma:** toda a voz e as respostas são em **Português de Portugal (pt-PT)**,
> consistente com o núcleo JARVIS.

---

## 1. Arquitectura

```
iPhone (esta app)  ──HTTPS/WSS──▶  PC Windows: Mark-LV-main/dashboard/server.py
   React Native                        FastAPI na porta 8000 (TLS auto-assinado)
   + Expo SDK 57                       │
                                       └──▶ JARVIS (Gemini Live, ações do PC)
```

A app é apenas o **cliente**. O núcleo (IA, voz, ações do PC, memória) continua a
ser o JARVIS do Windows. O dashboard já implementa o protocolo móvel:

| Capacidade | Endpoint |
|---|---|
| Login por PIN | `POST /login` `{pin}` → `{token}` |
| Re-login automático | `POST /api/device-login` `{device_token}` → `{token, key}` |
| Enviar comando | `POST /api/command` `{enc}` ou WS `/ws` `{type:"command", enc}` |
| Conversa/estado em tempo real | WS `/ws?token=` (mensagens `log`/`status`/`wake`/`sys`) |
| Áudio do microfone em tempo real | WS `/ws/phone-audio?token=` (PCM16 LE, mono, 16 kHz, chunks 1024) |
| Acordar assistente | `POST /api/wake` |
| Revogar dispositivos | `POST /api/revoke-devices` |

**Cifra:** AES-256-CBC. Chave = `SHA256(sessionKey + "JARVIS-DASHBOARD-v1")`.
Payload = `base64(IV[16] || ciphertext)`. Confirmado em `server.py` e `app.html`.

### 1.1 Ligação segura (TLS) — certificado do JARVIS

O dashboard usa um **certificado auto-assinado** gerado localmente
(`config/certs/jarvis.crt`), com SAN a cobrir `localhost`, `127.0.0.1` e o **IP da
LAN** (o mesmo que o QR codifica). O iOS, por omissão, rejeita certificados
auto-assinados. **Não desactivámos a validação TLS** — em vez disso, o
certificado específico do JARVIS é instalado e confiado no iPhone.

**No Windows (uma vez):** o certificado já existe em
`Mark-LV-main\config\certs\jarvis.crt`. Copia-o para o iPhone (AirDrop, e-mail
ou iCloud Drive).

**No iPhone (uma vez por certificado):**
1. Abre o `jarvis.crt` → **Definições** → *Perfil transferido* → **Instalar**.
2. Vai a **Definições → Geral → Sobre -> Confiança em Certificados** e activa a
   confiança total para **"JARVIS Dashboard"**.
3. A app passa a validar HTTPS/WSS normalmente — sem avisos e sem aceitar
   certificados de terceiros.

> O `app.json` define `NSAllowsLocalNetworking` (permite HTTP local para
> ferramentas de debug). **Não** usamos `NSAllowsArbitraryLoads`: o tráfego WSS
> continua a ser validado contra o certificado do JARVIS. Se o certificado for
> regenerado no PC (ex: mudança de IP/reinstalação), repete a instalação no
> iPhone. A autenticação por token e a cifra AES mantêm-se sempre activas.

---

## 2. Estrutura de pastas

```
jarvis-ios/
├── app/                      # Ecrãs (expo-router)
│   ├── _layout.tsx           # Stack + provider
│   ├── index.tsx             # Estado + Conversa (ecrã principal)
│   ├── pair.tsx              # Emparelhar (QR + PIN manual)
│   ├── settings.tsx          # Definições
│   └── fitness.tsx           # Fitness (HealthKit)
├── src/
│   ├── lib/
│   │   ├── api.ts            # Cliente HTTP (login, comandos)
│   │   ├── socket.ts         # WebSocket /ws com reconexão
│   │   ├── liveAudio.ts      # Áudio em tempo real /ws/phone-audio
│   │   ├── crypto.ts         # AES-256-CBC (compatível c/ o PC)
│   │   ├── storage.ts        # Keychain (SecureStore)
│   │   ├── voice.ts          # Ditado iOS + TTS (pt-PT)
│   │   └── health.ts         # Wrapper HealthKit (fallback seguro)
│   ├── components/           # AssistantOrb, Composer, MessageBubble, ConnectionPill
│   ├── state/JarvisContext.tsx  # Orquestra ligação + voz + mensagens
│   └── theme.ts
├── ios/JarvisHealth/         # Módulo Swift nativo (HealthKit)
├── plugins/withJarvisHealth.js   # Config plugin (Info.plist + entitlements)
├── app.json / eas.json / babel.config.js
└── README.md
```

---

## 3. Como correr em desenvolvimento

Requer Node 20+ (validado com Node 24).

```bash
cd jarvis-ios
npm install
npm start          # abre o Expo Dev Tools / Metro
```

**Importante:** esta app usa módulos nativos (câmara, microfone PCM,
reconhecimento de voz, HealthKit), pelo que **não corre no Expo Go**. É preciso
um **development build** (ver secção 5).

---

## 4. Emparelhar com o PC

1. No PC, inicia o JARVIS e abre **Controlo Remoto** (dashboard, porta 8000).
2. Aparece um **QR code** e um **PIN de 6 caracteres**.
3. Na app: botão **Emparelhar** → lê o QR **ou** introduz host/porta + PIN.

### Diferença entre QR e PIN (importante)

- **QR code (recomendado):** a app abre `GET /auto-login?key=...`, o servidor
  devolve um `device_token` **persistente** que fica no Keychain (SecureStore).
  Permite **re-login automático** sempre que abres a app — sem voltar a
  emparelhar.
- **PIN manual:** usa `POST /login`. O PIN é **de utilização única** e o servidor
  **não** cria device_token. Por isso a sessão é temporária: ao reabrir a app
  tens de introduzir um novo PIN. **Nunca** guardamos o PIN como se fosse um
  device_token (evita falhas de re-login e reutilização de segredos).

O `device_token` (só do QR) fica no Keychain. A chave AES (`session_key`) **não**
é persistida — é obtida a cada login via `/api/device-login`. Se o PC revogar os
dispositivos (`/api/revoke-devices`), a app detecta, limpa o token e pede novo
emparelhamento.

> TLS: vê a secção 1.1 — instala e confia o certificado do JARVIS no iPhone.

---

## 5. Instalação GRATUITA no iPhone 16 (a verdade)

Não há instalação permanente e 100% gratuita de apps nativas iOS fora da App
Store. A rota **mais simples e realista** a partir de Windows, sem pagar:

### Opção A — Conta Apple gratuita + assinatura de 7 dias (recomendada)

1. Cria uma conta **Expo (grátis)** em https://expo.dev e instala o EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Compila na nuvem (plano grátis tem limite de builds/mês — chega para uso pessoal):
   ```bash
   eas build --profile development --platform ios
   ```
3. EAS pede o teu **Apple ID** (conta gratuita serve). Ele trata dos
   certificados e provisioning para o **teu dispositivo**.
4. Instala o `.ipa`/link resultante no iPhone 16.

**Limitação honesta do iOS:** com conta Apple gratuita, a app **expira a cada
7 dias** e tem de ser reinstalada (leva ~1 minuto via EAS/Xcode, sem custos).
Não há como contornar isto sem a conta Apple Developer paga (99$/ano), que tu
não queres. **Não prometemos instalação permanente gratuita porque não existe.**

### Opção B — AltStore (grátis, mesma limitação de 7 dias)

Alternativa ao EAS para sideload. Requer re-assinatura periódica. Funciona mas
tem mais passos no Windows.

### O que NÃO é possível (documentado com rigor)

- Instalar um `.ipa` **sem assinatura válida** — o iOS rejeita-o.
- Palavra de ativação permanente em segundo plano — o iOS não permite para apps
  de terceiros. A ativação é por **botão na app** (já implementado) ou via
  **Atalhos/Siri Shortcuts** e o **Botão de Ação** do iPhone (configuração
  manual no iOS).
- HealthKit em Expo Go ou simulador — exige development build + iPhone real.

---

## 6. Voz

- **Voz ao vivo (prioridade):** `/ws/phone-audio` — fala directamente com o
  Gemini Live do PC (PCM16, mono, 16 kHz, chunks de 1024 samples). Botão 🎤.
  Usa `expo-audio-stream-pcm` (Expo Module nativa, **New Architecture**), que
  captura com `AVAudioEngine` no iOS e entrega PCM 16-bit LE em Base64 — o mesmo
  formato que o servidor consome. Substituiu a `react-native-audio-record`
  (módulo bare antigo, sem suporte garantido à Nova Arquitectura).
- **Ditado iOS nativo:** `SFSpeechRecognizer` em pt-PT (botão 🎙️). Usa o ditado
  do sistema e envia o texto como comando. Fallback robusto.
- **Resposta falada:** `expo-speech` (TTS) lê a última resposta do JARVIS em
  pt-PT (botão 🔊, com interrupção).

> **Estado da voz ao vivo:** implementada e validada por typecheck/bundle, mas o
> `expo-audio-stream-pcm` declara o iOS como *best-effort* (testado end-to-end
> em Android). A **sample-rate real e a qualidade do áudio confirmam-se apenas
> num development build com iPhone físico**. Ver secção 10 (riscos).

---

## 7. Fitness / HealthKit

Integração nativa (módulo Swift `ios/JarvisHealth`): passos, distância, energia
activa e treinos dos últimos 7 dias. **Read-only**, respeita permissões.

**Estado:** arquitectura e código nativos implementados; o config plugin
(`plugins/withJarvisHealth.js`) adiciona a capability e as descrições de
privacidade. **Teste só possível num development build com iPhone físico** — não
foi testado aqui (sem macOS/Xcode no Windows). Em Expo Go o ecrã mostra o aviso
de indisponibilidade em vez de dados fictícios (nunca inventa valores).

---

## 8. Segurança

- Bearer token (sessão) + device token persistente no Keychain (só via QR).
- Comunicação cifrada ponta-a-ponta (AES-256-CBC) com chave derivada do
  emparelhamento; TLS validado contra o certificado do JARVIS (secção 1.1).
- **Nunca** contém credenciais do PC, chaves de API ou segredos do backend.
- Sem execução arbitrária: só os comandos que o JARVIS já suporta.
- O PIN de utilização única **não** é reutilizado como device_token.
- Dados de saúde nunca saem do iPhone sem autorização explícita.

---

## 9. Validação feita no Windows

| Verificação | Resultado |
|---|---|
| `npm test` (Jest) — cifra + parsing auto-login | ✅ **11 testes passam** (`crypto.test.ts`, `api.test.ts`) |
| `npm run typecheck` (`tsc --noEmit`) | ✅ 0 erros |
| `npx expo export --platform ios` (bundle) | ✅ 1179 módulos, 2.6 MB (inclui `expo-audio-stream-pcm`) |
| `npm install` | ✅ sem conflitos; `react-native-audio-record` removido |

**Testes automatizados** cobrem a lógica crítica e pura:
- `src/lib/crypto.test.ts` — derivação de chave, formato `base64(IV||ct)`,
  reversibilidade, IV aleatório, incompatibilidade entre sessionKeys.
- `src/lib/api.test.ts` — parsing do HTML de `/auto-login` (QR): extrai
  `token`/`key`/`device_token`, detecta link expirado e distingue device_token
  de session_key.

**Não testado** (exige iPhone real + PC na mesma rede): áudio em tempo real no
dispositivo, ditado, TTS, HealthKit, emparelhamento ponta-a-ponta, re-login
persistente.

---

## 10. Riscos restantes

- **TLS:** depende de instalares e confiares o certificado do JARVIS no iPhone
  (secção 1.1). Se o certificado for regenerado no PC, repete a instalação.
- **Voz ao vivo em iOS:** `expo-audio-stream-pcm` trata iOS como best-effort;
  confirmar sample-rate e qualidade num development build real.
- **HealthKit:** exige development build + iPhone físico (não corre em Expo Go).
- **Assinatura:** expira a cada 7 dias com conta Apple gratuita (secção 5).

---

## 11. Comandos úteis

```bash
npm start               # Metro / dev tools
npm test                # Jest (cifra + parsing auto-login)
npm run typecheck       # tsc --noEmit
npm run build:ios:dev   # eas build --profile development --platform ios
npm run build:ios:preview
```

