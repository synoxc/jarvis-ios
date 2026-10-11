// Testes do manager da Live Activity — 100% sem hardware: o módulo nativo é
// substituído por um factory falso (jest.doMock) ou simulado como ausente,
// conforme o cenário. Nenhum teste toca em rede, tokens ou dispositivo real.
//
// O manager mantém estado ao nível do módulo (currentActivity/pendingStart),
// por isso cada teste carrega uma instância fresca (resetModules + require).

type ManagerModule = typeof import('./JarvisLiveActivityManager');
type Attributes = import('./types').JARVISAttributes;

/** Carrega uma instância fresca do manager (chamado APÓS jest.doMock). */
function loadManager(): ManagerModule {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./JarvisLiveActivityManager');
}

/** Factory falso que imita LiveActivityFactory + LiveActivity do SDK.
 *  Tal como no ActivityKit real, terminar (end) remove a instância da lista
 *  de atividades ativas devolvida por getInstances. */
function makeFakeFactory() {
  const instances: Array<{ update: jest.Mock; end: jest.Mock }> = [];
  const activity = {
    update: jest.fn(async () => undefined),
    end: jest.fn(async () => {
      const index = instances.indexOf(activity);
      if (index >= 0) instances.splice(index, 1);
    }),
  };
  const factory = {
    start: jest.fn(() => {
      instances.push(activity);
      return activity;
    }),
    getInstances: jest.fn(() => instances),
  };
  return { factory, activity, instances };
}

