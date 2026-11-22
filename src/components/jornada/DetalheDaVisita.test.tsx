import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DetalheDaVisita } from './DetalheDaVisita';
import { jornadaService } from '@/services/jornadaService';
import type { EventoJornada, VisitanteJornada } from '@/types/jornada';
// JSON real de GET /admin/dashboard/jornada/visitantes/{v} com segundos (CA-4-16, L-071).
import fixtureVisitanteComTempo from '@/services/__fixtures__/visitante-com-tempo.json';
import { rotuloDoNo } from '@/test/trajetoria';

// spec-4-detalhe RF-4-24 (área aberta); jornada-trajetoria T07 (RF-JT-31): a linha aberta mostra a trajetória em resumo.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));

const VISITANTE = '5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6';
const V = '0c4b5a8e-1f2a-4b3c-9d8e-7f6a5b4c3d2e';
const T0 = Date.UTC(2026, 10, 6, 17, 2, 0); // 14:02 em Brasília

function e(seg: number, nome: string, caminho: string, extra: Partial<EventoJornada> = {}): EventoJornada {
  return { em: T0 + seg * 1000, nome, caminho, visita: V, ...extra };
}

// Escolha → Editor → Prévia → Editor → Contratação.
const eventos: EventoJornada[] = [
  e(0, 'lp_page_view', '/configurar'),
  e(5, 'lp_rolagem_25', '/configurar'),
  e(6, 'lp_rolagem_75', '/configurar'),
  e(10, 'lp_clique_escolha_modelo', '/configurar'),
  e(11, 'lp_clique_escolha_modelo', '/configurar'),
  e(12, 'lp_clique_escolha_modelo', '/configurar'),
  e(13, 'lp_clique_escolha_tema', '/configurar'),
  e(40, 'lp_page_view', '/configurar/editar'),
  e(41, 'lp_erro_editor_imagem_grande', '/configurar/editar'),
  e(48, 'lp_tempo_na_pagina', '/configurar/editar', { segundos: 8 }),
  e(49, 'lp_page_view', '/configurar/preview'),
  e(50, 'lp_previa_secao_services', '/configurar/preview'),
  e(51, 'lp_previa_secao_steps', '/configurar/preview'),
  e(60, 'lp_page_view', '/configurar/editar'),
  e(72, 'lp_tempo_na_pagina', '/configurar/editar', { segundos: 12 }),
  e(73, 'lp_page_view', '/configurar/contratar'),
  e(80, 'lp_clique_contratar_pix', '/configurar/contratar'),
  e(81, 'lp_clique_contratar_finalizar', '/configurar/contratar'),
  e(82, 'lp_erro_contratar_documento', '/configurar/contratar'),
  // Outra visita do mesmo visitante: fica fora.
  { em: T0 + 900_000, nome: 'lp_page_view', caminho: '/crm', visita: 'outra' },
];

const resposta: VisitanteJornada = { visitante: VISITANTE, visitas: [], eventos, contratacoes: [] };

function renderizar(visitante = VISITANTE, visita: string | readonly string[] = V, pagou = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <DetalheDaVisita visitante={visitante} visita={visita} pagou={pagou} />
    </QueryClientProvider>,
  );
}

// Os <li> dos nós são os filhos diretos do <ol>; as ações de cada nó ficam em listas aninhadas.
async function nos() {
  const lista = await screen.findByRole('list', { name: 'Trajetória da visita' });
  return within(lista)
    .getAllByRole('listitem')
    .filter((li) => li.parentElement === lista);
}

function noDe(lista: HTMLElement[], rotulo: string, posicao = 0): HTMLElement {
  const achados = lista.filter((li) => rotuloDoNo(li) === rotulo);
  if (!achados[posicao]) throw new Error(`nó ${rotulo} (${posicao}) não encontrado`);
  return achados[posicao];
}

