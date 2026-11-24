import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import { toolsUsoService } from '@/services/toolsUsoService';
import { jornadaModelosService } from '@/services/jornadaModelosService';
import { jornadaOpinioesService } from '@/services/jornadaOpinioesService';
import { ApiError } from '@/lib/apiError';
import { diasDoPeriodo } from '@/lib/toolsUso';
import type { FunilJornada } from '@/types/jornada';
import type { ResumoDeModelos } from '@/types/jornadaModelos';
import type { ResumoDeOpinioes } from '@/types/jornadaOpinioes';
import type { ResumoToolsUso } from '@/types/toolsUso';
// Respostas reais (api), copiadas sem edição (L-071).
import fixtureModelos from '@/services/__fixtures__/jornada-modelos-resposta.json';
import fixtureOpinioes from '@/services/__fixtures__/jornada-opinioes-resposta.json';
import fixtureToolsUso from '@/services/__fixtures__/tools-uso-resposta.json';

// opiniao-e-modelos RF-OM-19: o cartão "Opiniões" na página da Jornada, com o período da página.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
vi.mock('@/services/toolsUsoService', () => ({ toolsUsoService: { resumo: vi.fn() } }));
vi.mock('@/services/jornadaModelosService', () => ({ jornadaModelosService: { resumo: vi.fn() } }));
vi.mock('@/services/jornadaOpinioesService', () => ({ jornadaOpinioesService: { resumo: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => '/dashboard/jornada') }));

const funil: FunilJornada = { etapas: [], uso: [], pagou: [], leitura: [] };

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <JornadaPage />
    </QueryClientProvider>,
  );
}

describe('Jornada: Opiniões', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
    vi.mocked(jornadaService.visitas).mockResolvedValue([]);
    vi.mocked(toolsUsoService.resumo).mockResolvedValue(fixtureToolsUso as ResumoToolsUso);
    vi.mocked(jornadaModelosService.resumo).mockResolvedValue(fixtureModelos as ResumoDeModelos);
    vi.mocked(jornadaOpinioesService.resumo).mockResolvedValue(fixtureOpinioes as ResumoDeOpinioes);
  });

  test('o cartão aparece com média, total, lista e o rótulo do modelo vindo do cartão Modelos', async () => {
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Opiniões' });
    expect(await within(secao).findByText('Média: 3,7 de 5')).toBeInTheDocument();
    expect(within(secao).getByText('3 opiniões')).toBeInTheDocument();
    const lista = within(secao).getByRole('list', { name: 'Opiniões do período' });
    await waitFor(() => expect(within(lista).getAllByRole('listitem')[0]).toHaveTextContent('Refúgio'));
    expect(jornadaOpinioesService.resumo).toHaveBeenCalledTimes(1);
  });

  test('pede o período da página em dias de Brasília e pede de novo ao trocar o período', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Opiniões' });
    await waitFor(() => expect(jornadaOpinioesService.resumo).toHaveBeenCalledTimes(1));
    const [de, ate] = vi.mocked(jornadaOpinioesService.resumo).mock.calls[0];
    const agora = Date.now();
    const esperado = diasDoPeriodo(agora - 86_400_000, agora);
    expect([de, ate]).toEqual([esperado.de, esperado.ate]);

    fireEvent.click(screen.getByRole('button', { name: '30 dias' }));
    await waitFor(() => expect(jornadaOpinioesService.resumo).toHaveBeenCalledTimes(2));
    const [de30, ate30] = vi.mocked(jornadaOpinioesService.resumo).mock.calls[1];
    const trinta = diasDoPeriodo(Date.now() - 30 * 86_400_000, Date.now());
    expect(de30).toBe(trinta.de);
    expect(ate30).toBe(trinta.ate);
  });

  test('Atualizar refaz o cartão mesmo quando o período não mudou', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Opiniões' });
    await waitFor(() => expect(jornadaOpinioesService.resumo).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(jornadaOpinioesService.resumo).toHaveBeenCalledTimes(2));
  });

  test('erro da API aparece no cartão com "Tentar de novo", sem derrubar o resto da página', async () => {
    vi.mocked(jornadaOpinioesService.resumo).mockRejectedValueOnce(new ApiError('internal', 500));
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Opiniões' });
    const alerta = await within(secao).findByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar.');
    expect(await screen.findByRole('region', { name: 'Modelos' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Motivos da reserva' })).toBeInTheDocument();

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(secao).findByText('Média: 3,7 de 5')).toBeInTheDocument();
    expect(jornadaOpinioesService.resumo).toHaveBeenCalledTimes(2);
  });

  test('o erro do cartão Modelos não derruba as opiniões: a lista mostra o id do modelo', async () => {
    vi.mocked(jornadaModelosService.resumo).mockRejectedValue(new ApiError('internal', 500));
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Opiniões' });
    expect(await within(secao).findByText('Média: 3,7 de 5')).toBeInTheDocument();
    const lista = within(secao).getByRole('list', { name: 'Opiniões do período' });
    expect(within(lista).getAllByRole('listitem')[0]).toHaveTextContent('l11');
  });

  test('sem opiniões no período: estado vazio literal', async () => {
    vi.mocked(jornadaOpinioesService.resumo).mockResolvedValue({
      ...(fixtureOpinioes as ResumoDeOpinioes),
      media: 0,
      total: 0,
      por_nota: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      opinioes: [],
    });
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Opiniões' });
    expect(await within(secao).findByText('Ainda não há opiniões neste período.')).toBeInTheDocument();
  });
});
