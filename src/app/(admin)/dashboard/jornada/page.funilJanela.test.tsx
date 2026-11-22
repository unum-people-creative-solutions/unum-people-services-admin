import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import type { FunilJornada, InstanteMs, VisitaJornada } from '@/types/jornada';
// JSON real da rota do funil por janela (api, FunilDaJanela, D-C-45), copiado sem edição (L-071).
import fixtureFunilJanela from '@/services/__fixtures__/funil-a2-janela.json';

// configurador-com-ia D-C-45 (lacuna 1 de validation-admin.md): a página lê o funil por janela
// (?desde=/?ate=) com a série nova, pela jornadaService de verdade e só o fetch trocado.

const estado = vi.hoisted(() => ({ desde: null as string | null }));

vi.mock('@/lib/cognito', () => ({ userPool: {} }));
vi.mock('@/lib/jornada', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/jornada')>();
  return {
    ...original,
    get DESDE_ENTRADA_COM_IA() {
      return estado.desde;
    },
  };
});
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => '/dashboard/jornada') }));

const JANELA = fixtureFunilJanela as FunilJornada;
// Relógio fixo: 2026-11-05T23:00:00Z; com o corte em 2026-10-01 o período todo é da série nova.
const T = Date.UTC(2026, 10, 5, 23, 0, 0);
const DIA = 86_400_000;

// Uma visita que passou pelas etapas 1 e 10 a 12 da fixture (os números vêm dela, não de uma lista à mão).
const ETAPAS_DA_VISITA = JANELA.etapas.map((l) => l.etapa).filter((n) => n === 1 || n >= 10);
const VISITA: VisitaJornada = {
  visitante: '6f1c2a9e-3b7d-4c51-9a2e-8d4f0b6c1e27',
  visita: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  inicio: T - 60_000,
  fim: T - 30_000,
  aparelho: 'celular',
  origem: 'google_ads',
  paginas: 1,
  etapas: ETAPAS_DA_VISITA,
  usos: ['lp_topo_comecou', 'lp_site_montado_ia'],
  teste: false,
};

function respostaReal(corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function valorDa(lista: HTMLElement, rotulo: string): string {
  const item = within(lista)
    .getAllByRole('listitem')
    .find((li) => li.querySelector('span')?.firstChild?.textContent === rotulo);
  if (!item) throw new Error(`sem a etapa ${rotulo}`);
  return item.querySelector('span.tabular-nums.font-semibold')?.textContent ?? '';
}

describe('Página Jornada: funil por janela com a fixture real da série nova (D-C-45)', () => {
  let urls: string[];

  beforeEach(() => {
    urls = [];
    estado.desde = '2026-10-01';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(T));
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entrada) => {
      const url = String(entrada);
      urls.push(url);
      if (url.includes('/jornada/funil?')) return respostaReal(JANELA);
      if (url.includes('/jornada/visitas?')) return respostaReal([VISITA]);
      throw new Error(`rota inesperada: ${url}`);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    estado.desde = null;
  });

  function renderizar() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <JornadaPage />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'todas' } });
  }

  test('pede a janela por ?desde=&ate= e mostra a série nova com Abriu modal de entrada, Enviou os dados e Viu o site montado', async () => {
    renderizar();
    const funil = await screen.findByRole('region', { name: 'Funil · 24 horas' });
    const lista = await within(funil).findByRole('list');
    expect(urls.filter((u) => u.includes('/jornada/funil?'))).toEqual([
      expect.stringContaining(`/admin/dashboard/jornada/funil?desde=${(T - DIA) as InstanteMs}&ate=${T as InstanteMs}`),
    ]);
    expect(within(funil).getByRole('radio', { name: /^Entrada com IA/ })).toHaveAttribute('aria-checked', 'true');
    // Visitou 2, etapas 10 a 12 com 2; as etapas 6 a 8 (Abriu a contratação a Contratou) e Pagou com 1 cada (a 2, a 3, a 4, a 5 e a 9 não são linhas da série).
    const valores = ['Visitou', 'Abriu modal de entrada', 'Enviou os dados', 'Viu o site montado',
      'Abriu a contratação', 'Enviou a contratação', 'Contratou', 'Pagou'].map((r) => valorDa(lista, r));
    expect(valores).toEqual(['2', '2', '2', '2', '1', '1', '1', '1']);
  });

  test('a divisão "com IA / modelo reserva", o campo do topo e o tempo mediano saem dos usos da fixture', async () => {
    renderizar();
    const funil = await screen.findByRole('region', { name: 'Funil · 24 horas' });
    await within(funil).findByRole('list');
    expect(within(funil).getByText('pelo campo do topo: 1')).toBeInTheDocument();
    expect(within(funil).getByText('com IA: 1 · modelo reserva: 1 · tempo mediano: 14 s')).toBeInTheDocument();
  });

  test('"Até onde foi" recebe as etapas 10 a 12 e mostra "Viu o site montado"', async () => {
    renderizar();
    expect(ETAPAS_DA_VISITA).toEqual([1, 10, 11, 12]);
    const visitas = await screen.findByRole('region', { name: /^Visitas/ });
    const linha = (await within(visitas).findAllByRole('row'))[1];
    expect(within(linha).getByText('Viu o site montado')).toBeInTheDocument();
  });
});
