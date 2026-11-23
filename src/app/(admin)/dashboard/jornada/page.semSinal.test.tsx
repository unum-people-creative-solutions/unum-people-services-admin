import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import { ApiError } from '@/lib/apiError';
import type { FunilJornada, LinhaSemSinal, VisitaJornada } from '@/types/jornada';

// medicao-de-mercado M3 (RF-MM-37, T27): a caixa "Incluir visitas sem sinal humano", desmarcada por padrão,
// e a contagem do que ficou de fora.

const estado = vi.hoisted(() => ({ desde: null as string | null }));

// Com a data mockada dentro do período, a página pede as duas séries (antes e depois da entrada com IA).
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
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => '/dashboard/jornada') }));

const T = Date.UTC(2026, 10, 5, 23, 0, 0);
const DIA = 86_400_000;
// 05/11 à meia-noite de Brasília = 03:00 UTC: a janela de 24 h cruza a data.
const CORTE = Date.UTC(2026, 10, 5, 3, 0, 0);

const semSinalNaResposta: LinhaSemSinal[] = [
  { aparelho: 'celular', origem: 'google_ads', visitas: 12 },
  { aparelho: 'computador', origem: 'google_ads', visitas: 3 },
  { aparelho: 'celular', origem: 'direto', visitas: 5 },
];

const funilBase: FunilJornada = {
  etapas: [{ etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 10 }],
  uso: [],
  pagou: [],
  leitura: [],
};

const comSinal: VisitaJornada = {
  visitante: '5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6',
  visita: '0c4b5a8e-1f2a-4b3c-9d8e-7f6a5b4c3d2e',
  inicio: 1793915468000,
  fim: 1793915580000,
  aparelho: 'celular',
  origem: 'google_ads',
  paginas: 3,
  etapas: [1, 2],
  usos: [],
  teste: false,
};
const semSinal: VisitaJornada = {
  visitante: '7c2e9b4d-3e5f-4a7b-9c0d-1e2f3a4b5c6d',
  visita: '1d5c6b9f-2a3b-4c4d-8e9f-8a7b6c5d4e3f',
  inicio: 1793909520000,
  fim: 1793909520000,
  aparelho: 'celular',
  origem: 'google_ads',
  paginas: 1,
  etapas: [1],
  usos: [],
  teste: false,
  sem_sinal_humano: true,
};

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <JornadaPage />
    </QueryClientProvider>,
  );
}

const caixa = () => screen.getByRole('checkbox', { name: 'Incluir visitas sem sinal humano' });

// A API devolve a contagem só quando as sem sinal ficam de fora.
function respostaDaApi(semSinalHumano: LinhaSemSinal[] | undefined) {
  return async (_desde: unknown, _ate: unknown, opcoes?: { incluirSemSinal?: boolean }): Promise<FunilJornada> =>
    opcoes?.incluirSemSinal || semSinalHumano === undefined ? funilBase : { ...funilBase, sem_sinal_humano: semSinalHumano };
}

