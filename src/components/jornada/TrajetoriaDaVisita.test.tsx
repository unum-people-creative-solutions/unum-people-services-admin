import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventoJornada } from '@/types/jornada';
import { trajetoriaDaVisita, type Trajetoria } from '@/lib/trajetoria';
import { TrajetoriaDaVisita } from './TrajetoriaDaVisita';
import { rotuloDoNo } from '@/test/trajetoria';

// jornada-trajetoria T05 (modo resumo) e T06 (modo completo), RF-JT-20..26.
const T0 = Date.parse('2026-11-21T14:31:00-03:00');
const V = 'visita-1';
const VISITANTE = 'visitante-9';
const EDITAR = '/configurar/editar';
const PREVIA = '/configurar/preview';

function ev(seg: number, nome: string, caminho: string, extra: Partial<EventoJornada> = {}): EventoJornada {
  return { em: T0 + seg * 1000, nome, caminho, visita: V, ...extra };
}

const visitaDoPlano: EventoJornada[] = [
  ev(0, 'lp_page_view', '/'),
  ev(30, 'lp_rolagem_50', '/'),
  ev(48, 'lp_janela_aberta', EDITAR),
  ev(120, 'lp_janela_enviada', EDITAR),
  ev(139, 'lp_site_montado_ia', EDITAR, { segundos: 19 }),
  // RF-JT-12a: uma ação no editor antes da prévia; sem ela, a prévia ficaria no nó da montagem.
  ev(150, 'lp_clique_editor_imagem', EDITAR),
  ev(174, 'lp_clique_previa_botao', PREVIA),
  ev(180, 'lp_tempo_na_pagina', EDITAR, { segundos: 30 }),
  ev(196, 'lp_clique_editor_imagem', EDITAR),
  ev(446, 'lp_checkout_opened', '/configurar/contratar'),
  ev(612, 'lp_checkout_succeeded', '/configurar/sucesso'),
  ev(680, 'lp_clique_sucesso_fatura', '/configurar/sucesso'),
];

function trajetoria(eventos: EventoJornada[]): Trajetoria {
  return trajetoriaDaVisita(eventos, V)!;
}

function renderizar(
  t: Trajetoria,
  modo: 'resumo' | 'completo',
  extra: Partial<{ pagou: boolean }> = {},
) {
  return render(
    <TrajetoriaDaVisita trajetoria={t} modo={modo} visitante={VISITANTE} ancora={V} pagou={extra.pagou ?? false} />,
  );
}

// Os <li> dos nós são os filhos diretos do <ol>; as ações de cada nó ficam em listas aninhadas.
function nosDaLista(): HTMLElement[] {
  const lista = screen.getByRole('list', { name: 'Trajetória da visita' });
  return within(lista)
    .getAllByRole('listitem')
    .filter((li) => li.parentElement === lista);
}

function noDe(rotulo: string): HTMLElement {
  // O rótulo do nó é o primeiro texto dele; no modo completo o mesmo texto também pode ser um evento (ex.: "Contratou").
  const no = nosDaLista().find((li) => rotuloDoNo(li) === rotulo);
  if (!no) throw new Error(`nó ${rotulo} não encontrado`);
  return no;
}

