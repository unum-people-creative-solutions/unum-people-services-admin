import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FunilJornada } from '@/types/jornada';
import { FunilEmSeries, FunilVitrine } from './FunilVitrine';
// Resposta do funil da A2 (configurador-com-ia spec §3.7, TASK-API-210), copiada sem edição.
import fixtureFunilA2 from '@/services/__fixtures__/funil-a2.json';

// medicao-e-robustez MR-25 (T26): a nota da série fica junto do rótulo da etapa 6.
const estado = vi.hoisted(() => ({ desde: null as string | null }));

vi.mock('@/lib/jornada', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/jornada')>();
  return {
    ...original,
    get DESDE_CHEGADA_NA_CONTRATACAO() {
      return estado.desde;
    },
  };
});

const VALORES = [100, 60, 40, 30, 20, 10, 5, 3, 1];

function renderizar() {
  render(
    <FunilVitrine
      idTitulo="titulo-funil"
      titulo="Funil"
      valores={VALORES}
      carregando={false}
      erro={false}
      onTentar={() => {}}
      textoVazio="Nada"
    />,
  );
  return screen.getByRole('region', { name: 'Funil' });
}

function linha(secao: HTMLElement, rotulo: string) {
  const item = within(secao)
    .getAllByRole('listitem')
    .find((li) => within(li).queryByText(rotulo) !== null);
  if (!item) throw new Error(`sem a linha ${rotulo}`);
  return item;
}

describe('FunilVitrine: nota da série de "Abriu a contratação" (MR-25)', () => {
  afterEach(() => {
    estado.desde = null;
  });

  it('com a data, a nota aparece na linha "Abriu a contratação" e em nenhuma outra', () => {
    estado.desde = '2026-11-20';
    const secao = renderizar();
    expect(within(linha(secao, 'Abriu a contratação')).getByText('conta a chegada na tela desde 20/11')).toBeInTheDocument();
    expect(within(secao).getAllByText('conta a chegada na tela desde 20/11')).toHaveLength(1);
  });

  it('com null, a nota não aparece', () => {
    const secao = renderizar();
    expect(within(secao).queryByText(/conta a chegada na tela/)).toBeNull();
    expect(linha(secao, 'Abriu a contratação')).toBeInTheDocument();
  });
});

// configurador-com-ia TASK-ADM-304 (T31, CA-32; blueprint §9.1 com D-C-01 e D-C-28).
const FUNIL_A2 = fixtureFunilA2 as FunilJornada;
const TODOS = { origem: 'todas', aparelho: 'todos' } as const;
const CORTE = '2026-11-20';

// Série antiga: 10 visitas, 4 editaram, 3 viram a página final, 2 abriram a contratação, 1 pagou.
const FUNIL_ANTIGO: FunilJornada = {
  etapas: [
    { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 10 },
    { etapa: 2, aparelho: 'celular', origem: 'google_ads', visitas: 8 },
    { etapa: 3, aparelho: 'celular', origem: 'google_ads', visitas: 6 },
    { etapa: 4, aparelho: 'celular', origem: 'google_ads', visitas: 4 },
    { etapa: 5, aparelho: 'celular', origem: 'google_ads', visitas: 3 },
    { etapa: 6, aparelho: 'celular', origem: 'google_ads', visitas: 2 },
  ],
  uso: [],
  pagou: [{ aparelho: 'celular', origem: 'google_ads', visitas: 1 }],
  leitura: [],
};

const ROTULOS_NOVOS = [
  'Visitou',
  'Começou',
  'Enviou os dados',
  'Viu o site montado',
  'Editou',
  'Viu a página final',
  'Abriu a contratação',
  'Enviou a contratação',
  'Contratou',
  'Pagou',
];

function renderizarSeries(
  series: { antiga: FunilJornada | null; nova: FunilJornada | null } | undefined,
  extra: { carregando?: boolean; erro?: boolean; onTentar?: () => void } = {},
) {
  render(
    <FunilEmSeries
      idTitulo="titulo-funil-series"
      titulo="Funil"
      corte={CORTE}
      series={series}
      filtro={TODOS}
      carregando={extra.carregando ?? false}
      erro={extra.erro ?? false}
      onTentar={extra.onTentar ?? (() => {})}
      textoVazio="Nada"
    />,
  );
  return screen.getByRole('region', { name: 'Funil' });
}

function rotulosDasEtapas(secao: HTMLElement) {
  return within(within(secao).getByRole('list')).getAllByRole('listitem').map(
    (li) => li.querySelector('span')?.firstChild?.textContent,
  );
}

