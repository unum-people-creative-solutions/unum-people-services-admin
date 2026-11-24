import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import { toolsUsoService } from '@/services/toolsUsoService';
import { jornadaModelosService } from '@/services/jornadaModelosService';
import { ApiError } from '@/lib/apiError';
import { diasDoPeriodo } from '@/lib/toolsUso';
import type { FunilJornada } from '@/types/jornada';
import type { ResumoDeModelos } from '@/types/jornadaModelos';
import type { ResumoToolsUso } from '@/types/toolsUso';
// Respostas reais (api), copiadas sem edição (L-071).
import fixtureModelos from '@/services/__fixtures__/jornada-modelos-resposta.json';
import fixtureToolsUso from '@/services/__fixtures__/tools-uso-resposta.json';

// opiniao-e-modelos RF-OM-08: os cartões "Modelos" e "Cores" na página da Jornada, com o período da página.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
vi.mock('@/services/toolsUsoService', () => ({ toolsUsoService: { resumo: vi.fn() } }));
vi.mock('@/services/jornadaModelosService', () => ({ jornadaModelosService: { resumo: vi.fn() } }));
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

describe('Jornada: Modelos e Cores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
    vi.mocked(jornadaService.visitas).mockResolvedValue([]);
    vi.mocked(toolsUsoService.resumo).mockResolvedValue(fixtureToolsUso as ResumoToolsUso);
    vi.mocked(jornadaModelosService.resumo).mockResolvedValue(fixtureModelos as ResumoDeModelos);
  });

  test('os dois cartões aparecem com os números da resposta, numa só chamada', async () => {
    renderizar();
    const modelos = await screen.findByRole('region', { name: 'Modelos' });
    const refugio = await within(modelos).findByRole('row', { name: /^Refúgio/ });
    expect(within(refugio).getAllByRole('cell').map((c) => c.textContent)).toEqual(['6', '0', '0', '3', '1', '3']);
    const cores = await screen.findByRole('region', { name: 'Cores' });
    const verde = await within(cores).findByRole('row', { name: /^Verde claro/ });
    expect(within(verde).getAllByRole('cell').map((c) => c.textContent)).toEqual(['5', '0', '0', '2', '0', '3']);
    expect(jornadaModelosService.resumo).toHaveBeenCalledTimes(1);
  });

  test('a primeira coluna de cada cartão tem o nome literal: "Modelo" e "Cores"', async () => {
    renderizar();
    const modelos = await screen.findByRole('region', { name: 'Modelos' });
    const cores = await screen.findByRole('region', { name: 'Cores' });
    const cabecalhos = async (c: HTMLElement) =>
      (await within(c).findAllByRole('columnheader')).map((h) => h.textContent);
    expect(await cabecalhos(modelos)).toEqual([
      'Modelo', 'Montados pela IA', 'Escolhidos pela pessoa', 'Reserva', 'Trocaram por outro', 'Vieram de outro', 'Contratados',
    ]);
    expect(await cabecalhos(cores)).toEqual([
      'Cores', 'Montados pela IA', 'Escolhidos pela pessoa', 'Reserva', 'Trocaram por outro', 'Vieram de outro', 'Contratados',
    ]);
  });

  test('pede o período da página em dias de Brasília e pede de novo ao trocar o período', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Modelos' });
    await waitFor(() => expect(jornadaModelosService.resumo).toHaveBeenCalledTimes(1));
    const [de, ate] = vi.mocked(jornadaModelosService.resumo).mock.calls[0];
    const agora = Date.now();
    const esperado = diasDoPeriodo(agora - 86_400_000, agora);
    expect([de, ate]).toEqual([esperado.de, esperado.ate]);

    fireEvent.click(screen.getByRole('button', { name: '30 dias' }));
    await waitFor(() => expect(jornadaModelosService.resumo).toHaveBeenCalledTimes(2));
    const [de30, ate30] = vi.mocked(jornadaModelosService.resumo).mock.calls[1];
    const trinta = diasDoPeriodo(Date.now() - 30 * 86_400_000, Date.now());
    expect(de30).toBe(trinta.de);
    expect(ate30).toBe(trinta.ate);
  });

  test('Atualizar refaz os cartões mesmo quando o período não mudou', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Modelos' });
    await waitFor(() => expect(jornadaModelosService.resumo).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(jornadaModelosService.resumo).toHaveBeenCalledTimes(2));
  });

  test('erro da API aparece nos dois cartões com "Tentar de novo", sem derrubar o resto da página', async () => {
    vi.mocked(jornadaModelosService.resumo).mockRejectedValueOnce(new ApiError('internal', 500));
    renderizar();
    const modelos = await screen.findByRole('region', { name: 'Modelos' });
    const cores = await screen.findByRole('region', { name: 'Cores' });
    const alerta = await within(modelos).findByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar.');
    expect(await within(cores).findByRole('alert')).toHaveTextContent('Não foi possível carregar.');
    expect(await screen.findByRole('region', { name: 'Motivos da reserva' })).toBeInTheDocument();

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(modelos).findByRole('table')).toBeInTheDocument();
    expect(await within(cores).findByRole('table')).toBeInTheDocument();
    expect(jornadaModelosService.resumo).toHaveBeenCalledTimes(2);
  });

  test('sem montagens no período: estado vazio literal em cada cartão', async () => {
    const r = fixtureModelos as ResumoDeModelos;
    const zerar = (l: ResumoDeModelos['modelos'][number]) => ({ ...l, ia: 0, pessoa: 0, reserva: 0, saiu: 0, entrou: 0, contratados: 0 });
    vi.mocked(jornadaModelosService.resumo).mockResolvedValue({ ...r, modelos: r.modelos.map(zerar), temas: r.temas.map(zerar) });
    renderizar();
    const modelos = await screen.findByRole('region', { name: 'Modelos' });
    const cores = await screen.findByRole('region', { name: 'Cores' });
    expect(await within(modelos).findByText('Ainda não há montagens neste período.')).toBeInTheDocument();
    expect(await within(cores).findByText('Ainda não há montagens neste período.')).toBeInTheDocument();
  });
});
