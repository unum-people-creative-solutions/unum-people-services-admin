import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import { toolsUsoService } from '@/services/toolsUsoService';
import { ApiError } from '@/lib/apiError';
import { diasDoPeriodo } from '@/lib/toolsUso';
import type { FunilJornada } from '@/types/jornada';
import type { ResumoToolsUso } from '@/types/toolsUso';
// Resposta real de GET /admin/dashboard/tools-uso (api), copiada sem edição (L-071).
import fixtureToolsUso from '@/services/__fixtures__/tools-uso-resposta.json';

// medicao-de-uso RF-MU-08 e RF-MU-09: o cartão "Uso do Tools" na página da Jornada, com o mesmo período da página.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
vi.mock('@/services/toolsUsoService', () => ({ toolsUsoService: { resumo: vi.fn() } }));
vi.mock('@/services/jornadaModelosService', () => ({ jornadaModelosService: { resumo: vi.fn(() => new Promise(() => {})) } }));
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => '/dashboard/jornada') }));

const funil: FunilJornada = {
  etapas: [
    { etapa: 1, aparelho: 'celular', origem: 'utm:tools', visitas: 6 },
    { etapa: 1, aparelho: 'computador', origem: 'utm:tools', visitas: 2 },
    { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 30 },
  ],
  uso: [],
  pagou: [],
  leitura: [],
};

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <JornadaPage />
    </QueryClientProvider>,
  );
}

describe('Jornada: Uso do Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
    vi.mocked(jornadaService.visitas).mockResolvedValue([]);
    vi.mocked(toolsUsoService.resumo).mockResolvedValue(fixtureToolsUso as ResumoToolsUso);
  });

  test('o cartão aparece com os números da API e a linha das visitas vindas do Tools, sem depender do filtro de origem', async () => {
    renderizar();
    const cartao = await screen.findByRole('region', { name: 'Uso do Tools' });
    const quantoCobrar = await within(cartao).findByRole('row', { name: /^Quanto cobrar pelo serviço/ });
    expect(within(quantoCobrar).getAllByRole('cell').map((c) => c.textContent)).toEqual(['7', '2', '1', '1', '0', '—']);
    // O filtro de origem da página começa em "Anúncio do Google"; a linha do Tools soma utm:tools mesmo assim.
    expect(await within(cartao).findByText('Chegaram ao unumpeople.app pelo Tools: 8 visitas')).toBeInTheDocument();
  });

  test('pede o período da página em dias de Brasília e pede de novo ao trocar o período', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Uso do Tools' });
    await waitFor(() => expect(toolsUsoService.resumo).toHaveBeenCalledTimes(1));
    const [de, ate] = vi.mocked(toolsUsoService.resumo).mock.calls[0];
    // A janela padrão é "24 horas" e termina agora: as pontas são hoje e ontem (ou hoje) em Brasília.
    const agora = Date.now();
    const esperado = diasDoPeriodo(agora - 86_400_000, agora);
    expect([de, ate]).toEqual([esperado.de, esperado.ate]);

    fireEvent.click(screen.getByRole('button', { name: '30 dias' }));
    await waitFor(() => expect(toolsUsoService.resumo).toHaveBeenCalledTimes(2));
    const [de30] = vi.mocked(toolsUsoService.resumo).mock.calls[1];
    const trinta = diasDoPeriodo(Date.now() - 30 * 86_400_000, Date.now());
    expect(de30).toBe(trinta.de);
  });

  test('Atualizar refaz o cartão mesmo quando o período não mudou', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Uso do Tools' });
    await waitFor(() => expect(toolsUsoService.resumo).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(toolsUsoService.resumo).toHaveBeenCalledTimes(2));
  });

  test('erro da API aparece no cartão com "Tentar de novo", sem derrubar o resto da página', async () => {
    vi.mocked(toolsUsoService.resumo).mockRejectedValueOnce(new ApiError('periodo_invalido', 400));
    renderizar();
    const cartao = await screen.findByRole('region', { name: 'Uso do Tools' });
    const alerta = await within(cartao).findByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar.');
    expect(await screen.findByRole('region', { name: 'Motivos da reserva' })).toBeInTheDocument();

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(cartao).findByRole('table')).toBeInTheDocument();
    expect(toolsUsoService.resumo).toHaveBeenCalledTimes(2);
  });

  test('sem uso no período: estado vazio literal, e a linha do Tools continua', async () => {
    vi.mocked(toolsUsoService.resumo).mockResolvedValue({
      ...(fixtureToolsUso as ResumoToolsUso),
      ferramentas: (fixtureToolsUso as ResumoToolsUso).ferramentas.map((f) => ({
        ...f, visita: 0, comecou: 0, resultado: 0, convite: 0, guia: 0, planilha: 0,
      })),
      dias: [],
    });
    renderizar();
    const cartao = await screen.findByRole('region', { name: 'Uso do Tools' });
    expect(await within(cartao).findByText('Ainda não há uso do Tools neste período.')).toBeInTheDocument();
  });

  test('se o funil da jornada falha, a linha do Tools some mas a tabela fica', async () => {
    vi.mocked(jornadaService.funil).mockRejectedValue(new ApiError('internal', 500));
    renderizar();
    const cartao = await screen.findByRole('region', { name: 'Uso do Tools' });
    expect(await within(cartao).findByRole('table')).toBeInTheDocument();
    expect(within(cartao).queryByText(/Chegaram ao unumpeople\.app/)).toBeNull();
  });
});
