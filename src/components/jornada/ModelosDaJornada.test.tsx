import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MontagensDoModelo, ResumoDeModelos } from '@/types/jornadaModelos';
import { ModelosDaJornada } from './ModelosDaJornada';
// Resposta real de GET /admin/dashboard/jornada/modelos (api), copiada sem edição (L-071).
import fixtureModelos from '@/services/__fixtures__/jornada-modelos-resposta.json';

// opiniao-e-modelos RF-OM-08, RF-OM-09 e CA-OM-03.

afterEach(cleanup);

const resumo = fixtureModelos as ResumoDeModelos;

const COLUNAS_ESPERADAS = (primeira: string) => [
  primeira, 'Montados pela IA', 'Escolhidos pela pessoa', 'Reserva', 'Trocaram por outro', 'Vieram de outro', 'Contratados',
];

function renderizar(
  extra: {
    titulo?: string;
    colunaRotulo?: string;
    linhas?: MontagensDoModelo[] | undefined;
    carregando?: boolean;
    erro?: boolean;
    onTentar?: () => void;
  } = {},
) {
  const titulo = extra.titulo ?? 'Modelos';
  render(
    <ModelosDaJornada
      titulo={titulo}
      colunaRotulo={extra.colunaRotulo ?? 'Modelo'}
      linhas={'linhas' in extra ? extra.linhas : resumo.modelos}
      carregando={extra.carregando ?? false}
      erro={extra.erro ?? false}
      onTentar={extra.onTentar ?? (() => {})}
    />,
  );
  return screen.getByRole('region', { name: titulo });
}

function celulas(linha: HTMLElement) {
  return within(linha).getAllByRole('cell').map((c) => c.textContent);
}

const zerar = (l: MontagensDoModelo): MontagensDoModelo => ({
  ...l, ia: 0, pessoa: 0, reserva: 0, saiu: 0, entrou: 0, contratados: 0,
});

