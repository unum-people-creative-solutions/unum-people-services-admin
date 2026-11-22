import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  'Abriu modal de entrada',
  'Enviou os dados',
  'Viu o site montado',
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

  it('com o corte num instante, as duas séries mostram dia e hora', () => {
    render(
      <FunilEmSeries
        idTitulo="titulo-funil-instante"
        titulo="Funil no instante"
        corte="2026-11-17T16:28:34-03:00"
        series={{ antiga: null, nova: FUNIL_A2 }}
        filtro={TODOS}
        carregando={false}
        erro={false}
        onTentar={() => {}}
        textoVazio="Nada"
      />,
    );
    const grupo = within(screen.getByRole('region', { name: 'Funil no instante' })).getByRole('radiogroup', { name: 'Série do funil' });
    expect(within(grupo).getByText('desde 17/11, 16h28')).toBeInTheDocument();
    expect(within(grupo).getByText('até 17/11, 16h28')).toBeInTheDocument();
  });

  it('T31 — a série nova mostra as oito etapas na ordem e as linhas extras', () => {
    const secao = renderizarSeries({ antiga: null, nova: FUNIL_A2 });
    expect(rotulosDasEtapas(secao)).toEqual(ROTULOS_NOVOS);
    const lista = within(secao).getByRole('list');
    const itens = within(lista).getAllByRole('listitem');
    expect(within(itens[1]).getByText('pelo campo do topo: 1')).toBeInTheDocument();
    expect(within(itens[3]).getByText('com IA: 1 · modelo reserva: 1 · tempo mediano: 14 s')).toBeInTheDocument();
    expect(within(secao).getAllByText(/pelo campo do topo|com IA:/)).toHaveLength(2);
  });

  // RF-JF-41: "Editou" e "Abriu a prévia" ao lado, como parcela de quem viu o site montado.
  it('CA-JF-41 — "Editou" e "Abriu a prévia" ficam ao lado de "Viu o site montado", fora da sequência', () => {
    const secao = renderizarSeries({ antiga: null, nova: FUNIL_A2 });
    const itens = within(within(secao).getByRole('list')).getAllByRole('listitem');
    expect(within(itens[3]).getByText('Editou: 1 (100% de quem viu)')).toBeInTheDocument();
    expect(within(itens[3]).getByText('Abriu a prévia: 1 (100% de quem viu)')).toBeInTheDocument();
    // Não são linhas da sequência.
    expect(itens).toHaveLength(8);
    expect(itens.some((li) => li.querySelector('span')?.firstChild?.textContent === 'Editou')).toBe(false);
  });

  it('a parcela ao lado usa os números de Editou (4) e Abriu a prévia (5) e a base "Viu o site montado" (12)', () => {
    const desigual: FunilJornada = {
      ...FUNIL_A2,
      etapas: FUNIL_A2.etapas.map((l) =>
        l.etapa === 12 ? { ...l, visitas: 10 } : l.etapa === 4 ? { ...l, visitas: 5 } : l.etapa === 5 ? { ...l, visitas: 2 } : l,
      ),
    };
    const secao = renderizarSeries({ antiga: null, nova: desigual });
    expect(within(secao).getByText('Editou: 5 (50% de quem viu)')).toBeInTheDocument();
    expect(within(secao).getByText('Abriu a prévia: 2 (20% de quem viu)')).toBeInTheDocument();
  });

  // L-04: 12 editaram e 10 viram o site montado (a etapa 12 é de visitas distintas, a 4 não depende dela):
  // a parcela passa de 100%, e o painel mostra 100%.
  it('a parcela "% de quem viu" tem teto de 100%: 12 editaram e 10 viram o site montado', () => {
    const maisEditaram: FunilJornada = {
      ...FUNIL_A2,
      etapas: FUNIL_A2.etapas.map((l) =>
        l.etapa === 12 ? { ...l, visitas: 10 } : l.etapa === 4 ? { ...l, visitas: 12 } : l.etapa === 5 ? { ...l, visitas: 11 } : l,
      ),
    };
    const secao = renderizarSeries({ antiga: null, nova: maisEditaram });
    expect(within(secao).getByText('Editou: 12 (100% de quem viu)')).toBeInTheDocument();
    expect(within(secao).getByText('Abriu a prévia: 11 (100% de quem viu)')).toBeInTheDocument();
    expect(within(secao).queryByText(/120%|110%/)).not.toBeInTheDocument();
  });

  it('sem ninguém que viu o site montado, a parcela mostra só a contagem, sem porcentagem', () => {
    const semVistos: FunilJornada = { ...FUNIL_A2, etapas: FUNIL_A2.etapas.filter((l) => l.etapa !== 12) };
    const secao = renderizarSeries({ antiga: null, nova: semVistos });
    expect(within(secao).getByText('Editou: 1')).toBeInTheDocument();
    expect(within(secao).getByText('Abriu a prévia: 1')).toBeInTheDocument();
  });

  it('"modelo pronto" entra na divisão do "Viu o site montado" só quando houve', () => {
    const comPronto: FunilJornada = {
      ...FUNIL_A2,
      uso: [...FUNIL_A2.uso, { evento: 'lp_site_montado_modelo_pronto', aparelho: 'celular', origem: 'google_ads', visitas: 2 }],
    };
    const secao = renderizarSeries({ antiga: null, nova: comPronto });
    expect(within(secao).getByText('com IA: 1 · modelo reserva: 1 · modelo pronto: 2 · tempo mediano: 14 s')).toBeInTheDocument();
  });

  // RF-JF-42 / CA-JF-42.
  it('CA-JF-42 — a nota da série nova, com o texto literal, só na série nova', () => {
    const NOTA = "Desde 19/11 a prévia abre sozinha depois da montagem; 'Abriu a prévia' conta só quem a abre por escolha.";
    const secao = renderizarSeries({ antiga: FUNIL_ANTIGO, nova: FUNIL_A2 });
    expect(within(secao).getByText(NOTA)).toBeInTheDocument();
    fireEvent.click(within(secao).getByRole('radio', { name: /^Escolha de modelo/ }));
    expect(within(secao).queryByText(NOTA)).toBeNull();
  });

  it('CA-JF-40 — "% da anterior" na sequência nova nunca passa de 100%', () => {
    // 5 viram o site montado, mas 8 abriram a contratação (lote recusado levou a etapa 12 de 3 visitas).
    const sobra: FunilJornada = {
      etapas: [
        { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 10 },
        { etapa: 10, aparelho: 'celular', origem: 'google_ads', visitas: 4 },
        { etapa: 11, aparelho: 'celular', origem: 'google_ads', visitas: 6 },
        { etapa: 12, aparelho: 'celular', origem: 'google_ads', visitas: 5 },
        { etapa: 6, aparelho: 'celular', origem: 'google_ads', visitas: 8 },
      ],
      uso: [],
      pagou: [],
      leitura: [],
    };
    render(
      <FunilEmSeries
        idTitulo="titulo-funil-teto"
        titulo="Funil do teto"
        corte={CORTE}
        series={{ antiga: null, nova: sobra }}
        filtro={TODOS}
        carregando={false}
        erro={false}
        onTentar={() => {}}
        textoVazio="Nada"
        comAnterior
      />,
    );
    const secao = screen.getByRole('region', { name: 'Funil do teto' });
    const percentuais = within(within(secao).getByRole('list'))
      .getAllByRole('listitem')
      .flatMap((li) => [...li.textContent!.matchAll(/(\d+)% da anterior/g)].map((m) => Number(m[1])));
    expect(percentuais.length).toBeGreaterThan(0);
    expect(Math.max(...percentuais)).toBeLessThanOrEqual(100);
    expect(within(secao).getAllByText(/100% da anterior/).length).toBeGreaterThan(0);
  });

  it('a linha extra de "Viu o site montado" põe cada contagem no seu lugar (IA 3, reserva 1)', () => {
    const desigual: FunilJornada = {
      ...FUNIL_A2,
      uso: FUNIL_A2.uso.map((l) =>
        l.evento === 'lp_site_montado_ia' ? { ...l, visitas: 3 } : l.evento === 'lp_site_montado_reserva' ? { ...l, visitas: 1 } : l,
      ),
    };
    const secao = renderizarSeries({ antiga: null, nova: desigual });
    expect(within(secao).getByText('com IA: 3 · modelo reserva: 1 · tempo mediano: 14 s')).toBeInTheDocument();
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

  it('T31 — período cruzando a data: a nota sob o título e a comparação com quatro etapas', () => {
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
    expect(linhas.map((l) => within(l).getAllByRole('cell').length + within(l).getAllByRole('rowheader').length)).toEqual([3, 3, 3, 3]);
    expect(linhas.map((l) => l.textContent)).toEqual([
      'Visitou100100',
      'Editou40100',
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

// jornada-trajetoria T13 (RF-JT-42): selo "maior queda" na etapa com a menor taxa sobre a anterior.
describe('selo "maior queda" (RF-JT-42)', () => {
  const NOVA_QUEDA = [64, 31, 22, 20, 6, 3, 2, 1];

  function funilDeNova(valores: number[]): FunilJornada {
    const etapas = [1, 10, 11, 12, 6, 7, 8];
    return {
      etapas: etapas.map((etapa, i) => ({ etapa, aparelho: 'celular', origem: 'google_ads', visitas: valores[i] })),
      uso: [],
      pagou: [{ aparelho: 'celular', origem: 'google_ads', visitas: valores[7] }],
      leitura: [],
    };
  }

  function renderizarNova(valores: number[], comAnterior: boolean) {
    render(
      <FunilEmSeries
        idTitulo="titulo-funil-queda"
        titulo="Funil da queda"
        corte={CORTE}
        series={{ antiga: null, nova: funilDeNova(valores) }}
        filtro={TODOS}
        carregando={false}
        erro={false}
        onTentar={() => {}}
        textoVazio="Nada"
        comAnterior={comAnterior}
      />,
    );
    return screen.getByRole('region', { name: 'Funil da queda' });
  }

  it('série nova [64, 31, 22, 20, 6, 3, 2, 1]: o selo só na linha "Abriu a contratação" (30%)', () => {
    const secao = renderizarNova(NOVA_QUEDA, true);
    expect(within(secao).getAllByText('maior queda')).toHaveLength(1);
    const alvo = linha(secao, 'Abriu a contratação');
    expect(within(alvo).getByText('maior queda')).toBeInTheDocument();
    expect(alvo).toHaveTextContent('30% da anterior');
  });

  it('série nova sem comAnterior: nunca mostra o selo', () => {
    const secao = renderizarNova(NOVA_QUEDA, false);
    expect(within(secao).queryByText('maior queda')).toBeNull();
  });

  it('série nova com tudo 0, ou com todas as taxas em 100%: sem selo', () => {
    const zerada = renderizarNova([0, 0, 0, 0, 0, 0, 0, 0], true);
    expect(within(zerada).queryByText('maior queda')).toBeNull();
    cleanup();
    const cheia = renderizarNova([5, 5, 5, 5, 5, 5, 5, 5], true);
    expect(within(cheia).queryByText('maior queda')).toBeNull();
  });

  it('série nova com empate: o selo na primeira', () => {
    const secao = renderizarNova([100, 50, 50, 25, 25, 25, 25, 25], true);
    expect(within(secao).getAllByText('maior queda')).toHaveLength(1);
    expect(within(linha(secao, 'Abriu modal de entrada')).getByText('maior queda')).toBeInTheDocument();
  });

  it('série antiga: o selo na linha de menor taxa ("Editou", 25%)', () => {
    const antiga: FunilJornada = {
      etapas: [10, 9, 8, 2, 2, 2, 1, 1].map((visitas, i) => ({
        etapa: i + 1,
        aparelho: 'celular' as const,
        origem: 'google_ads',
        visitas,
      })),
      uso: [],
      pagou: [{ aparelho: 'celular', origem: 'google_ads', visitas: 1 }],
      leitura: [],
    };
    render(
      <FunilEmSeries
        idTitulo="titulo-funil-antiga"
        titulo="Funil antigo"
        corte={CORTE}
        series={{ antiga, nova: null }}
        filtro={TODOS}
        carregando={false}
        erro={false}
        onTentar={() => {}}
        textoVazio="Nada"
        comAnterior
      />,
    );
    const secao = screen.getByRole('region', { name: 'Funil antigo' });
    expect(within(secao).getAllByText('maior queda')).toHaveLength(1);
    expect(within(linha(secao, 'Editou')).getByText('maior queda')).toBeInTheDocument();
  });

  it('FunilVitrine com comAnterior mostra o selo; sem comAnterior, nunca', () => {
    const { rerender } = render(
      <FunilVitrine
        idTitulo="titulo-funil"
        titulo="Funil"
        valores={[100, 60, 40, 30, 5, 3, 2, 1, 1]}
        carregando={false}
        erro={false}
        onTentar={() => {}}
        textoVazio="Nada"
        comAnterior
      />,
    );
    const secao = screen.getByRole('region', { name: 'Funil' });
    expect(within(linha(secao, 'Viu a página final')).getByText('maior queda')).toBeInTheDocument();
    expect(within(secao).getAllByText('maior queda')).toHaveLength(1);
    rerender(
      <FunilVitrine
        idTitulo="titulo-funil"
        titulo="Funil"
        valores={[100, 60, 40, 30, 5, 3, 2, 1, 1]}
        carregando={false}
        erro={false}
        onTentar={() => {}}
        textoVazio="Nada"
      />,
    );
    expect(within(screen.getByRole('region', { name: 'Funil' })).queryByText('maior queda')).toBeNull();
  });
});
