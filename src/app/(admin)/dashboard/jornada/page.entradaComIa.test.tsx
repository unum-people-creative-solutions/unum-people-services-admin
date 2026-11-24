import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import { ApiError } from '@/lib/apiError';
import type { FunilJornada, InstanteMs } from '@/types/jornada';
// Resposta do funil da A2 (configurador-com-ia spec §3.7, TASK-API-210), copiada sem edição.
import fixtureFunilA2 from '@/services/__fixtures__/funil-a2.json';

// configurador-com-ia TASK-ADM-304 (T31, CA-32; blueprint §9.1): a página chama o funil
// uma vez por série e, quando o período cruza a data, duas vezes.

const estado = vi.hoisted(() => ({ desde: null as string | null }));

vi.mock('@/lib/jornada', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/jornada')>();
  return {
    ...original,
    get DESDE_ENTRADA_COM_IA() {
      return estado.desde;
    },
  };
});
vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
// O cartão "Uso do Tools" (medicao-de-uso) tem teste próprio em page.usoDoTools.test.tsx; aqui fica sem resposta.
vi.mock('@/services/toolsUsoService', () => ({ toolsUsoService: { resumo: vi.fn(() => new Promise(() => {})) } }));
vi.mock('@/services/jornadaModelosService', () => ({ jornadaModelosService: { resumo: vi.fn(() => new Promise(() => {})) } }));
vi.mock('@/services/jornadaOpinioesService', () => ({ jornadaOpinioesService: { resumo: vi.fn(() => new Promise(() => {})) } }));
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => '/dashboard/jornada') }));

const FUNIL_A2 = fixtureFunilA2 as FunilJornada;
const FUNIL_ANTIGO: FunilJornada = {
  etapas: [
    { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 4 },
    { etapa: 4, aparelho: 'celular', origem: 'google_ads', visitas: 2 },
  ],
  uso: [{ evento: 'lp_menu_tema', aparelho: 'celular', origem: 'google_ads', visitas: 2 }],
  pagou: [],
  leitura: [],
};

// Relógio fixo: 2026-11-05T23:00:00Z (20:00 em Brasília).
const T = Date.UTC(2026, 10, 5, 23, 0, 0);
const DIA = 86_400_000;
// 05/11 à meia-noite de Brasília = 03:00 UTC: a janela de 24 h cruza a data.
const CORTE = Date.UTC(2026, 10, 5, 3, 0, 0);

// A série nova (a partir do corte) devolve a fixture da A2; a antiga, o funil antigo.
const porJanela: typeof jornadaService.funil = async (desde: InstanteMs | string) =>
  desde === CORTE ? FUNIL_A2 : FUNIL_ANTIGO;

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <JornadaPage />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'todas' } });
}

describe('Página Jornada: funil em duas séries (A2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(T));
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockImplementation(porJanela);
    vi.mocked(jornadaService.visitas).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    estado.desde = null;
  });

  test('com DESDE_ENTRADA_COM_IA null: uma chamada com a janela inteira e sem seletor', async () => {
    renderizar();
    const funil = await screen.findByRole('region', { name: 'Funil · 24 horas' });
    await within(funil).findByRole('list');
    expect(jornadaService.funil).toHaveBeenCalledTimes(1);
    expect(jornadaService.funil).toHaveBeenCalledWith(T - DIA, T);
    expect(within(funil).queryByRole('radiogroup')).toBeNull();
  });

  test('C-V34 — período que cruza a data: duas chamadas, uma de cada lado, a nota e a comparação', async () => {
    estado.desde = '2026-11-05';
    renderizar();
    const funil = await screen.findByRole('region', { name: 'Funil · 24 horas' });
    expect(await within(funil).findByRole('table', { name: /de cada 100 visitas/ })).toBeInTheDocument();
    expect(jornadaService.funil).toHaveBeenCalledTimes(2);
    expect(jornadaService.funil).toHaveBeenCalledWith(T - DIA, CORTE - 1);
    expect(jornadaService.funil).toHaveBeenCalledWith(CORTE, T);
    expect(
      within(funil).getByText('O período cruza a troca da entrada (05/11). Cada série mostra só as visitas do seu lado.'),
    ).toBeInTheDocument();
    expect(within(within(funil).getByRole('table')).getAllByRole('row')).toHaveLength(5);
  });

  test('C-V33 — a série nova vem marcada, com as oito etapas e as linhas extras', async () => {
    estado.desde = '2026-11-05';
    renderizar();
    const funil = await screen.findByRole('region', { name: 'Funil · 24 horas' });
    const grupo = within(funil).getByRole('radiogroup', { name: 'Série do funil' });
    expect(within(grupo).getByRole('radio', { name: /^Entrada com IA/ })).toHaveAttribute('aria-checked', 'true');
    const lista = await within(funil).findByRole('list');
    expect(within(lista).getAllByRole('listitem')).toHaveLength(8);
    expect(within(funil).getByText('pelo campo do topo: 1')).toBeInTheDocument();
    expect(within(funil).getByText('com IA: 1 · modelo reserva: 1 · tempo mediano: 14 s')).toBeInTheDocument();
  });

  test('o uso do editor soma as duas séries (sem nova chamada)', async () => {
    estado.desde = '2026-11-05';
    renderizar();
    const uso = await screen.findByRole('region', { name: 'Uso do editor' });
    const menu = await within(uso).findByRole('list', { name: 'Menu "Editar"' });
    const tema = within(menu).getAllByRole('listitem').find((li) => li.textContent?.startsWith('Editar tema'));
    expect(tema).toHaveTextContent('Editar tema2');
    expect(jornadaService.funil).toHaveBeenCalledTimes(2);
  });

  test('período todo depois da data: uma chamada, seletor sem nota nem comparação', async () => {
    estado.desde = '2026-10-01';
    renderizar();
    const funil = await screen.findByRole('region', { name: 'Funil · 24 horas' });
    await within(funil).findByRole('list');
    expect(jornadaService.funil).toHaveBeenCalledTimes(1);
    expect(jornadaService.funil).toHaveBeenCalledWith(T - DIA, T);
    expect(within(funil).getByRole('radiogroup', { name: 'Série do funil' })).toBeInTheDocument();
    expect(within(funil).queryByRole('table')).toBeNull();
    expect(within(funil).queryByText(/O período cruza/)).toBeNull();
  });

  test('erro de uma das duas chamadas aparece no cartão e Tentar de novo busca de novo', async () => {
    estado.desde = '2026-11-05';
    const novaFalha: typeof jornadaService.funil = async (desde: InstanteMs | string) => {
      if (desde === CORTE) throw new ApiError('internal', 500);
      return FUNIL_ANTIGO;
    };
    vi.mocked(jornadaService.funil).mockImplementation(novaFalha);
    renderizar();
    const funil = await screen.findByRole('region', { name: 'Funil · 24 horas' });
    expect(await within(funil).findByText('Não foi possível carregar.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Uso do editor' })).getByText('Não foi possível carregar.')).toBeInTheDocument();

    vi.mocked(jornadaService.funil).mockImplementation(porJanela);
    fireEvent.click(within(funil).getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(within(funil).getByRole('table')).toBeInTheDocument());
  });
});
