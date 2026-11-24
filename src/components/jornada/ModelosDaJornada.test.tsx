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

  it('linhas com o rótulo da resposta, na ordem da resposta, todas do catálogo (zeros incluídos)', () => {
    const secao = renderizar();
    const linhas = within(within(secao).getByRole('table')).getAllByRole('row').slice(1);
    expect(linhas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual(resumo.modelos.map((m) => m.rotulo));
    expect(linhas.map((l) => within(l).getByRole('rowheader').textContent).slice(0, 4)).toEqual([
      'Refúgio', 'Átrio', 'Praça', 'Bancada',
    ]);
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
    expect(celulas(linha('Praça'))).toEqual(['0', '0', '0', '0', '0', '0']);
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
