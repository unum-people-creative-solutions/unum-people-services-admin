import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, expectTypeOf, test, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SitePreviaDialog, fatorDeEscala } from './SitePreviaDialog';
import { tenantService } from '@/services/tenantService';
import type { SitePrevia } from '@/types/tenant';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getSitePrevia: vi.fn(),
  },
}));

// FIXTURES DO CONTRATO, não de uma resposta capturada da API: escritas a partir de RF-AP-60
// (spec.md, acesso-antes-do-pagamento) e do handler da API (sitePreviaConfig em
// internal/handler/admin_handler.go):
//   200: { "status": <SiteStatusForTenant>, "publicada": Config, "rascunho": Config | null }
//   Config = schema_version, layout_id, theme_id, content (objeto, nunca nulo), contact (objeto),
//            hidden_sections (sempre array), e section_order e cta SÓ quando não vazios.
//   rascunho é o literal null quando não há rascunho.
const PUBLICADA: SitePrevia['publicada'] = {
  schema_version: 1,
  layout_id: 'l1',
  theme_id: 't1',
  content: { 'header.business_name': { kind: 'text', value: 'Doces da Ana (publicada)' } },
  contact: { whatsapp: '41999998888' },
  hidden_sections: ['blog'],
  section_order: ['sobre', 'servicos'],
  cta: { tipo: 'whatsapp' },
};

const RASCUNHO: NonNullable<SitePrevia['rascunho']> = {
  ...PUBLICADA,
  content: { 'header.business_name': { kind: 'text', value: 'Doces da Ana (rascunho)' } },
};

// Página sem ordem de seções nem CTA: a API omite as duas chaves (não manda [] nem {}).
const CONFIG_ENXUTA: SitePrevia['publicada'] = {
  schema_version: 1,
  layout_id: 'l1',
  theme_id: 't1',
  content: {},
  contact: {},
  hidden_sections: [],
};

const PREVIA_COM_RASCUNHO: SitePrevia = {
  status: 'aguardando_ativacao',
  publicada: PUBLICADA,
  rascunho: RASCUNHO,
};

const PREVIA_SEM_RASCUNHO: SitePrevia = {
  status: 'no_ar',
  publicada: PUBLICADA,
  rascunho: null,
};

const ORIGEM_DO_LP_BUILDER = 'https://unumpeople.app';
const TITULO = 'Prévia da página · só a equipe Unum vê';

function renderDialog(props: Partial<React.ComponentProps<typeof SitePreviaDialog>> = {}) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <SitePreviaDialog tenantId="tenant-123" siteId="lp_t1" status="no_ar" onClose={onClose} {...props} />
    </QueryClientProvider>
  );
  return { ...utils, onClose };
}

function iframeDoVisor(): HTMLIFrameElement {
  return screen.getByTitle('Visor da prévia') as HTMLIFrameElement;
}

// Espia o postMessage do iframe do visor (o jsdom não carrega a URL de verdade).
function espiarPostMessage() {
  return vi.spyOn(iframeDoVisor().contentWindow as Window, 'postMessage').mockImplementation(() => undefined);
}

function receberMensagem(origin: string, data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { origin, data }));
  });
}