describe('Jornada: visitas sem sinal humano', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T23:00:00Z'));
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockImplementation(respostaDaApi(semSinalNaResposta) as typeof jornadaService.funil);
    vi.mocked(jornadaService.visitas).mockResolvedValue([comSinal, semSinal]);
  });
  afterEach(() => {
    vi.useRealTimers();
    estado.desde = null;
  });

  test('a caixa nasce desmarcada, no cartão do topo, e o funil é pedido sem incluir', async () => {
    renderizar();
    expect(caixa()).not.toBeChecked();
    expect(within(screen.getByTestId('topo-da-jornada')).getByRole('checkbox', { name: 'Incluir visitas sem sinal humano' })).toBe(caixa());
    await screen.findByRole('region', { name: /^Funil/ });
    expect(jornadaService.funil).toHaveBeenLastCalledWith(T - DIA, T);
  });

  test('desmarcada, mostra a contagem com os filtros: anúncio do Google (12 + 3), depois todas as origens (20), depois só celular', async () => {
    renderizar();
    expect(await screen.findByText('15 visitas sem sinal humano ficaram de fora')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'todas' } });
    expect(await screen.findByText('20 visitas sem sinal humano ficaram de fora')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Aparelho' }), { target: { value: 'celular' } });
    expect(await screen.findByText('17 visitas sem sinal humano ficaram de fora')).toBeInTheDocument();
  });

  test('uma visita: "1 visita sem sinal humano ficou de fora"', async () => {
    vi.mocked(jornadaService.funil).mockImplementation(
      respostaDaApi([{ aparelho: 'celular', origem: 'google_ads', visitas: 1 }]) as typeof jornadaService.funil,
    );
    renderizar();
    expect(await screen.findByText('1 visita sem sinal humano ficou de fora')).toBeInTheDocument();
  });

  test('nenhuma (chave ausente ou nada nos filtros): "Nenhuma visita sem sinal humano ficou de fora"', async () => {
    vi.mocked(jornadaService.funil).mockImplementation(respostaDaApi(undefined) as typeof jornadaService.funil);
    renderizar();
    expect(await screen.findByText('Nenhuma visita sem sinal humano ficou de fora')).toBeInTheDocument();
  });

  test('filtro sem nenhuma sem sinal: "Nenhuma", mesmo com a API contando outras', async () => {
    renderizar();
    await screen.findByText('15 visitas sem sinal humano ficaram de fora');
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'direto' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Aparelho' }), { target: { value: 'computador' } });
    expect(await screen.findByText('Nenhuma visita sem sinal humano ficou de fora')).toBeInTheDocument();
  });

  test('a tabela esconde a linha sem sinal enquanto a caixa está desmarcada', async () => {
    renderizar();
    const visitas = await screen.findByRole('region', { name: /^Visitas/ });
    expect(await within(visitas).findByRole('table')).toBeInTheDocument();
    expect(within(visitas).getAllByRole('row')).toHaveLength(2);
    expect(within(visitas).queryByText('Sem sinal humano')).toBeNull();
  });

  test('marcar refaz o funil com sem_sinal=incluir, tira a contagem e mostra a linha com o selo', async () => {
    renderizar();
    await screen.findByText('15 visitas sem sinal humano ficaram de fora');
    fireEvent.click(caixa());
    expect(caixa()).toBeChecked();
    await waitFor(() => expect(jornadaService.funil).toHaveBeenLastCalledWith(T - DIA, T, { incluirSemSinal: true }));
    await waitFor(() => expect(screen.queryByText(/sem sinal humano ficaram? de fora|Nenhuma visita sem sinal humano/)).toBeNull());
    const visitas = screen.getByRole('region', { name: /^Visitas/ });
    expect(within(visitas).getAllByRole('row')).toHaveLength(3);
    expect(within(visitas).getByText('Sem sinal humano')).toBeInTheDocument();
    // Estado assentado: a resposta nova do funil já chegou e foi desenhada. O waitFor acima passa também
    // enquanto a consulta carrega (texto vazio); aqui a contagem não pode existir com a caixa marcada (D9).
    await vi.mocked(jornadaService.funil).mock.results.at(-1)!.value;
    const funil = screen.getByRole('region', { name: /^Funil/ });
    expect(await within(funil).findByRole('list')).toBeInTheDocument();
    expect(screen.queryByText(/sem sinal humano ficaram? de fora/)).toBeNull();
    expect(screen.queryByText(/Nenhuma visita sem sinal humano/)).toBeNull();
  });

  test('desmarcar de novo volta a pedir sem incluir e a contagem volta', async () => {
    renderizar();
    await screen.findByText('15 visitas sem sinal humano ficaram de fora');
    fireEvent.click(caixa());
    await waitFor(() => expect(jornadaService.funil).toHaveBeenLastCalledWith(T - DIA, T, { incluirSemSinal: true }));
    fireEvent.click(caixa());
    expect(await screen.findByText('15 visitas sem sinal humano ficaram de fora')).toBeInTheDocument();
    expect(jornadaService.funil).toHaveBeenLastCalledWith(T - DIA, T);
  });

  test('erro de rede do funil: Tentar de novo continua e a contagem não aparece', async () => {
    vi.mocked(jornadaService.funil).mockRejectedValue(new ApiError('internal', 500));
    renderizar();
    const funil = await screen.findByRole('region', { name: /^Funil/ });
    expect(await within(funil).findByText('Não foi possível carregar.')).toBeInTheDocument();
    expect(within(funil).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    expect(screen.queryByText(/sem sinal humano ficaram? de fora|Nenhuma visita sem sinal humano/)).toBeNull();

    vi.mocked(jornadaService.funil).mockImplementation(respostaDaApi(semSinalNaResposta) as typeof jornadaService.funil);
    fireEvent.click(within(funil).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('15 visitas sem sinal humano ficaram de fora')).toBeInTheDocument();
  });

  describe('período que cruza DESDE_ENTRADA_COM_IA (duas séries)', () => {
    // Antes do corte: 12 + 3 no anúncio do Google (15); depois: 4. A soma, 19, não é a de nenhuma série sozinha.
    const antiga: LinhaSemSinal[] = [
      { aparelho: 'celular', origem: 'google_ads', visitas: 12 },
      { aparelho: 'computador', origem: 'google_ads', visitas: 3 },
    ];
    const nova: LinhaSemSinal[] = [{ aparelho: 'celular', origem: 'google_ads', visitas: 4 }];
    const porSerie = async (desde: unknown, _ate: unknown, opcoes?: { incluirSemSinal?: boolean }): Promise<FunilJornada> => {
      if (opcoes?.incluirSemSinal) return funilBase;
      return { ...funilBase, sem_sinal_humano: desde === CORTE ? nova : antiga };
    };

    test('a contagem soma as duas séries; marcar a caixa refaz as duas chamadas com incluirSemSinal e a contagem some', async () => {
      estado.desde = '2026-11-05';
      vi.mocked(jornadaService.funil).mockImplementation(porSerie as typeof jornadaService.funil);
      renderizar();
      expect(await screen.findByText('19 visitas sem sinal humano ficaram de fora')).toBeInTheDocument();
      expect(jornadaService.funil).toHaveBeenCalledTimes(2);
      expect(jornadaService.funil).toHaveBeenCalledWith(T - DIA, CORTE - 1);
      expect(jornadaService.funil).toHaveBeenCalledWith(CORTE, T);

      fireEvent.click(caixa());
      await waitFor(() => {
        expect(jornadaService.funil).toHaveBeenCalledWith(T - DIA, CORTE - 1, { incluirSemSinal: true });
        expect(jornadaService.funil).toHaveBeenCalledWith(CORTE, T, { incluirSemSinal: true });
      });
      // Estado assentado: as duas respostas novas chegaram.
      await Promise.all(vi.mocked(jornadaService.funil).mock.results.slice(2).map((r) => r.value));
      await waitFor(() => expect(screen.queryByText(/sem sinal humano ficaram? de fora/)).toBeNull());
      expect(screen.queryByText(/Nenhuma visita sem sinal humano/)).toBeNull();
    });
  });
});