describe('FunilEmSeries: duas séries, sem misturar (A2)', () => {
  it('T31 — seletor com as duas séries; a nova (com visitas) vem marcada', () => {
    const secao = renderizarSeries({ antiga: null, nova: FUNIL_A2 });
    const grupo = within(secao).getByRole('radiogroup', { name: 'Série do funil' });
    const radios = within(grupo).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(within(grupo).getByRole('radio', { name: /^Entrada com IA/ })).toHaveAttribute('aria-checked', 'true');
    expect(within(grupo).getByRole('radio', { name: /^Escolha de modelo/ })).toHaveAttribute('aria-checked', 'false');
    expect(within(grupo).getByText('desde 20/11')).toBeInTheDocument();
    expect(within(grupo).getByText('até 20/11')).toBeInTheDocument();
  });

  it('T31 — a série nova mostra as dez etapas na ordem e as duas linhas extras', () => {
    const secao = renderizarSeries({ antiga: null, nova: FUNIL_A2 });
    expect(rotulosDasEtapas(secao)).toEqual(ROTULOS_NOVOS);
    const lista = within(secao).getByRole('list');
    const itens = within(lista).getAllByRole('listitem');
    expect(within(itens[1]).getByText('pelo campo do topo: 1')).toBeInTheDocument();
    expect(within(itens[3]).getByText('com IA: 1 · modelo reserva: 1 · tempo mediano: 14 s')).toBeInTheDocument();
    expect(within(secao).getAllByText(/pelo campo do topo|com IA:/)).toHaveLength(2);
  });

  it('sem faixas de tempo, a parte "· tempo mediano" some (D-C-28)', () => {
    const semFaixas: FunilJornada = {
      ...FUNIL_A2,
      uso: FUNIL_A2.uso.filter((l) => !l.evento.startsWith('lp_site_montado_s_')),
    };
    const secao = renderizarSeries({ antiga: null, nova: semFaixas });
    expect(within(secao).getByText('com IA: 1 · modelo reserva: 1')).toBeInTheDocument();
    expect(within(secao).queryByText(/tempo mediano/)).toBeNull();
  });

  it('período só de um lado: sem a nota e sem a comparação', () => {
    const secao = renderizarSeries({ antiga: null, nova: FUNIL_A2 });
    expect(within(secao).queryByText(/O período cruza a troca da entrada/)).toBeNull();
    expect(within(secao).queryByRole('table')).toBeNull();
  });

  it('T31 — período cruzando a data: a nota sob o título e a comparação com cinco etapas', () => {
    const secao = renderizarSeries({ antiga: FUNIL_ANTIGO, nova: FUNIL_A2 });
    expect(
      within(secao).getByText('O período cruza a troca da entrada (20/11). Cada série mostra só as visitas do seu lado.'),
    ).toBeInTheDocument();
    const tabela = within(secao).getByRole('table', { name: /de cada 100 visitas/ });
    expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Etapa',
      'Escolha de modelo',
      'Entrada com IA',
    ]);
    const linhas = within(tabela).getAllByRole('row').slice(1);
    expect(linhas.map((l) => within(l).getAllByRole('cell').length + within(l).getAllByRole('rowheader').length)).toEqual([3, 3, 3, 3, 3]);
    expect(linhas.map((l) => l.textContent)).toEqual([
      'Visitou100100',
      'Editou40100',
      'Viu a página final30100',
      'Abriu a contratação20100',
      'Pagou10100',
    ]);
  });

  it('trocar para "Escolha de modelo" mostra as nove etapas de hoje, sem as linhas extras', () => {
    const secao = renderizarSeries({ antiga: FUNIL_ANTIGO, nova: FUNIL_A2 });
    fireEvent.click(within(secao).getByRole('radio', { name: /^Escolha de modelo/ }));
    expect(within(secao).getByRole('radio', { name: /^Escolha de modelo/ })).toHaveAttribute('aria-checked', 'true');
    expect(rotulosDasEtapas(secao)).toEqual([
      'Visitou',
      'Abriu o configurador',
      'Escolheu modelo e tema',
      'Editou',
      'Viu a página final',
      'Abriu a contratação',
      'Enviou a contratação',
      'Contratou',
      'Pagou',
    ]);
    expect(within(secao).queryByText(/pelo campo do topo/)).toBeNull();
    // A comparação continua: o período segue cruzando a data.
    expect(within(secao).getByRole('table')).toBeInTheDocument();
  });

  it('as setas do teclado trocam a série (padrão do radiogroup)', () => {
    const secao = renderizarSeries({ antiga: FUNIL_ANTIGO, nova: FUNIL_A2 });
    const nova = within(secao).getByRole('radio', { name: /^Entrada com IA/ });
    expect(nova).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(nova, { key: 'ArrowRight' });
    const antiga = within(secao).getByRole('radio', { name: /^Escolha de modelo/ });
    expect(antiga).toHaveAttribute('aria-checked', 'true');
    expect(antiga).toHaveFocus();
  });

  it('padrão: a série que tem visitas; só a antiga com visitas → "Escolha de modelo"', () => {
    const vazio: FunilJornada = { etapas: [], uso: [], pagou: [], leitura: [] };
    const secao = renderizarSeries({ antiga: FUNIL_ANTIGO, nova: vazio });
    expect(within(secao).getByRole('radio', { name: /^Escolha de modelo/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('erro de uma das chamadas: o estado de erro de hoje, com Tentar de novo', () => {
    const onTentar = vi.fn();
    const secao = renderizarSeries(undefined, { erro: true, onTentar });
    expect(within(secao).getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentar).toHaveBeenCalledTimes(1);
  });

  it('carregando: aria-busy, sem lista', () => {
    const secao = renderizarSeries(undefined, { carregando: true });
    expect(secao).toHaveAttribute('aria-busy', 'true');
    expect(within(secao).queryByRole('list')).toBeNull();
  });
});
