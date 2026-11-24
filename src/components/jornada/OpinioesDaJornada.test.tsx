import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResumoDeOpinioes } from '@/types/jornadaOpinioes';
import { OpinioesDaJornada } from './OpinioesDaJornada';
// Resposta real de GET /admin/dashboard/jornada/opinioes (api), copiada sem edição (L-071).
import fixtureOpinioes from '@/services/__fixtures__/jornada-opinioes-resposta.json';

// opiniao-e-modelos RF-OM-19 e CA-OM-06.

afterEach(cleanup);

const resumo = fixtureOpinioes as ResumoDeOpinioes;

function renderizar(
  extra: {
    dados?: ResumoDeOpinioes | undefined;
    rotulosDeModelo?: Record<string, string>;
    carregando?: boolean;
    erro?: boolean;
    onTentar?: () => void;
  } = {},
) {
  render(
    <OpinioesDaJornada
      dados={'dados' in extra ? extra.dados : resumo}
      rotulosDeModelo={extra.rotulosDeModelo}
      carregando={extra.carregando ?? false}
      erro={extra.erro ?? false}
      onTentar={extra.onTentar ?? (() => {})}
    />,
  );
  return screen.getByRole('region', { name: 'Opiniões' });
}

const itens = (secao: HTMLElement) => within(within(secao).getByRole('list', { name: 'Opiniões do período' })).getAllByRole('listitem');