describe('TrajetoriaDaVisita, modo resumo (T05)', () => {
  it('lista "Trajetória da visita" com um nó por etapa, dentro de um grupo rolável com o mesmo nome', () => {
    renderizar(trajetoria(visitaDoPlano), 'resumo');
    const grupo = screen.getByRole('group', { name: 'Trajetória da visita' });
    expect(grupo).toHaveAttribute('tabindex', '0');
    expect(within(grupo).getByRole('list', { name: 'Trajetória da visita' })).toBeInTheDocument();
    const nos = nosDaLista();
    expect(nos).toHaveLength(8);
    for (const rotulo of [
      'Visitou',
      'Abriu modal de entrada',
      'Enviou os dados',
      'Viu o site montado',
      'Prévia',
      'Editor',
      'Abriu a contratação',
      'Contratou',
    ]) {
      expect(within(noDe(rotulo)).getByText(rotulo)).toBeInTheDocument();
    }
  });

  it('a linha de informação de cada nó segue RF-JT-22', () => {
    renderizar(trajetoria(visitaDoPlano), 'resumo');
    expect(within(noDe('Visitou')).getByText('Início · 48 s · rolou até 50%')).toBeInTheDocument();
    expect(within(noDe('Abriu modal de entrada')).getByText('Editor · 1 min 12 s')).toBeInTheDocument();
    expect(within(noDe('Prévia')).getByText('22 s')).toBeInTheDocument();
    expect(within(noDe('Editor')).getByText('voltou · 4 min 10 s')).toBeInTheDocument();
    expect(within(noDe('Contratou')).getByText('Sucesso · 1 min 8 s')).toBeInTheDocument();
  });

  it('rolou até o fim (100) e rolou até 25% (RF-JT-22)', () => {
    const { unmount } = renderizar(
      trajetoria([ev(0, 'lp_page_view', '/'), ev(5, 'lp_rolagem_100', '/'), ev(20, 'lp_janela_aberta', EDITAR)]),
      'resumo',
    );
    expect(within(noDe('Visitou')).getByText('Início · 20 s · rolou até o fim')).toBeInTheDocument();
    unmount();
    renderizar(
      trajetoria([ev(0, 'lp_page_view', '/'), ev(5, 'lp_rolagem_25', '/'), ev(20, 'lp_janela_aberta', EDITAR)]),
      'resumo',
    );
    expect(within(noDe('Visitou')).getByText('Início · 20 s · rolou até 25%')).toBeInTheDocument();
  });

  it('visita de um só nó: "1 etapa" no singular, sem "voltou" (RF-JT-25)', () => {
    renderizar(trajetoria([ev(0, 'lp_page_view', '/')]), 'resumo');
    expect(screen.getByText('14:31–14:31 · 0 s · 1 etapa')).toBeInTheDocument();
    expect(screen.queryByText(/1 etapas/)).not.toBeInTheDocument();
    expect(within(noDe('Visitou')).getByText('Início · 0 s · saiu aqui')).toBeInTheDocument();
  });

  it('o resumo acima do gráfico mostra horário, duração, etapas e voltas', () => {
    renderizar(trajetoria(visitaDoPlano), 'resumo');
    expect(screen.getByText('14:31–14:42 · 11 min 20 s · 8 etapas · voltou 1 vez')).toBeInTheDocument();
  });

  it('sem voltas, a parte "voltou" não aparece; com duas, usa o plural', () => {
    const semVolta = trajetoria([ev(0, 'lp_page_view', '/'), ev(30, 'lp_janela_aberta', EDITAR)]);
    const { unmount } = renderizar(semVolta, 'resumo');
    expect(screen.getByText('14:31–14:31 · 30 s · 2 etapas')).toBeInTheDocument();
    expect(screen.queryByText(/voltou/)).not.toBeInTheDocument();
    unmount();
    const duas = trajetoria([
      ev(0, 'lp_page_view', '/'),
      ev(10, 'lp_janela_aberta', EDITAR),
      ev(20, 'lp_clique_previa_botao', PREVIA),
      ev(30, 'lp_clique_editor_imagem', EDITAR),
      ev(40, 'lp_clique_previa_botao', PREVIA),
      ev(50, 'lp_clique_editor_imagem', EDITAR),
    ]);
    renderizar(duas, 'resumo');
    expect(screen.getByText(/voltou 3 vezes/)).toBeInTheDocument();
  });

  it('cada nó diz, em texto para leitor de tela, se é etapa do funil ou página', () => {
    renderizar(trajetoria(visitaDoPlano), 'resumo');
    expect(within(noDe('Visitou')).getByText('etapa do funil')).toBeInTheDocument();
    expect(within(noDe('Contratou')).getByText('etapa do funil')).toBeInTheDocument();
    expect(within(noDe('Prévia')).getByText('página')).toBeInTheDocument();
    expect(within(noDe('Editor')).getByText('página')).toBeInTheDocument();
  });

  it('o último nó que não é Contratou mostra "saiu aqui"; Contratou não', () => {
    const saiuNoEditor = trajetoria(visitaDoPlano.slice(0, 9));
    const { unmount } = renderizar(saiuNoEditor, 'resumo');
    expect(within(noDe('Editor')).getByText(/saiu aqui/)).toBeInTheDocument();
    expect(screen.getAllByText(/saiu aqui/)).toHaveLength(1);
    unmount();
    renderizar(trajetoria(visitaDoPlano), 'resumo');
    expect(screen.queryByText(/saiu aqui/)).not.toBeInTheDocument();
  });

  it('visita paga leva o selo "Pagou" no nó Contratou; sem pagamento, nenhum selo', () => {
    const { unmount } = renderizar(trajetoria(visitaDoPlano), 'resumo', { pagou: true });
    expect(within(noDe('Contratou')).getByText('Pagou')).toBeInTheDocument();
    expect(screen.getAllByText('Pagou')).toHaveLength(1);
    unmount();
    renderizar(trajetoria(visitaDoPlano), 'resumo', { pagou: false });
    expect(screen.queryByText('Pagou')).not.toBeInTheDocument();
    expect(screen.queryByText('Não pagou')).not.toBeInTheDocument();
  });

  it('mostra até 3 ações por nó e o link "+ 2 ações" para a página do visitante', () => {
    const t = trajetoria([
      ev(0, 'lp_page_view', '/'),
      ev(5, 'lp_janela_aberta', EDITAR),
      ev(6, 'lp_menu_tema', EDITAR),
      ev(7, 'lp_menu_layout', EDITAR),
      ev(8, 'lp_menu_dados', EDITAR),
      ev(9, 'lp_menu_buscas', EDITAR),
      ev(10, 'lp_menu_ia', EDITAR),
    ]);
    renderizar(t, 'resumo');
    const no = noDe('Abriu modal de entrada');
    expect(within(no).getByText('Menu: Editar tema')).toBeInTheDocument();
    expect(within(no).getByText('Menu: Editar layout')).toBeInTheDocument();
    expect(within(no).getByText('Menu: Dados da página')).toBeInTheDocument();
    expect(within(no).queryByText('Menu: Buscas')).not.toBeInTheDocument();
    const link = within(no).getByRole('link', { name: '+ 2 ações' });
    expect(link).toHaveAttribute('href', `/dashboard/jornada/${VISITANTE}#visita-${V}`);
  });

  it('com 4 ações principais, o link é "+ 1 ação"', () => {
    const t = trajetoria([
      ev(0, 'lp_page_view', '/'),
      ev(5, 'lp_janela_aberta', EDITAR),
      ev(6, 'lp_menu_tema', EDITAR),
      ev(7, 'lp_menu_layout', EDITAR),
      ev(8, 'lp_menu_dados', EDITAR),
      ev(9, 'lp_menu_buscas', EDITAR),
    ]);
    renderizar(t, 'resumo');
    expect(screen.getByRole('link', { name: '+ 1 ação' })).toBeInTheDocument();
  });

  it('com até 3 ações não há link "+ N ações"; erros aparecem antes das ações', () => {
    const t = trajetoria([
      ev(0, 'lp_page_view', '/'),
      ev(5, 'lp_janela_aberta', EDITAR),
      ev(6, 'lp_menu_tema', EDITAR),
      ev(7, 'lp_erro_editor_whatsapp', EDITAR),
    ]);
    renderizar(t, 'resumo');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const no = noDe('Abriu modal de entrada');
    const textos = within(no)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(textos).toEqual(['Erro: WhatsApp vazio', 'Menu: Editar tema']);
  });

  it('no resumo não há horário nem legenda', () => {
    const { container } = renderizar(trajetoria(visitaDoPlano), 'resumo');
    expect(container.querySelectorAll('time')).toHaveLength(0);
    expect(screen.queryByRole('list', { name: 'Legenda da trajetória' })).not.toBeInTheDocument();
  });

  it('leitura (rolagem, tempo) não aparece como ação no resumo', () => {
    renderizar(trajetoria(visitaDoPlano), 'resumo');
    expect(screen.queryByText('Rolou 50%')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ficou 30 s nesta página/)).not.toBeInTheDocument();
  });
});

