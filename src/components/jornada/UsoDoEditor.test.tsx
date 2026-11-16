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

  it('sem uso no período, cada linha mostra 0', () => {
    const secao = renderizar({});
    const ia = within(secao).getByRole('list', { name: 'Editar com IA' });
    expect(within(ia).getAllByRole('listitem').every((li) => /\D0$/.test(li.textContent ?? ''))).toBe(true);
  });
});