describe('SitePreviaDialog — diálogo da prévia do operador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantService.getSitePrevia).mockResolvedValue(PREVIA_COM_RASCUNHO);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('T21a - busca a prévia do site e abre o diálogo com o título; conta aguardando ganha o sufixo', async () => {
    renderDialog({ status: 'aguardando_ativacao' });

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByRole('heading', { name: `${TITULO} · ainda não está no ar` })).toBeDefined();
    expect(tenantService.getSitePrevia).toHaveBeenCalledWith('tenant-123', 'lp_t1');
  });

  test('T21b - conta no ar: título sem o sufixo', async () => {
    vi.mocked(tenantService.getSitePrevia).mockResolvedValue(PREVIA_SEM_RASCUNHO);
    renderDialog({ status: 'no_ar' });

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByRole('heading', { name: TITULO })).toBeDefined();
  });

  test('T21c - Esc fecha o diálogo', async () => {
    const { onClose } = renderDialog();
    const dialogo = await screen.findByRole('dialog');

    fireEvent.keyDown(dialogo, { key: 'Escape', code: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  test('T21d - foco preso: o foco nasce dentro do diálogo e não sai dele', async () => {
    render(<button type="button">Fora do diálogo</button>);
    const fora = screen.getByRole('button', { name: 'Fora do diálogo' });
    renderDialog();
    const dialogo = await screen.findByRole('dialog');

    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true));

    act(() => fora.focus());

    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  test('T21e - iframe aponta para /visor-operador do lp-builder (padrão unumpeople.app)', async () => {
    renderDialog();
    await screen.findByRole('dialog');

    expect(iframeDoVisor()).toHaveAttribute('src', `${ORIGEM_DO_LP_BUILDER}/visor-operador`);
  });

  test('T21f - NEXT_PUBLIC_CONFIGURADOR_URL troca a origem do iframe e o alvo do postMessage', async () => {
    vi.stubEnv('NEXT_PUBLIC_CONFIGURADOR_URL', 'https://lp.exemplo.dev/');
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    expect(iframeDoVisor()).toHaveAttribute('src', 'https://lp.exemplo.dev/visor-operador');

    receberMensagem('https://lp.exemplo.dev', { tipo: 'lp-visor-operador-pronto' });

    await waitFor(() => expect(espia).toHaveBeenCalledTimes(1));
    expect(espia.mock.calls[0][1]).toBe('https://lp.exemplo.dev');
  });

  test('T21g - "pronto" da origem do lp-builder faz o admin enviar o config com targetOrigin exato (nunca "*")', async () => {
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });

    await waitFor(() => expect(espia).toHaveBeenCalledTimes(1));
    expect(espia).toHaveBeenCalledWith({ tipo: 'lp-visor-operador', config: PUBLICADA }, ORIGEM_DO_LP_BUILDER);
    for (const chamada of espia.mock.calls) {
      expect(chamada[1]).not.toBe('*');
    }
  });

  test('T21h - "pronto" de outra origem é ignorado: nada é enviado', async () => {
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    receberMensagem('https://evil.example.com', { tipo: 'lp-visor-operador-pronto' });
    receberMensagem('https://unumpeople.app.evil.com', { tipo: 'lp-visor-operador-pronto' });
    receberMensagem('http://unumpeople.app', { tipo: 'lp-visor-operador-pronto' });
    await new Promise((r) => setTimeout(r, 20));

    expect(espia).not.toHaveBeenCalled();
  });

  test('T21i - mensagem da origem certa mas de outro tipo é ignorada', async () => {
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-pronto' });
    receberMensagem(ORIGEM_DO_LP_BUILDER, 'lp-visor-operador-pronto');
    receberMensagem(ORIGEM_DO_LP_BUILDER, null);
    await new Promise((r) => setTimeout(r, 20));

    expect(espia).not.toHaveBeenCalled();
  });

  test('T21j - "pronto" chega antes da resposta da API: o config sai quando os dados chegam', async () => {
    let resolver!: (v: SitePrevia) => void;
    vi.mocked(tenantService.getSitePrevia).mockReturnValue(new Promise((r) => { resolver = r; }));
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();

    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });
    expect(espia).not.toHaveBeenCalled();

    await act(async () => resolver(PREVIA_COM_RASCUNHO));

    await waitFor(() => expect(espia).toHaveBeenCalledWith({ tipo: 'lp-visor-operador', config: PUBLICADA }, ORIGEM_DO_LP_BUILDER));
  });

  test('T21k - seletores Celular (390) e Computador (1280) mudam a largura do iframe', async () => {
    renderDialog();
    await screen.findByRole('dialog');

    const celular = screen.getByRole('button', { name: 'Celular' });
    const computador = screen.getByRole('button', { name: 'Computador' });
    expect(celular).toHaveAttribute('aria-pressed', 'true');
    expect(iframeDoVisor()).toHaveAttribute('width', '390');

    fireEvent.click(computador);

    expect(computador).toHaveAttribute('aria-pressed', 'true');
    expect(celular).toHaveAttribute('aria-pressed', 'false');
    expect(iframeDoVisor()).toHaveAttribute('width', '1280');
  });

  test('T21l - com rascunho: Publicada e Rascunho aparecem, e escolher Rascunho envia o config do rascunho', async () => {
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());
    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });
    await waitFor(() => expect(espia).toHaveBeenCalledTimes(1));

    const publicada = await screen.findByRole('button', { name: 'Publicada' });
    const rascunho = screen.getByRole('button', { name: 'Rascunho' });
    expect(publicada).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(rascunho);

    expect(rascunho).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(espia).toHaveBeenLastCalledWith({ tipo: 'lp-visor-operador', config: RASCUNHO }, ORIGEM_DO_LP_BUILDER));
  });

  test('T21m - rascunho null: sem Publicada/Rascunho, e a prévia mostra a publicada', async () => {
    vi.mocked(tenantService.getSitePrevia).mockResolvedValue(PREVIA_SEM_RASCUNHO);
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });

    await waitFor(() => expect(espia).toHaveBeenCalledWith({ tipo: 'lp-visor-operador', config: PUBLICADA }, ORIGEM_DO_LP_BUILDER));
    expect(screen.queryByRole('button', { name: 'Publicada' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rascunho' })).toBeNull();
  });

  test('T21n - com siteId nulo o diálogo fica fechado e a API não é chamada', () => {
    renderDialog({ siteId: null });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(tenantService.getSitePrevia).not.toHaveBeenCalled();
  });
});

