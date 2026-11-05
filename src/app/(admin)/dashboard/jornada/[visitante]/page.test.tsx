import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useParams } from 'next/navigation';
import VisitantePage from './page';
import { jornadaService } from '@/services/jornadaService';
import { ApiError } from '@/lib/apiError';
import type { VisitanteJornada } from '@/types/jornada';

// spec-2-painel RF-2-08, CA-2-08, CA-2-09, CA-2-10; blueprint §4 e §5.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useParams: vi.fn(), useRouter: vi.fn(() => ({ push: vi.fn() })) }));

const ID = '5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6';
const VISITA_TARDE = '1d5c6b9f-2a3b-4c4d-8e9f-8a7b6c5d4e3f';
const VISITA_NOITE = '0c4b5a8e-1f2a-4b3c-9d8e-7f6a5b4c3d2e';

const resposta: VisitanteJornada = {
  visitante: ID,
  visitas: [
    {
      visitante: ID, visita: VISITA_TARDE, inicio: '2026-11-05T20:12:00Z', fim: '2026-11-05T20:31:40Z',
      aparelho: 'computador', origem: 'google_ads', campanha: 'vitrine-novembro', paginas: 4,
      etapas: [1, 2, 3, 4, 5, 6, 7, 8], usos: ['lp_menu_tema'], teste: false,
    },
    {
      visitante: ID, visita: VISITA_NOITE, inicio: '2026-11-05T21:51:08Z', fim: '2026-11-05T21:51:21Z',
      aparelho: 'celular', origem: 'direto', paginas: 2, etapas: [1, 2], usos: [], teste: false,
    },
  ],
  eventos: [
    { em: '2026-11-05T20:12:00Z', nome: 'lp_page_view', caminho: '/', visita: VISITA_TARDE },
    { em: '2026-11-05T20:14:30Z', nome: 'lp_menu_tema', caminho: '/configurar/editar', visita: VISITA_TARDE },
    { em: '2026-11-05T20:31:40Z', nome: 'lp_checkout_succeeded', caminho: '/configurar/sucesso', visita: VISITA_TARDE },
    { em: '2026-11-05T21:51:08Z', nome: 'lp_editor_opened', caminho: '/configurar/editar', visita: VISITA_NOITE },
    { em: '2026-11-05T21:51:19Z', nome: 'lp_page_view', caminho: '/', visita: VISITA_NOITE },
    { em: '2026-11-05T21:51:21Z', nome: 'lp_evento_novo', caminho: '/configurar', visita: VISITA_NOITE },
  ],
  contratacoes: [
    {
      tenant_id: 'a1b2c3d4-0000-4000-8000-000000000001', nome: 'Espaço Sereno', status: 'ATIVO',
      pago: true, plano: 'pagina', em: '2026-11-05T20:31:40Z',
    },
  ],
};

// comRetry: o QueryClient do app (Providers) tenta de novo 3 vezes por padrão.
function renderizar(comRetry = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, ...(comRetry ? {} : { retry: false }) } } });
  render(
    <QueryClientProvider client={qc}>
      <VisitantePage />
    </QueryClientProvider>,
  );
}

describe('Página do visitante', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ visitante: ID });
    vi.mocked(jornadaService.visitante).mockResolvedValue(resposta);
  });

  test('cabeçalho: link de volta, 6 últimos caracteres, 1ª visita e total', async () => {
    renderizar();
    expect(screen.getByRole('link', { name: /Jornada/ })).toHaveAttribute('href', '/dashboard/jornada');
    expect(await screen.findByRole('heading', { level: 1, name: 'Visitante 2da0b6' })).toBeInTheDocument();
    expect(screen.getByText('1ª visita 5/11 17:12 · 2 visitas')).toBeInTheDocument();
    expect(jornadaService.visitante).toHaveBeenCalledWith(ID);
  });

  test('contratação com nome em link para o tenant, status, plano e data', async () => {
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Contratação' });
    expect(within(secao).getByRole('link', { name: 'Espaço Sereno' })).toHaveAttribute(
      'href', '/tenants/a1b2c3d4-0000-4000-8000-000000000001',
    );
    expect(within(secao).getByText('Pagou')).toBeInTheDocument();
    expect(within(secao).getByText('ATIVO')).toBeInTheDocument();
    expect(within(secao).getByText('Plano pagina')).toBeInTheDocument();
    expect(within(secao).getByText('5/11 17:31')).toBeInTheDocument();
  });

  test('CA-2-08 e CA-2-10: visitas da mais recente à mais antiga, eventos em ordem, rótulos em português e hora de Brasília', async () => {
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(visitas.map((s) => within(s).getByRole('heading').textContent)).toEqual([
      'Visita de 5/11 · 18:51 · Celular · Direto',
      'Visita de 5/11 · 17:12 · Computador · Anúncio do Google',
    ]);
    const linhas = (secao: HTMLElement) =>
      within(secao).getAllByRole('listitem').map((li) => li.textContent);
    expect(linhas(visitas[0])).toEqual([
      '18:51:08Abriu o editor/configurar/editar',
      '18:51:19Viu a página/',
      '18:51:21lp_evento_novo/configurar',
    ]);
    expect(linhas(visitas[1])).toEqual([
      '17:12:00Viu a página/',
      '17:14:30Menu: Editar tema/configurar/editar',
      '17:31:40Contratou/configurar/sucesso',
    ]);
  });

  test('CA-2-08: 404 mostra Visitante não encontrado e o link de volta', async () => {
    vi.mocked(jornadaService.visitante).mockRejectedValue(new ApiError('visitante_nao_encontrado', 404));
    renderizar(true);
    expect(await screen.findByText('Visitante não encontrado.')).toBeInTheDocument();
    expect(jornadaService.visitante).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /Jornada/ })).toHaveAttribute('href', '/dashboard/jornada');
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
  });

  test('CA-2-09: outro erro mostra a mensagem e Tentar de novo refaz a chamada', async () => {
    vi.mocked(jornadaService.visitante).mockRejectedValue(new ApiError('internal', 500));
    renderizar();
    expect(await screen.findByText('Não foi possível carregar.')).toBeInTheDocument();
    // 5xx ainda tenta de novo 3 vezes antes de mostrar o erro.
    expect(jornadaService.visitante).toHaveBeenCalledTimes(4);
    vi.mocked(jornadaService.visitante).mockResolvedValue(resposta);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Visitante 2da0b6' })).toBeInTheDocument();
    expect(jornadaService.visitante).toHaveBeenCalledTimes(5);
  });

  test('carregando marca a página com aria-busy', () => {
    vi.mocked(jornadaService.visitante).mockReturnValue(new Promise(() => {}));
    renderizar();
    expect(screen.getByRole('region', { name: 'Caminho do visitante' })).toHaveAttribute('aria-busy', 'true');
  });
});
