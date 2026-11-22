import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsoDoEditor } from './UsoDoEditor';

// configurador-com-ia TASK-ADM-305 (blueprint §9.2): menu "Editar com IA" e as linhas da IA,
// as novas primeiro e as quatro de copiar e colar com o sufixo.

const USO: Record<string, number> = {
  lp_menu_ia: 9,
  lp_ia_pedido_enviado: 10,
  lp_ia_mudancas_vistas: 6,
  lp_ia_sem_mudancas: 2,
  lp_ia_mudancas_aplicadas: 5,
  lp_ia_fora_do_escopo: 1,
  lp_ia_convite_exibido: 3,
  lp_ia_copiou: 8,
  lp_ia_viu_mudancas: 4,
  lp_ia_resposta_invalida: 1,
  lp_ia_aplicou: 2,
};

function renderizar(uso: Record<string, number> | undefined = USO) {
  render(<UsoDoEditor uso={uso} carregando={false} erro={false} onTentar={() => {}} />);
  return screen.getByRole('region', { name: 'Uso do editor' });
}

describe('UsoDoEditor (A2)', () => {
  it('menu "Editar": a opção da IA diz "Editar com IA"', () => {
    const secao = renderizar();
    const menu = within(secao).getByRole('list', { name: 'Menu "Editar"' });
    expect(within(menu).getByText('Editar com IA')).toBeInTheDocument();
    expect(within(menu).queryByText('Editar com sua IA')).toBeNull();
  });

  it('as linhas da IA na ordem do §9.2, com o número de cada uma', () => {
    const secao = renderizar();
    const ia = within(secao).getByRole('list', { name: 'Editar com IA' });
    expect(within(ia).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'IA: pediu mudança10',
      'IA: viu as mudanças6',
      'IA: resposta sem mudança2',
      'IA: aplicou5',
      'IA: pedido fora do assunto1',
      'IA: viu o convite para contratar3',
      'IA: copiou as instruções (copiar e colar)8',
      'IA: viu as mudanças (copiar e colar)450%',
      'IA: resposta não lida (copiar e colar)1',
      'IA: aplicou as mudanças (copiar e colar)225%',
    ]);
  });

  // jornada-trajetoria T09 (RF-JT-33): só as linhas com valor maior que 0.
  const NOTA = 'Opções sem uso no período ficam fora da lista.';

  it('T09: só as linhas com valor; as sem uso ficam fora e aparece a nota', () => {
    const secao = renderizar({ lp_menu_tema: 2, lp_ia_pedido_enviado: 1 });
    const menu = within(secao).getByRole('list', { name: 'Menu "Editar"' });
    expect(within(menu).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Editar tema2']);
    const ia = within(secao).getByRole('list', { name: 'Editar com IA' });
    expect(within(ia).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['IA: pediu mudança1']);
    expect(within(secao).queryByText('Buscas')).toBeNull();
    expect(within(secao).queryByText('IA: aplicou')).toBeNull();
    expect(within(secao).getByText(NOTA)).toBeInTheDocument();
  });

  it('T09: sem uso nenhum, aparece "Nenhum uso do editor no período." e nenhuma lista', () => {
    const secao = renderizar({});
    expect(within(secao).getByText('Nenhum uso do editor no período.')).toBeInTheDocument();
    expect(within(secao).queryByRole('list')).toBeNull();
    expect(within(secao).queryByRole('heading', { name: 'Menu "Editar"' })).toBeNull();
    expect(within(secao).queryByRole('heading', { name: 'Editar com IA' })).toBeNull();
    expect(within(secao).queryByText(NOTA)).toBeNull();
  });

  it('T09: com todas as linhas da IA em 0, o bloco "Editar com IA" não aparece (o menu fica)', () => {
    const secao = renderizar({ lp_menu_tema: 4, lp_menu_ia: 3 });
    expect(within(secao).getByRole('list', { name: 'Menu "Editar"' })).toBeInTheDocument();
    expect(within(secao).queryByRole('list', { name: 'Editar com IA' })).toBeNull();
    expect(within(secao).queryByRole('heading', { name: 'Editar com IA' })).toBeNull();
    expect(within(secao).queryByText('Nenhum uso do editor no período.')).toBeNull();
  });

  it('T09: com todas as linhas do menu em 0, o bloco "Menu Editar" não aparece (a IA fica)', () => {
    const secao = renderizar({ lp_ia_pedido_enviado: 2 });
    expect(within(secao).queryByRole('list', { name: 'Menu "Editar"' })).toBeNull();
    expect(within(secao).queryByRole('heading', { name: 'Menu "Editar"' })).toBeNull();
    expect(within(secao).getByRole('list', { name: 'Editar com IA' })).toBeInTheDocument();
  });

  it('T09: com todas as linhas com valor, não aparece a nota nem a mensagem de vazio', () => {
    const tudo: Record<string, number> = {
      ...USO,
      lp_menu_tema: 1, lp_menu_layout: 1, lp_menu_dados: 1, lp_menu_buscas: 1, lp_menu_ia: 1, lp_menu_guia: 1,
    };
    const secao = renderizar(tudo);
    expect(within(secao).queryByText(NOTA)).toBeNull();
    expect(within(secao).queryByText('Nenhum uso do editor no período.')).toBeNull();
  });

  it('T09: as porcentagens do copiar e colar continuam nas linhas que ficam', () => {
    const secao = renderizar({ lp_ia_copiou: 8, lp_ia_viu_mudancas: 4 });
    const ia = within(secao).getByRole('list', { name: 'Editar com IA' });
    expect(within(ia).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'IA: copiou as instruções (copiar e colar)8',
      'IA: viu as mudanças (copiar e colar)450%',
    ]);
  });
});