const MENSAGEM_DE_ERRO = 'Não foi possível abrir a prévia. Tente de novo.';

describe('SitePreviaDialog — estados de carregando e erro (RF-AP-63)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantService.getSitePrevia).mockResolvedValue(PREVIA_COM_RASCUNHO);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('T22a - "Carregando a prévia…" até o visor desenhar; some quando o config é enviado', async () => {
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();

    expect(screen.getByRole('status')).toHaveTextContent('Carregando a prévia…');
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());
    // dados chegaram, mas o visor ainda não avisou "pronto"
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a prévia…');

    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });

    await waitFor(() => expect(espia).toHaveBeenCalled());
    expect(screen.queryByText('Carregando a prévia…')).toBeNull();
    expect(screen.queryByText(MENSAGEM_DE_ERRO)).toBeNull();
  });

  test('T22b - erro da API mostra a mensagem e "Tentar de novo"', async () => {
    vi.mocked(tenantService.getSitePrevia).mockRejectedValue(new Error('500'));
    renderDialog();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(MENSAGEM_DE_ERRO);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined();
    expect(screen.queryByText('Carregando a prévia…')).toBeNull();
  });

  test('T22c - "Tentar de novo" busca de novo e, dando certo, a mensagem some e o config é enviado', async () => {
    vi.mocked(tenantService.getSitePrevia).mockRejectedValueOnce(new Error('500'));
    renderDialog();
    await screen.findByRole('alert');
    expect(tenantService.getSitePrevia).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    const espia = espiarPostMessage();
    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });
    await waitFor(() => expect(espia).toHaveBeenCalledWith({ tipo: 'lp-visor-operador', config: PUBLICADA }, ORIGEM_DO_LP_BUILDER));
  });

  test('T22d - iframe sem "pronto" em 10 s mostra a mensagem e "Tentar de novo"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDialog();
    await screen.findByRole('dialog');
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    act(() => { vi.advanceTimersByTime(9_900); });
    expect(screen.queryByRole('alert')).toBeNull();

    act(() => { vi.advanceTimersByTime(200); });

    expect(screen.getByRole('alert')).toHaveTextContent(MENSAGEM_DE_ERRO);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined();
  });

  test('T22e - com "pronto" a tempo, passados 10 s não há erro', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDialog();
    await screen.findByRole('dialog');
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });
    act(() => { vi.advanceTimersByTime(15_000); });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('T22f - "pronto" de outra origem não evita o timeout de 10 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDialog();
    await screen.findByRole('dialog');
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    receberMensagem('https://evil.example.com', { tipo: 'lp-visor-operador-pronto' });
    act(() => { vi.advanceTimersByTime(10_100); });

    expect(screen.getByRole('alert')).toHaveTextContent(MENSAGEM_DE_ERRO);
  });

  test('T22g - "Tentar de novo" depois do timeout busca de novo, volta a "Carregando" e reinicia o relógio', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDialog();
    await screen.findByRole('dialog');
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalledTimes(1));
    act(() => { vi.advanceTimersByTime(10_100); });
    expect(screen.getByRole('alert')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a prévia…');

    // o iframe novo manda "pronto": sem erro depois dos 10 s
    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('fatorDeEscala — a página de 1280 px entra escalada na largura disponível', () => {
  test.each([
    [976, 1280, 0.7625],
    [640, 1280, 0.5],
    [1280, 1280, 1],
    [2000, 1280, 1], // nunca amplia
    [976, 390, 1], // o celular já cabe
    [0, 1280, 1], // sem medida (ainda não renderizou): não escala
    [-10, 1280, 1],
    [Number.NaN, 1280, 1],
  ])('largura disponível %s, largura lógica %s → %s', (disponivel, logica, esperado) => {
    expect(fatorDeEscala(disponivel, logica)).toBeCloseTo(esperado, 6);
  });
});

describe('SitePreviaDialog — Computador escalado para caber (nada cortado na horizontal)', () => {
  const OriginalResizeObserver = globalThis.ResizeObserver;

  // O jsdom não tem layout nem ResizeObserver: o stub informa uma largura disponível fixa.
  function instalarLarguraDisponivel(largura: number) {
    globalThis.ResizeObserver = class {
      constructor(private aoMedir: ResizeObserverCallback) {}
      observe(alvo: Element) {
        this.aoMedir([{ target: alvo, contentRect: { width: largura } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantService.getSitePrevia).mockResolvedValue(PREVIA_COM_RASCUNHO);
  });

  afterEach(() => {
    globalThis.ResizeObserver = OriginalResizeObserver;
  });

  test('T21o - Computador mantém 1280 de largura lógica e aplica scale(largura disponível / 1280) com origem no topo à esquerda', async () => {
    instalarLarguraDisponivel(976);
    renderDialog();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Computador' }));

    const iframe = iframeDoVisor();
    expect(iframe).toHaveAttribute('width', '1280');
    expect(iframe.style.transform).toBe('scale(0.7625)');
    expect(iframe.style.transformOrigin).toMatch(/^(top left|0% 0%|left top)/);
  });

  test('T21p - o contêiner do iframe ocupa a largura e a altura escaladas', async () => {
    instalarLarguraDisponivel(976);
    renderDialog();
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Computador' }));

    const contenedor = iframeDoVisor().parentElement as HTMLElement;
    expect(contenedor.style.width).toBe('976px');
    expect(contenedor.style.height).toBe(`${Number(iframeDoVisor().getAttribute('height')) * 0.7625}px`);
  });

  test('T21q - Celular (390) cabe sem escala', async () => {
    instalarLarguraDisponivel(976);
    renderDialog();
    await screen.findByRole('dialog');

    const iframe = iframeDoVisor();
    expect(iframe).toHaveAttribute('width', '390');
    expect(iframe.style.transform).toBe('scale(1)');
    expect((iframe.parentElement as HTMLElement).style.width).toBe('390px');
  });

  test('T21r - o config segue chegando ao visor com a escala aplicada (targetOrigin exato)', async () => {
    instalarLarguraDisponivel(976);
    renderDialog();
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Computador' }));
    const espia = espiarPostMessage();
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });

    await waitFor(() => expect(espia).toHaveBeenCalledWith({ tipo: 'lp-visor-operador', config: PUBLICADA }, ORIGEM_DO_LP_BUILDER));
  });
});

describe('SitePrevia — tipo fiel ao contrato da API (RF-AP-60)', () => {
  test('T21s - content, contact e hidden_sections são obrigatórios; section_order e cta, opcionais; rascunho é null literal', () => {
    expectTypeOf<SitePrevia['publicada']['content']>().toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf<SitePrevia['publicada']['contact']>().toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf<SitePrevia['publicada']['hidden_sections']>().toEqualTypeOf<string[]>();
    expectTypeOf<SitePrevia['publicada']['section_order']>().toEqualTypeOf<string[] | undefined>();
    expectTypeOf<SitePrevia['publicada']['cta']>().toEqualTypeOf<Record<string, unknown> | undefined>();
    expectTypeOf<SitePrevia['rascunho']>().toEqualTypeOf<SitePrevia['publicada'] | null>();
    expect(CONFIG_ENXUTA).not.toHaveProperty('cta');
  });

  test('T21t - config sem section_order e cta (como a API manda) é enviado ao visor do jeito que veio', async () => {
    vi.mocked(tenantService.getSitePrevia).mockResolvedValue({ status: 'no_ar', publicada: CONFIG_ENXUTA, rascunho: null });
    renderDialog();
    await screen.findByRole('dialog');
    const espia = espiarPostMessage();
    await waitFor(() => expect(tenantService.getSitePrevia).toHaveBeenCalled());

    receberMensagem(ORIGEM_DO_LP_BUILDER, { tipo: 'lp-visor-operador-pronto' });

    await waitFor(() => expect(espia).toHaveBeenCalledWith({ tipo: 'lp-visor-operador', config: CONFIG_ENXUTA }, ORIGEM_DO_LP_BUILDER));
    const config = espia.mock.calls[0][0] as { config: object };
    expect(config.config).not.toHaveProperty('section_order');
    expect(config.config).not.toHaveProperty('cta');
  });
});

