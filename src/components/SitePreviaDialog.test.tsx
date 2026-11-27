import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SitePreviaDialog } from './SitePreviaDialog';
import { tenantService } from '@/services/tenantService';
import type { SitePrevia } from '@/types/tenant';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getSitePrevia: vi.fn(),
  },
}));

// FIXTURE DO CONTRATO DA SPEC, não de uma resposta capturada da API:
// escrita a partir de RF-AP-60 (spec.md, acesso-antes-do-pagamento):
//   200: { "status": <SiteStatusForTenant>, "publicada": Config, "rascunho": Config | null }
//   Config = schema_version, layout_id, theme_id, content, contact,
//            hidden_sections, section_order e cta.
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