describe('OpinioesDaJornada', () => {
  it('média com uma casa e vírgula, calculada de por_nota (contrato: 11/3 = 3,67 vira "3,7")', () => {
    const secao = renderizar();
    expect(within(secao).getByText('Média: 3,7 de 5')).toBeInTheDocument();
  });

  it('arredonda uma vez só: 849/200 = 4,245 vira "4,2" (media 4.25 do JSON arredondaria para "4,3")', () => {
    const dados: ResumoDeOpinioes = {
      ...resumo,
      media: 4.25,
      total: 200,
      por_nota: { '1': 0, '2': 0, '3': 0, '4': 151, '5': 49 },
    };
    expect(within(renderizar({ dados })).getByText('Média: 4,2 de 5')).toBeInTheDocument();
  });

  it('média inteira ("5") vira "5,0" e a que já tem uma casa (4,2) fica "4,2"', () => {
    const todasCinco: ResumoDeOpinioes = { ...resumo, media: 5, total: 3, por_nota: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 3 } };
    expect(within(renderizar({ dados: todasCinco })).getByText('Média: 5,0 de 5')).toBeInTheDocument();
    cleanup();
    const quatroVirgulaDois: ResumoDeOpinioes = { ...resumo, media: 4.2, total: 5, por_nota: { '1': 0, '2': 0, '3': 0, '4': 4, '5': 1 } };
    expect(within(renderizar({ dados: quatroVirgulaDois })).getByText('Média: 4,2 de 5')).toBeInTheDocument();
  });

  it('total no plural e no singular', () => {
    expect(within(renderizar()).getByText('3 opiniões')).toBeInTheDocument();
    cleanup();
    const uma: ResumoDeOpinioes = {
      ...resumo,
      total: 1,
      por_nota: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 1 },
      opinioes: [resumo.opinioes[1]],
    };
    expect(within(renderizar({ dados: uma })).getByText('1 opinião')).toBeInTheDocument();
  });

  it('uma barra por nota com o rótulo literal e a contagem', () => {
    const secao = renderizar();
    const barras = within(within(secao).getByRole('list', { name: 'Opiniões por nota' })).getAllByRole('listitem');
    expect(barras.map((b) => b.textContent)).toEqual([
      '5Muito boa1',
      '4Boa1',
      '3Mais ou menos0',
      '2Ruim1',
      '1Muito ruim0',
    ]);
  });

  it('a contagem de cada barra vem de por_nota, não da lista', () => {
    const dados: ResumoDeOpinioes = {
      ...resumo,
      total: 250,
      por_nota: { '1': 10, '2': 20, '3': 30, '4': 40, '5': 150 },
    };
    const secao = renderizar({ dados });
    const barras = within(within(secao).getByRole('list', { name: 'Opiniões por nota' })).getAllByRole('listitem');
    expect(barras.map((b) => b.textContent)).toEqual([
      '5Muito boa150', '4Boa40', '3Mais ou menos30', '2Ruim20', '1Muito ruim10',
    ]);
    expect(within(secao).getByText('250 opiniões')).toBeInTheDocument();
  });

  it('lista na ordem da resposta, com data e hora de São Paulo, nota com rótulo e o texto', () => {
    const secao = renderizar();
    const lista = itens(secao);
    expect(lista).toHaveLength(3);
    // 1795532400000 = 24/11/2026 12:00 em Brasília
    expect(lista[0]).toHaveTextContent('24/11/2026 12:00');
    expect(lista[0]).toHaveTextContent('4 · Boa');
    expect(lista[0]).toHaveTextContent('Achei fácil de montar, mas queria mais opções de cores.');
    // 1795453200000 = 23/11/2026 14:00
    expect(lista[1]).toHaveTextContent('23/11/2026 14:00');
    expect(lista[1]).toHaveTextContent('5 · Muito boa');
    expect(lista[2]).toHaveTextContent('23/11/2026 13:00');
    expect(lista[2]).toHaveTextContent('2 · Ruim');
  });

  it('sem texto mostra "Sem comentário"; com texto não mostra', () => {
    const lista = itens(renderizar());
    expect(within(lista[1]).getByText('Sem comentário')).toBeInTheDocument();
    expect(within(lista[0]).queryByText('Sem comentário')).toBeNull();
    expect(within(lista[2]).queryByText('Sem comentário')).toBeNull();
  });

  it('texto vazio ou só espaços também é "Sem comentário"', () => {
    const dados: ResumoDeOpinioes = { ...resumo, opinioes: [{ ...resumo.opinioes[0], texto: '   ' }] };
    expect(within(itens(renderizar({ dados }))[0]).getByText('Sem comentário')).toBeInTheDocument();
  });

  it('porta pública: "Ver a visita" leva à trajetória do visitante na âncora da visita', () => {
    const lista = itens(renderizar());
    const link0 = within(lista[0]).getByRole('link', { name: 'Ver a visita' });
    expect(link0).toHaveAttribute(
      'href',
      '/dashboard/jornada/3f2b8c1e-9d4a-4b7e-8a6f-1c2d3e4f5a6b#visita-7a1c9e2d-5b3f-4c8a-9d6e-0f1a2b3c4d5e',
    );
    const link2 = within(lista[2]).getByRole('link', { name: 'Ver a visita' });
    expect(link2).toHaveAttribute(
      'href',
      '/dashboard/jornada/11111111-2222-4333-8444-555555555555#visita-66666666-7777-4888-9999-000000000000',
    );
  });

  it('porta logada: "Cliente", sem link', () => {
    const lista = itens(renderizar());
    expect(within(lista[1]).getByText('Cliente')).toBeInTheDocument();
    expect(within(lista[1]).queryByRole('link')).toBeNull();
    expect(within(lista[0]).queryByText('Cliente')).toBeNull();
  });

  it('pública sem visitante ou sem visita: sem link quebrado (mostra "Visita sem registro")', () => {
    const dados: ResumoDeOpinioes = {
      ...resumo,
      opinioes: [{ ...resumo.opinioes[0], visitante: undefined, visita: undefined }],
    };
    const item = itens(renderizar({ dados }))[0];
    expect(within(item).queryByRole('link')).toBeNull();
    expect(within(item).getByText('Visita sem registro')).toBeInTheDocument();
  });

  it('modelo: rótulo quando a página o conhece, id quando não', () => {
    const lista = itens(renderizar({ rotulosDeModelo: { l11: 'Refúgio', l1: 'Átrio' } }));
    expect(lista[0]).toHaveTextContent('Refúgio');
    expect(lista[1]).toHaveTextContent('Átrio');
    expect(lista[2]).toHaveTextContent('l3');
    cleanup();
    expect(itens(renderizar())[0]).toHaveTextContent('l11');
  });

  it('estado vazio literal quando total é zero, sem lista', () => {
    const vazio: ResumoDeOpinioes = {
      ...resumo,
      media: 0,
      total: 0,
      por_nota: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      opinioes: [],
    };
    const secao = renderizar({ dados: vazio });
    expect(within(secao).getByText('Ainda não há opiniões neste período.')).toBeInTheDocument();
    expect(within(secao).queryByRole('list')).toBeNull();
    expect(within(secao).queryByText(/Média:/)).toBeNull();
  });

  it('com dados não mostra o estado vazio', () => {
    expect(within(renderizar()).queryByText('Ainda não há opiniões neste período.')).toBeNull();
  });

  it('carregando: esqueleto, sem lista, sem erro', () => {
    const secao = renderizar({ dados: undefined, carregando: true });
    expect(secao).toHaveAttribute('aria-busy', 'true');
    expect(within(secao).queryByRole('list')).toBeNull();
    expect(within(secao).queryByRole('alert')).toBeNull();
  });

  it('erro: alerta visível com "Tentar de novo", que chama onTentar', () => {
    const onTentar = vi.fn();
    const secao = renderizar({ dados: undefined, erro: true, onTentar });
    const alerta = within(secao).getByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar.');
    expect(within(secao).queryByRole('list')).toBeNull();
    expect(within(secao).queryByText('Ainda não há opiniões neste período.')).toBeNull();
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentar).toHaveBeenCalledTimes(1);
  });

  it('sem dados e sem erro (nem carregando) cai no erro, nunca em cartão vazio', () => {
    expect(within(renderizar({ dados: undefined })).getByRole('alert')).toBeInTheDocument();
  });
});
