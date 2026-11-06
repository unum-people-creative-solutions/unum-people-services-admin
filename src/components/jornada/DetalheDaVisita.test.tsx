import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DetalheDaVisita } from './DetalheDaVisita';
import { jornadaService } from '@/services/jornadaService';
import type { EventoJornada, VisitanteJornada } from '@/types/jornada';
// JSON real de GET /admin/dashboard/jornada/visitantes/{v} com segundos (CA-4-16, L-071).
import fixtureVisitanteComTempo from '@/services/__fixtures__/visitante-com-tempo.json';

// spec-4-detalhe RF-4-24 (área aberta) e RF-4-25 (tela), CA-4-21.

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

function renderizar(visitante = VISITANTE, visita = V) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <DetalheDaVisita visitante={visitante} visita={visita} />
    </QueryClientProvider>,
  );
}

// Uma linha por página: o 1º parágrafo é a linha da página; os seguintes, o que houve nela.
async function paginas() {
  const lista = await screen.findByRole('list', { name: 'Páginas da visita' });
  return within(lista).getAllByRole('listitem').map((li) => within(li).getAllByRole('paragraph').map((p) => p.textContent));
}

describe('DetalheDaVisita: resumo da visita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(jornadaService.visitante).mockResolvedValue(resposta);
  });

  test('cabeçalho: horas, duração e o caminho com cada página uma vez e "(saiu aqui)" na última', async () => {
    renderizar();
    const cabecalho = await screen.findByText(
      '14:02–14:03 · 1 min 22 s · Escolha do modelo → Editor → Prévia → Contratação (saiu aqui)',
    );
    expect(cabecalho.textContent).toBe(
      '14:02–14:03 · 1 min 22 s · Escolha do modelo → Editor → Prévia → Contratação (saiu aqui)',
    );
    expect(jornadaService.visitante).toHaveBeenCalledWith(VISITANTE);
  });

  test('linhas das páginas: passagens, tempo somado, rolagem, seções, ações com ×n e erros', async () => {
    renderizar();
    const [escolha, editor, previa, contratacao] = await paginas();
    expect(escolha).toEqual([
      'Escolha do modelo —Tempo medido a partir da publicação desta fase · rolou até 75%',
      'Trocou o modelo ×3 · Trocou o tema',
    ]);
    expect(editor).toEqual(['Editor (2 passagens) 20 s', 'Erro: Imagem grande demais']);
    expect(previa).toEqual(['Prévia —Tempo medido a partir da publicação desta fase', 'Viu: Serviços, Passos']);
    expect(contratacao).toEqual([
      'Contratação —Tempo medido a partir da publicação desta fase',
      'Escolheu Pix · Clicou em Finalizar',
      'Erro: Campo CPF ou CNPJ',
    ]);
    expect((await paginas())).toHaveLength(4);
    expect(screen.getByText('Trocou o modelo ×3')).toBeInTheDocument();
  });

  test('tempo ausente: "—" com title e o texto para o leitor de tela', async () => {
    renderizar();
    await paginas();
    const ausentes = screen.getAllByTitle('Tempo medido a partir da publicação desta fase');
    expect(ausentes).toHaveLength(3);
    expect(ausentes[0].textContent).toBe('—Tempo medido a partir da publicação desta fase');
    expect(screen.getAllByText('Tempo medido a partir da publicação desta fase')).toHaveLength(3);
  });

  test('rolagem até o fim', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue({
      ...resposta,
      eventos: [e(0, 'lp_page_view', '/saude'), e(1, 'lp_rolagem_100', '/saude'), e(30, 'lp_tempo_na_pagina', '/saude', { segundos: 30 })],
    });
    renderizar();
    expect(await paginas()).toEqual([['Saúde 30 s · rolou até o fim']]);
  });

  test('rodapé: link para todas as visitas deste visitante', async () => {
    renderizar();
    expect(await screen.findByRole('link', { name: 'Ver todas as visitas deste visitante' })).toHaveAttribute(
      'href', `/dashboard/jornada/${VISITANTE}`,
    );
  });

  test('com o JSON real da API: o editor com 42 s e a prévia como última página', async () => {
    const dados = JSON.parse(JSON.stringify(fixtureVisitanteComTempo)) as VisitanteJornada;
    vi.mocked(jornadaService.visitante).mockResolvedValue(dados);
    renderizar(dados.visitante, dados.visitas[0].visita);
    expect(await paginas()).toEqual([
      ['Editor 42 s', 'Pôs ou trocou imagem'],
      ['Prévia —Tempo medido a partir da publicação desta fase'],
    ]);
    expect(screen.getByText('09:00–09:00 · 43 s · Editor → Prévia (saiu aqui)')).toBeInTheDocument();
  });
});