describe('JarvisLiveActivityManager', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // -------------------------------------------------------------------------
  // Cenário 1 — módulo nativo indisponível (Expo Go / factory ausente).
  // -------------------------------------------------------------------------
  test('factory ausente: disponibilidade false e operações seguras', async () => {
    jest.doMock('./JarvisLiveActivity', () => ({}));
    const m = loadManager();
    expect(m.isLiveActivityAvailable()).toBe(false);
    const attrs = m.attributesForState('listening');
    await expect(m.startJarvisLiveActivity(attrs)).resolves.toBe(false);
    await expect(m.updateJarvisLiveActivityAttributes(attrs)).resolves.toBe(false);
    await expect(m.stopJarvisLiveActivity('immediate')).resolves.toBe(true);
  });

  test('require do widget lança (módulo nativo rebenta): degrada sem crash', async () => {
    jest.doMock('./JarvisLiveActivity', () => {
      throw new Error('requireNativeModule falhou (Expo Go)');
    });
    const m = loadManager();
    expect(m.isLiveActivityAvailable()).toBe(false);
    await expect(
      m.startJarvisLiveActivity(m.attributesForState('processing')),
    ).resolves.toBe(false);
  });

  // -------------------------------------------------------------------------
  // Cenário 2 — inicialização com suporte real (factory presente).
  // -------------------------------------------------------------------------
  test('start cria a atividade uma única vez com os atributos atuais', async () => {
    const { factory } = makeFakeFactory();
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    expect(m.isLiveActivityAvailable()).toBe(true);
    const attrs = m.attributesForState('connecting');
    await expect(m.startJarvisLiveActivity(attrs)).resolves.toBe(true);
    expect(factory.start).toHaveBeenCalledTimes(1);
    expect(factory.start).toHaveBeenCalledWith(attrs);
  });

  // -------------------------------------------------------------------------
  // Cenário 3 — prevenção de duplicação (StrictMode / concorrência).
  // -------------------------------------------------------------------------
  test('arranques concorrentes partilham a mesma promessa: start chamado 1x', async () => {
    const { factory } = makeFakeFactory();
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    const a1 = m.attributesForState('listening');
    const a2 = m.attributesForState('processing');
    const [r1, r2] = await Promise.all([
      m.startJarvisLiveActivity(a1),
      m.startJarvisLiveActivity(a2),
    ]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(factory.start).toHaveBeenCalledTimes(1);
  });

  test('instância órfã (getInstances) é reaproveitada em vez de duplicada', async () => {
    const { factory, activity, instances } = makeFakeFactory();
    instances.push(activity); // simula atividade deixada por um arranque anterior
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    const attrs = m.attributesForState('listening');
    await expect(m.startJarvisLiveActivity(attrs)).resolves.toBe(true);
    expect(factory.start).not.toHaveBeenCalled();
    expect(activity.update).toHaveBeenCalledWith(attrs);
  });

  test('remontagem: start → stop → start recria sem duplicação em voo', async () => {
    const { factory } = makeFakeFactory();
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    await m.startJarvisLiveActivity(m.attributesForState('inactive'));
    await m.stopJarvisLiveActivity('immediate');
    await expect(m.startJarvisLiveActivity(m.attributesForState('listening'))).resolves.toBe(true);
    expect(factory.start).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Cenário 4 — atualização de estados reais.
  // -------------------------------------------------------------------------
  test('update propaga os atributos; sem atividade devolve false', async () => {
    const { activity } = makeFakeFactory();
    const factory = { start: jest.fn(() => activity), getInstances: jest.fn(() => []) };
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    const first = m.attributesForState('connecting');
    await m.startJarvisLiveActivity(first);
    const second = m.attributesForState('listening');
    await expect(m.updateJarvisLiveActivityAttributes(second)).resolves.toBe(true);
    expect(activity.update).toHaveBeenCalledWith(second);
    await m.stopJarvisLiveActivity('immediate');
    await expect(m.updateJarvisLiveActivityAttributes(second)).resolves.toBe(false);
  });

  test('mudanças rápidas de estado: sequência de updates resolve sem erros', async () => {
    const { activity } = makeFakeFactory();
    const factory = { start: jest.fn(() => activity), getInstances: jest.fn(() => []) };
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    await m.startJarvisLiveActivity(m.attributesForState('inactive'));
    const states: Array<Parameters<ManagerModule['updateJarvisLiveActivityState']>[0]> = [
      'connecting',
      'listening',
      'processing',
      'speaking',
      'error',
      'inactive',
    ];
    for (const state of states) {
      await expect(m.updateJarvisLiveActivityState(state)).resolves.toBe(true);
    }
    // getInstances vazio → start direto (sem update); depois N updates explícitos.
    expect(activity.update).toHaveBeenCalledTimes(states.length);
  });

  // -------------------------------------------------------------------------
  // Cenário 5 — encerramento e limpeza.
  // -------------------------------------------------------------------------
  test('stop termina a atividade atual com a política pedida', async () => {
    const { activity } = makeFakeFactory();
    const factory = { start: jest.fn(() => activity), getInstances: jest.fn(() => []) };
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    await m.startJarvisLiveActivity(m.attributesForState('speaking'));
    await expect(m.stopJarvisLiveActivity('immediate')).resolves.toBe(true);
    expect(activity.end).toHaveBeenCalledWith('immediate');
  });

  test('stop termina órfãs mesmo sem atividade local (getInstances)', async () => {
    const orphan = {
      update: jest.fn(async () => undefined),
      end: jest.fn(async () => undefined),
    };
    const factory = { start: jest.fn(() => orphan), getInstances: jest.fn(() => [orphan]) };
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    await expect(m.stopJarvisLiveActivity('default')).resolves.toBe(true);
    expect(orphan.end).toHaveBeenCalledWith('default');
  });

  test('end que lança não propaga a falha (app segue funcional)', async () => {
    const activity = {
      update: jest.fn(async () => undefined),
      end: jest.fn(async () => {
        throw new Error('ActivityKit error');
      }),
    };
    const factory = { start: jest.fn(() => activity), getInstances: jest.fn(() => []) };
    jest.doMock('./JarvisLiveActivity', () => ({ JarvisLiveActivityFactory: factory }));
    const m = loadManager();
    await m.startJarvisLiveActivity(m.attributesForState('inactive'));
    await expect(m.stopJarvisLiveActivity('immediate')).resolves.toBe(false);
  });

  // -------------------------------------------------------------------------
  // Cenário 6 — mapeamento dos estados REAIS (funções puras, sem mocks).
  // -------------------------------------------------------------------------
  test('mapToJarvisLiveActivityAttributes: prioridade dos estados reais', () => {
    const m = loadManager();
    type Source = Parameters<ManagerModule['mapToJarvisLiveActivityAttributes']>[0];
    const cases: Array<[Source, string, string]> = [
      [{ status: 'connecting', assistantState: 'sleeping', voiceMode: 'idle' }, 'connecting', 'A ligar'],
      [{ status: 'error', assistantState: 'active', voiceMode: 'speaking' }, 'error', 'Sem ligação'],
      [{ status: 'disconnected', assistantState: 'active', voiceMode: 'idle' }, 'inactive', 'Em espera'],
      [{ status: 'connected', assistantState: 'sleeping', voiceMode: 'speaking' }, 'speaking', 'A falar'],
      [{ status: 'connected', assistantState: 'sleeping', voiceMode: 'dictating' }, 'listening', 'A ouvir'],
      [{ status: 'connected', assistantState: 'sleeping', voiceMode: 'live-audio' }, 'listening', 'A ouvir'],
      [{ status: 'connected', assistantState: 'processing', voiceMode: 'idle' }, 'processing', 'A processar'],
      // 'active' sem voz ativa não simula escuta: fica em espera (honesto).
      [{ status: 'connected', assistantState: 'active', voiceMode: 'idle' }, 'inactive', 'Em espera'],
    ];
    for (const [source, state, label] of cases) {
      const attrs: Attributes = m.mapToJarvisLiveActivityAttributes(source);
      expect(attrs.state).toBe(state);
      expect(attrs.stateLabel).toBe(label);
    }
  });

  test('attributesForState cobre todos os estados com rótulos pt-PT', () => {
    const m = loadManager();
    const expected: Record<import('./types').JarvisLiveActivityState, string> = {
      inactive: 'Em espera',
      connecting: 'A ligar',
      listening: 'A ouvir',
      processing: 'A processar',
      speaking: 'A falar',
      error: 'Sem ligação',
    };
    for (const [state, label] of Object.entries(expected)) {
      const attrs = m.attributesForState(state as keyof typeof expected);
      expect(attrs.stateLabel).toBe(label);
      expect(attrs.summary.length).toBeGreaterThan(0);
    }
  });
});