describe('TrajetoriaDaVisita, modo completo (T06)', () => {
  it('todos os eventos do nó aparecem, cada um com <time> HH:MM:SS, inclusive leitura', () => {
    const { container } = renderizar(trajetoria(visitaDoPlano), 'completo');
    const tempos = Array.from(container.querySelectorAll('time')).map((t) => t.textContent);
    // Ordem da tela: nó a nó. O tempo na página das 14:34:00 pertence ao nó "Viu o site montado" (RF-JT-13).
    expect(tempos).toEqual([
      '14:31:00', '14:31:30', '14:31:48', '14:33:00', '14:33:19', '14:33:30',
      '14:34:00', '14:33:54', '14:34:16', '14:38:26', '14:41:12', '14:42:20',
    ]);
    const visitou = noDe('Visitou');
    expect(within(visitou).getByText('Viu a página')).toBeInTheDocument();
    expect(within(visitou).getByText('Rolou 50%')).toBeInTheDocument();
    expect(within(noDe('Viu o site montado')).getByText('Ficou 30 s nesta página')).toBeInTheDocument();
  });

  it('a informação do nó começa pela hora de início com segundos', () => {
    renderizar(trajetoria(visitaDoPlano), 'completo');
    expect(within(noDe('Visitou')).getByText('14:31:00 · Início · 48 s · rolou até 50%')).toBeInTheDocument();
    expect(within(noDe('Editor')).getByText('14:34:16 · voltou · 4 min 10 s')).toBeInTheDocument();
  });

  it('nome desconhecido aparece cru', () => {
    const t = trajetoria([ev(0, 'lp_page_view', '/'), ev(4, 'lp_coisa_nova', '/')]);
    renderizar(t, 'completo');
    expect(screen.getByText('lp_coisa_nova')).toBeInTheDocument();
  });

  it('tem a legenda e nenhum link "+ N ações"', () => {
    renderizar(
      trajetoria([
        ev(0, 'lp_page_view', '/'),
        ev(5, 'lp_janela_aberta', EDITAR),
        ev(6, 'lp_menu_tema', EDITAR),
        ev(7, 'lp_menu_layout', EDITAR),
        ev(8, 'lp_menu_dados', EDITAR),
        ev(9, 'lp_menu_buscas', EDITAR),
      ]),
      'completo',
    );
    const legenda = screen.getByRole('list', { name: 'Legenda da trajetória' });
    expect(within(legenda).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Menu: Buscas')).toBeInTheDocument();
  });

  it('o resumo e o selo "Pagou" também aparecem no completo', () => {
    renderizar(trajetoria(visitaDoPlano), 'completo', { pagou: true });
    expect(screen.getByText('14:31–14:42 · 11 min 20 s · 8 etapas · voltou 1 vez')).toBeInTheDocument();
    expect(within(noDe('Contratou')).getByText('Pagou')).toBeInTheDocument();
  });
});