describe('ModelosDaJornada', () => {
  it('cartão "Modelos": colunas literais da spec', () => {
    const secao = renderizar();
    const tabela = within(secao).getByRole('table');
    expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(COLUNAS_ESPERADAS('Modelo'));
  });

  it('cartão "Cores": a primeira coluna se chama "Cores"', () => {
    const secao = renderizar({ titulo: 'Cores', colunaRotulo: 'Cores', linhas: resumo.temas });
    const tabela = within(secao).getByRole('table');
    expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(COLUNAS_ESPERADAS('Cores'));
  });

  it('T01: no máximo 5 linhas, do maior movimento para o menor (soma das 6 colunas)', () => {
    // Cópia da resposta real com contagens trocadas: 7 linhas com movimento, fora da ordem de movimento.
    const contagens = [1, 9, 4, 7, 2, 5, 3];
    const linhas = resumo.modelos.map((l, i) =>
      i < contagens.length ? { ...zerar(l), ia: contagens[i] } : zerar(l),
    );
    const secao = renderizar({ linhas });
    const exibidas = within(within(secao).getByRole('table')).getAllByRole('row').slice(1);
    expect(exibidas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual([
      linhas[1].rotulo, // 9
      linhas[3].rotulo, // 7
      linhas[5].rotulo, // 5
      linhas[2].rotulo, // 4
      linhas[6].rotulo, // 3
    ]);
  });

  it('T01: a soma usa as 6 colunas (a linha de uma coluna só ganha da linha com várias menores)', () => {
    const [a, b, c] = resumo.modelos;
    const linhas = [{ ...zerar(a), ia: 1, pessoa: 1, reserva: 1 }, { ...zerar(b), contratados: 4 }, zerar(c)];
    const secao = renderizar({ linhas });
    const exibidas = within(within(secao).getByRole('table')).getAllByRole('row').slice(1);
    expect(exibidas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual([b.rotulo, a.rotulo]);
  });

  it('T01: com a resposta real, "Modelos" mostra só as linhas com movimento, na ordem do movimento', () => {
    const secao = renderizar();
    const exibidas = within(within(secao).getByRole('table')).getAllByRole('row').slice(1);
    expect(exibidas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual(['Refúgio', 'Átrio', 'Bancada']);
    expect(within(secao).queryByRole('row', { name: /^Praça/ })).toBeNull();
  });

  it('T01: com a resposta real, "Cores" mostra só os 3 temas com movimento, do maior para o menor', () => {
    const secao = renderizar({ titulo: 'Cores', colunaRotulo: 'Cores', linhas: resumo.temas });
    const exibidas = within(within(secao).getByRole('table')).getAllByRole('row').slice(1);
    expect(exibidas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual([
      'Verde claro', 'Azul acinzentado claro', 'Azul acinzentado alto contraste',
    ]);
  });

  it('T02: empate de movimento segue a ordem da resposta', () => {
    const [a, b, c, d] = resumo.modelos;
    const linhas = [{ ...zerar(a), ia: 2 }, { ...zerar(b), pessoa: 5 }, { ...zerar(c), saiu: 2 }, { ...zerar(d), entrou: 5 }];
    const secao = renderizar({ linhas });
    const exibidas = within(within(secao).getByRole('table')).getAllByRole('row').slice(1);
    expect(exibidas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual([
      b.rotulo, d.rotulo, a.rotulo, c.rotulo,
    ]);
  });

  it('T03: movimento 0 não aparece; uma única coluna diferente de 0 já é movimento', () => {
    const [a, b, c, d] = resumo.modelos;
    const linhas = [zerar(a), { ...zerar(b), entrou: 1 }, zerar(c), { ...zerar(d), ia: 3 }];
    const secao = renderizar({ linhas });
    const exibidas = within(within(secao).getByRole('table')).getAllByRole('row').slice(1);
    expect(exibidas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual([d.rotulo, b.rotulo]);
    expect(within(secao).queryByText(a.rotulo)).toBeNull();
    expect(within(secao).queryByText(c.rotulo)).toBeNull();
  });

  it('nunca mostra o id no lugar do rótulo', () => {
    const secao = renderizar();
    expect(within(secao).queryByText('l11')).toBeNull();
    expect(within(secao).queryByText('l1')).toBeNull();
  });

  it('cada linha traz os números da resposta real, cada um na sua coluna (saiu = Trocaram, entrou = Vieram)', () => {
    const secao = renderizar();
    const linha = (nome: string) => within(secao).getByRole('row', { name: new RegExp(`^${nome}`) });
    // ordem das colunas: ia, pessoa, reserva, saiu, entrou, contratados
    expect(celulas(linha('Refúgio'))).toEqual(['6', '0', '0', '3', '1', '3']);
    expect(celulas(linha('Átrio'))).toEqual(['0', '4', '0', '1', '2', '1']);
    expect(celulas(linha('Bancada'))).toEqual(['0', '0', '1', '0', '1', '0']);
  });

  it('cartão "Cores" mostra os números dos temas', () => {
    const secao = renderizar({ titulo: 'Cores', colunaRotulo: 'Cores', linhas: resumo.temas });
    const linha = (nome: string) => within(secao).getByRole('row', { name: new RegExp(`^${nome}`) });
    expect(celulas(linha('Azul acinzentado claro'))).toEqual(['0', '4', '0', '0', '2', '1']);
    expect(celulas(linha('Verde claro'))).toEqual(['5', '0', '0', '2', '0', '3']);
    expect(celulas(linha('Azul acinzentado alto contraste'))).toEqual(['0', '0', '1', '0', '0', '0']);
  });

  it('a tabela fica numa área rolável dentro do cartão (celular)', () => {
    const secao = renderizar();
    const area = within(secao).getByRole('region', { name: 'Tabela de Modelos' });
    expect(area).toContainElement(within(secao).getByRole('table'));
    expect(area).toHaveAttribute('tabindex', '0');
    expect(area).toHaveStyle({ overflowX: 'auto' });
  });

  it('T04: com dados, o texto literal fica abaixo da tabela, fora da área rolável', () => {
    const secao = renderizar();
    const texto = within(secao).getByText('Os 5 com mais movimento no período.');
    const area = within(secao).getByRole('region', { name: 'Tabela de Modelos' });
    const tabela = within(secao).getByRole('table');
    expect(area).not.toContainElement(texto);
    expect(tabela.compareDocumentPosition(texto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('T04: no estado vazio, no carregando e no erro o texto não aparece', () => {
    const textoLiteral = 'Os 5 com mais movimento no período.';
    let secao = renderizar({ linhas: resumo.modelos.map(zerar) });
    expect(within(secao).queryByText(textoLiteral)).toBeNull();
    cleanup();
    secao = renderizar({ linhas: undefined, carregando: true });
    expect(within(secao).queryByText(textoLiteral)).toBeNull();
    cleanup();
    secao = renderizar({ linhas: undefined, erro: true });
    expect(within(secao).queryByText(textoLiteral)).toBeNull();
  });

  it('estado vazio literal quando todas as contagens são zero, sem tabela', () => {
    const secao = renderizar({ linhas: resumo.modelos.map(zerar) });
    expect(within(secao).getByText('Ainda não há montagens neste período.')).toBeInTheDocument();
    expect(within(secao).queryByRole('table')).toBeNull();
  });

  it('uma única contagem maior que zero em qualquer coluna já tira o estado vazio', () => {
    for (const campo of ['ia', 'pessoa', 'reserva', 'saiu', 'entrou', 'contratados'] as const) {
      cleanup();
      const linhas = resumo.modelos.map(zerar);
      linhas[linhas.length - 1] = { ...linhas[linhas.length - 1], [campo]: 1 };
      const secao = renderizar({ linhas });
      expect(within(secao).queryByText('Ainda não há montagens neste período.')).toBeNull();
      expect(within(secao).getByRole('table')).toBeInTheDocument();
    }
  });

  it('com dados não mostra o estado vazio', () => {
    const secao = renderizar();
    expect(within(secao).queryByText('Ainda não há montagens neste período.')).toBeNull();
  });

  it('carregando: esqueleto, sem tabela, sem erro', () => {
    const secao = renderizar({ linhas: undefined, carregando: true });
    expect(secao).toHaveAttribute('aria-busy', 'true');
    expect(within(secao).queryByRole('table')).toBeNull();
    expect(within(secao).queryByRole('alert')).toBeNull();
  });

  it('erro: alerta visível com "Tentar de novo", que chama onTentar', () => {
    const onTentar = vi.fn();
    const secao = renderizar({ linhas: undefined, erro: true, onTentar });
    const alerta = within(secao).getByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar.');
    expect(within(secao).queryByRole('table')).toBeNull();
    expect(within(secao).queryByText('Ainda não há montagens neste período.')).toBeNull();
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentar).toHaveBeenCalledTimes(1);
  });

  it('sem dados e sem erro (nem carregando) cai no erro, nunca em tabela vazia', () => {
    const secao = renderizar({ linhas: undefined });
    expect(within(secao).getByRole('alert')).toBeInTheDocument();
  });
});
