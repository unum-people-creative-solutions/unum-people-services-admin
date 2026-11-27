import { render, screen, fireEvent, within } from '@testing-library/react';
import { TenantSitesSection } from './TenantSitesSection';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { tenantService } from '@/services/tenantService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Site, SiteDetail } from '@/types/tenant';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    listSites: vi.fn(),
    getSite: vi.fn(),
    getSitePrevia: vi.fn(),
  },
}));

describe('TenantSitesSection Component', () => {
  const mockTenantId = 'tenant-123';
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  function renderSection() {
    return render(
      <QueryClientProvider client={queryClient}>
        <TenantSitesSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );
  }

  test('T01 - lista os sites com slug, status, layout/tema e link do site', async () => {
    vi.mocked(tenantService.listSites).mockResolvedValue([
      {
        site_id: 'lp_t1',
        slug: 'estudio-foto',
        status: 'aguardando_ativacao',
        url: 'https://estudio-foto.unumpeople.app',
        layout_id: 'l1',
        theme_id: 't1',
        created_at: '2026-09-06T10:00:00Z',
      },
    ] as Site[]);

    renderSection();

    expect(await screen.findByText('estudio-foto')).toBeDefined();
    expect(screen.getByText((c, el) => el?.tagName.toLowerCase() === 'span' && el?.textContent?.trim() === 'Aguardando ativação')).toBeDefined();
    expect(screen.getByText('l1 / t1')).toBeDefined();

    const link = screen.getByRole('link', { name: /Abrir site/i });
    expect(link).toHaveAttribute('href', 'https://estudio-foto.unumpeople.app');
  });

  // fix-achados-2b-3-5, critério 5: a API devolve o status derivado do
  // tenant (no_ar | aguardando_ativacao | suspenso | cancelado).
  test.each([
    ['no_ar', 'No ar'],
    ['aguardando_ativacao', 'Aguardando ativação'],
    ['suspenso', 'Suspenso'],
    ['cancelado', 'Cancelado'],
  ])('T05 - status "%s" mostra o rótulo "%s" na coluna Status', async (status, rotulo) => {
    vi.mocked(tenantService.listSites).mockResolvedValue([
      {
        site_id: 'lp_t1',
        slug: 'estudio-foto',
        status,
        url: 'https://estudio-foto.unumpeople.app',
        layout_id: 'l1',
        theme_id: 't1',
      },
    ] as Site[]);

    renderSection();

    const linha = (await screen.findByText('estudio-foto')).closest('tr') as HTMLElement;
    const celulas = within(linha).getAllByRole('cell');
    expect(celulas[1].textContent?.trim()).toBe(rotulo);
  });

  test('T06 - status desconhecido (AGUARDANDO_ATIVACAO da api antiga) mostra o texto cru', async () => {
    vi.mocked(tenantService.listSites).mockResolvedValue([
      {
        site_id: 'lp_t1',
        slug: 'estudio-foto',
        status: 'AGUARDANDO_ATIVACAO',
        url: 'https://estudio-foto.unumpeople.app',
        layout_id: 'l1',
        theme_id: 't1',
      },
    ] as unknown as Site[]);

    renderSection();

    const linha = (await screen.findByText('estudio-foto')).closest('tr') as HTMLElement;
    const celulas = within(linha).getAllByRole('cell');
    expect(celulas[1].textContent?.trim()).toBe('AGUARDANDO_ATIVACAO');
  });

  test('T02 - trata estado vazio sem sites', async () => {
    vi.mocked(tenantService.listSites).mockResolvedValue([]);

    renderSection();

    expect(await screen.findByText('Nenhum site do LP Builder para este tenant.')).toBeDefined();
  });

  test('T03 - trata erro de listSites sem quebrar', async () => {
    vi.mocked(tenantService.listSites).mockRejectedValue(new Error('Network error'));

    renderSection();

    expect(await screen.findByText('Erro ao carregar sites.')).toBeDefined();
  });

  test('T04 - "Ver config" abre o detalhe com content/contact/seo', async () => {
    vi.mocked(tenantService.listSites).mockResolvedValue([
      {
        site_id: 'lp_t1',
        slug: 'estudio-foto',
        status: 'aguardando_ativacao',
        url: 'https://estudio-foto.unumpeople.app',
        layout_id: 'l1',
        theme_id: 't1',
      },
    ] as Site[]);
    vi.mocked(tenantService.getSite).mockResolvedValue({
      site_id: 'lp_t1',
      slug: 'estudio-foto',
      status: 'aguardando_ativacao',
      url: 'https://estudio-foto.unumpeople.app',
      layout_id: 'l1',
      theme_id: 't1',
      schema_version: 1,
      content: { 'header.business_name': { kind: 'text', value: 'Estúdio Foto' } },
      contact: { whatsapp: '41999998888' },
      seo: { title: 'Estúdio Foto' },
    } as SiteDetail);

    renderSection();

    const verConfigBtn = await screen.findByRole('button', { name: /Ver config/i });
    fireEvent.click(verConfigBtn);

    expect(await screen.findByText(/header\.business_name/)).toBeDefined();
    expect(screen.getByText(/41999998888/)).toBeDefined();
    expect(tenantService.getSite).toHaveBeenCalledWith(mockTenantId, 'lp_t1');
  });

  test('T21 - "Ver prévia" fica depois de "Ver config" e abre o diálogo da prévia do site', async () => {
    vi.mocked(tenantService.listSites).mockResolvedValue([
      {
        site_id: 'lp_t1',
        slug: 'estudio-foto',
        status: 'aguardando_ativacao',
        url: 'https://estudio-foto.unumpeople.app',
        layout_id: 'l1',
        theme_id: 't1',
      },
    ] as Site[]);
    // Forma da resposta definida em RF-AP-60 (spec acesso-antes-do-pagamento).
    vi.mocked(tenantService.getSitePrevia).mockResolvedValue({
      status: 'aguardando_ativacao',
      publicada: { schema_version: 1, layout_id: 'l1', theme_id: 't1', content: {}, contact: {}, hidden_sections: [], section_order: [], cta: {} },
      rascunho: null,
    });

    renderSection();

    const linha = (await screen.findByText('estudio-foto')).closest('tr') as HTMLElement;
    const botoes = within(linha).getAllByRole('button').map((b) => b.textContent?.trim());
    expect(botoes).toEqual(['Ver config', 'Ver prévia']);

    fireEvent.click(within(linha).getByRole('button', { name: /Ver prévia/i }));

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByRole('heading', { name: 'Prévia da página · só a equipe Unum vê · ainda não está no ar' })).toBeDefined();
    expect(tenantService.getSitePrevia).toHaveBeenCalledWith(mockTenantId, 'lp_t1');
  });
});