describe('DetalheDaVisita: trajetória da visita (T07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(jornadaService.visitante).mockResolvedValue(resposta);
  });

  test('resumo do topo e um nó por etapa ou página, na ordem, com tempo e rolagem', async () => {
    renderizar();
    const lista = await nos();
    expect(screen.getByText('14:02–14:03 · 1 min 22 s · 5 etapas · voltou 1 vez')).toBeInTheDocument();
    expect(lista.map((li) => rotuloDoNo(li))).toEqual([
      'Visitou',
      'Editor',
      'Prévia',
      'Editor',
      'Contratação',
    ]);
    expect(within(lista[0]).getByText('Escolha do modelo · 40 s · rolou até 75%')).toBeInTheDocument();
    expect(within(lista[3]).getByText('voltou · 13 s')).toBeInTheDocument();
    expect(within(lista[4]).getByText('9 s · saiu aqui')).toBeInTheDocument();
    expect(jornadaService.visitante).toHaveBeenCalledWith(VISITANTE);
  });

  test('ações principais sob cada nó: erros primeiro, repetidas viram ×n', async () => {
    renderizar();
    const lista = await nos();
    const acoes = (rotulo: string, pos = 0) =>
      within(within(noDe(lista, rotulo, pos)).getByRole('list', { name: `Ações de ${rotulo}` }))
        .getAllByRole('listitem')
        .map((li) => li.textContent);
    expect(acoes('Visitou')).toEqual(['Trocou o modelo ×3', 'Trocou o tema']);
    expect(acoes('Editor')).toEqual(['Erro: Imagem grande demais']);
    expect(acoes('Contratação')).toEqual(['Erro: Campo CPF ou CNPJ', 'Escolheu Pix', 'Clicou em Finalizar']);
  });

  test('com mais de 3 ações, o link "+ 1 ação" leva à página do visitante na âncora da visita', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue({
      ...resposta,
      eventos: [
        e(0, 'lp_page_view', '/configurar'),
        e(1, 'lp_clique_escolha_modelo', '/configurar'),
        e(2, 'lp_clique_escolha_tema', '/configurar'),
        e(3, 'lp_clique_escolha_botao', '/configurar'),
        e(4, 'lp_clique_escolha_celular', '/configurar'),
      ],
    });
    renderizar();
    const link = await screen.findByRole('link', { name: '+ 1 ação' });
    expect(link).toHaveAttribute('href', `/dashboard/jornada/${VISITANTE}#visita-${V}`);
  });

  test('o texto antigo do resumo e a lista "Páginas da visita" não existem mais', async () => {
    renderizar();
    await nos();
    expect(screen.queryByText(/\(saiu aqui\)/)).toBeNull();
    expect(screen.queryByRole('list', { name: 'Páginas da visita' })).toBeNull();
  });

  test('rodapé: "Ver todas as ações desta visita" aponta para a âncora da visita', async () => {
    renderizar();
    expect(await screen.findByRole('link', { name: 'Ver todas as ações desta visita' })).toHaveAttribute(
      'href',
      `/dashboard/jornada/${VISITANTE}#visita-${V}`,
    );
    expect(screen.queryByRole('link', { name: 'Ver todas as visitas deste visitante' })).toBeNull();
  });

  test('com o JSON real da API: o editor com 42 s e a prévia como último nó', async () => {
    const dados = JSON.parse(JSON.stringify(fixtureVisitanteComTempo)) as VisitanteJornada;
    vi.mocked(jornadaService.visitante).mockResolvedValue(dados);
    renderizar(dados.visitante, dados.visitas[0].visita);
    const lista = await nos();
    expect(screen.getByText('09:00–09:00 · 43 s · 2 etapas')).toBeInTheDocument();
    expect(within(lista[0]).getByText('Editor · 43 s')).toBeInTheDocument();
    expect(within(lista[1]).getByText('0 s · saiu aqui')).toBeInTheDocument();
    expect(within(lista[0]).getByText('Pôs ou trocou imagem')).toBeInTheDocument();
  });

  // jornada-fluxo-atual RF-JF-46, caso real: visita de 20/11 16:01 com /, /configurar e /configurar/editar.
  test('visita de 20/11 16:01: "Início" e "Editor", sem "Escolha do modelo"', async () => {
    const t = Date.parse('2026-11-20T16:01:00-03:00');
    const ev = (seg: number, nome: string, caminho: string, extra: Partial<EventoJornada> = {}): EventoJornada => ({
      em: t + seg * 1000, nome, caminho, visita: V, ...extra,
    });
    vi.mocked(jornadaService.visitante).mockResolvedValue({
      ...resposta,
      eventos: [
        ev(0, 'lp_page_view', '/'),
        ev(5, 'lp_page_view', '/configurar'),
        ev(6, 'lp_tempo_na_pagina', '/configurar', { segundos: 1 }),
        ev(7, 'lp_page_view', '/configurar/editar'),
        ev(60, 'lp_tempo_na_pagina', '/configurar/editar', { segundos: 53 }),
      ],
    });
    renderizar();
    const lista = await nos();
    expect(screen.getByText('16:01–16:02 · 1 min · 2 etapas')).toBeInTheDocument();
    expect(lista.map((li) => rotuloDoNo(li))).toEqual(['Visitou', 'Editor']);
    expect(within(lista[1]).getByText('53 s · saiu aqui')).toBeInTheDocument();
    expect(screen.queryByText(/Escolha do modelo/)).toBeNull();
  });

  // jornada-higiene-e-qualidade (RF-JH-22, CA-JH-21): linha consolidada agrega todas as visitas agrupadas.
  test('CA-JH-21 — com visitas agrupadas, a trajetória junta os eventos de todas e a âncora é a da 1ª', async () => {
    renderizar(VISITANTE, [V, 'outra']);
    const lista = await nos();
    expect(screen.getByText('14:02–14:17 · 15 min · 6 etapas · voltou 1 vez')).toBeInTheDocument();
    expect(lista).toHaveLength(6);
    expect(within(lista[5]).getByText('CRM')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas as ações desta visita' })).toHaveAttribute(
      'href',
      `/dashboard/jornada/${VISITANTE}#visita-${V}`,
    );
  });

  describe('pagamento (RF-JT-26)', () => {
    const t = Date.parse('2026-11-20T10:00:00-03:00');
    const ev = (seg: number, nome: string, caminho: string): EventoJornada => ({
      em: t + seg * 1000, nome, caminho, visita: V,
    });
    const comContratou: EventoJornada[] = [
      ev(0, 'lp_page_view', '/'),
      ev(10, 'lp_checkout_opened', '/configurar/contratar'),
      ev(60, 'lp_checkout_succeeded', '/configurar/sucesso'),
    ];

    test('pagou: o nó Contratou leva o selo Pagou', async () => {
      vi.mocked(jornadaService.visitante).mockResolvedValue({ ...resposta, eventos: comContratou });
      renderizar(VISITANTE, V, true);
      const lista = await nos();
      expect(within(noDe(lista, 'Contratou')).getByText('Pagou')).toBeInTheDocument();
    });

    test('não pagou: sem selo Pagou', async () => {
      vi.mocked(jornadaService.visitante).mockResolvedValue({ ...resposta, eventos: comContratou });
      renderizar(VISITANTE, V, false);
      await nos();
      expect(screen.queryByText('Pagou')).toBeNull();
    });
  });

  test('sem eventos da visita: "Nenhum evento registrado nesta visita."', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue({ ...resposta, eventos: [] });
    renderizar();
    expect(await screen.findByText('Nenhum evento registrado nesta visita.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Trajetória da visita' })).toBeNull();
  });

  test('erro ao carregar: mensagem e botão para tentar de novo', async () => {
    vi.mocked(jornadaService.visitante).mockRejectedValue(new Error('falhou'));
    renderizar();
    expect(await screen.findByText('Não foi possível carregar esta visita.')).toBeInTheDocument();
  });
});
