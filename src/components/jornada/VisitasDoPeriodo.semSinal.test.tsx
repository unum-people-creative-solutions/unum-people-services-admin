import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi } from 'vitest';
import { VisitasDoPeriodo } from './VisitasDoPeriodo';
import type { VisitaJornada } from '@/types/jornada';

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));

// medicao-de-mercado M3, RF-MM-38 (T29): a tabela esconde as linhas sem sinal humano com a caixa desmarcada e,
// marcada, mostra nelas o selo "Sem sinal humano".

const base: VisitaJornada = {
  visitante: '6f1c2a9e-3b7d-4c51-9a2e-8d4f0b6c1e27',
  visita: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  inicio: 1794745800000,
  fim: 1794745860000,
  aparelho: 'celular',
  origem: 'google_ads',
  paginas: 1,
  etapas: [1, 2],
  usos: [],
  teste: false,
};
const comSinal: VisitaJornada = { ...base };
const semSinal: VisitaJornada = {
  ...base,
  visitante: '5b6c7d8e-9f0a-4b1c-8d2e-3f4a5b6c7d8e',
  visita: '6c7d8e9f-0a1b-4c2d-9e3f-4a5b6c7d8e9f',
  inicio: 1794745000000,
  fim: 1794745000000,
  aparelho: 'computador',
  origem: 'direto',
  etapas: [1],
  sem_sinal_humano: true,
};

function renderizar(incluirSemSinal?: boolean, lista: VisitaJornada[] = [comSinal, semSinal]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <VisitasDoPeriodo
        titulo="Visitas"
        textoVazio="Nada"
        comData={false}
        visitas={lista}
        carregando={false}
        erro={false}
        onTentar={() => {}}
        mostrarTeste={false}
        onMostrarTeste={() => {}}
        incluirSemSinal={incluirSemSinal}
      />
    </QueryClientProvider>,
  );
}

function linhasDeDados() {
  return screen.getAllByRole('row').slice(1);
}

describe('VisitasDoPeriodo e as visitas sem sinal humano', () => {
  test('com a caixa desmarcada, a linha sem sinal não aparece e o selo não existe', () => {
    renderizar(false);
    expect(linhasDeDados()).toHaveLength(1);
    expect(within(linhasDeDados()[0]).getByText('Celular')).toBeInTheDocument();
    expect(screen.queryByText('Sem sinal humano')).toBeNull();
  });

  test('sem a propriedade, vale desmarcada', () => {
    renderizar(undefined);
    expect(linhasDeDados()).toHaveLength(1);
  });

  test('com a caixa marcada, as duas linhas aparecem e só a sem sinal ganha o selo', () => {
    renderizar(true);
    const linhas = linhasDeDados();
    expect(linhas).toHaveLength(2);
    expect(screen.getAllByText('Sem sinal humano')).toHaveLength(1);
    const daSemSinal = linhas.find((l) => within(l).queryByText('Computador') !== null)!;
    expect(within(daSemSinal).getByText('Sem sinal humano')).toBeInTheDocument();
    const daComSinal = linhas.find((l) => within(l).queryByText('Celular') !== null)!;
    expect(within(daComSinal).queryByText('Sem sinal humano')).toBeNull();
  });

  test('só linhas sem sinal e a caixa desmarcada: mostra o texto de vazio', () => {
    renderizar(false, [semSinal]);
    expect(screen.getByText('Nada')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
