import { describe, expect, it } from 'vitest';
import type { EventoJornada } from '@/types/jornada';
import { acoesPrincipais, trajetoriaDaVisita } from './trajetoria';

// jornada-trajetoria T02, T02b, T03 (RF-JT-10..16). Brasília é UTC−3 fixo.
const T0 = Date.parse('2026-11-21T14:31:00-03:00');
const V = 'visita-1';

function ev(seg: number, nome: string, caminho: string, extra: Partial<EventoJornada> = {}): EventoJornada {
  return { em: T0 + seg * 1000, nome, caminho, visita: V, ...extra };
}

const EDITAR = '/configurar/editar';
const PREVIA = '/configurar/preview';

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

describe('trajetoriaDaVisita: nós (T02)', () => {
  it('sem eventos da visita devolve null', () => {
    expect(trajetoriaDaVisita([], V)).toBeNull();
    expect(trajetoriaDaVisita(visitaDoPlano, 'outra')).toBeNull();
  });

  it('rótulos, tipos, volta, segundos e totais do plano de testes', () => {
    const t = trajetoriaDaVisita(visitaDoPlano, V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual([
      'Visitou',
      'Abriu modal de entrada',
      'Enviou os dados',
      'Viu o site montado',
      'Prévia',
      'Editor',
      'Abriu a contratação',
      'Contratou',
    ]);
    expect(t.nos.map((n) => n.tipo)).toEqual([
      'etapa', 'etapa', 'etapa', 'etapa', 'pagina', 'pagina', 'etapa', 'etapa',
    ]);
    expect(t.nos.map((n) => n.volta)).toEqual([false, false, false, false, false, true, false, false]);
    expect(t.voltas).toBe(1);
    expect(t.nos.map((n) => n.segundos)).toEqual([48, 72, 19, 35, 22, 250, 166, 68]);
    expect(t.inicio).toBe(T0);
    expect(t.fim).toBe(T0 + 680_000);
    expect(t.duracaoMs).toBe(680_000);
    const soma = t.nos.reduce((s, n) => s + n.segundos, 0);
    expect(soma).toBe(680);
    expect(soma).toBeLessThanOrEqual(Math.floor(t.duracaoMs / 1000));
  });

  it('o nó traz o caminho e o início do evento que o abriu', () => {
    const t = trajetoriaDaVisita(visitaDoPlano, V)!;
    expect(t.nos[0].caminho).toBe('/');
    expect(t.nos[0].inicio).toBe(T0);
    expect(t.nos[1].caminho).toBe(EDITAR);
    expect(t.nos[1].inicio).toBe(T0 + 48_000);
    expect(t.nos[4].caminho).toBe(PREVIA);
  });

  it('medição passiva entra no nó mais recente com o mesmo caminho e não abre nó (RF-JT-13)', () => {
    const t = trajetoriaDaVisita(visitaDoPlano, V)!;
    const viuSite = t.nos.find((n) => n.rotulo === 'Viu o site montado')!;
    const previa = t.nos.find((n) => n.rotulo === 'Prévia')!;
    expect(viuSite.eventos.map((e) => e.nome)).toContain('lp_tempo_na_pagina');
    expect(previa.eventos.map((e) => e.nome)).not.toContain('lp_tempo_na_pagina');
    expect(t.nos).toHaveLength(8);
  });

  it('o nó Visitou tem rolagem 50', () => {
    const t = trajetoriaDaVisita(visitaDoPlano, V)!;
    expect(t.nos[0].rolagem).toBe(50);
    expect(t.nos[1].rolagem).toBeNull();
  });

  it('visita em lista (linha consolidada) junta os eventos das duas visitas, em ordem', () => {
    const outra = ev(10, 'lp_page_view', '/saude', { visita: 'v2' });
    const t = trajetoriaDaVisita([visitaDoPlano[1], outra, visitaDoPlano[0]], [V, 'v2'])!;
    expect(t.inicio).toBe(T0);
    expect(t.fim).toBe(T0 + 30_000);
    // A rolagem em / depois de /saude é a pessoa de volta ao Início (RF-JT-13, medição de leitura).
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', 'Saúde', 'Início']);
    expect(t.nos[2].volta).toBe(true);
  });

  it('o lp_editor_opened absorvido pela janela não aparece (RF-JF-47)', () => {
    const eventos = [
      ev(0, 'lp_page_view', '/'),
      ev(5, 'lp_editor_opened', EDITAR),
      ev(6, 'lp_janela_aberta', EDITAR),
    ];
    const t = trajetoriaDaVisita(eventos, V)!;
    const nomes = t.nos.flatMap((n) => n.eventos.map((e) => e.nome));
    expect(nomes).not.toContain('lp_editor_opened');
    expect(nomes).toContain('lp_janela_aberta');
  });
});

describe('trajetoriaDaVisita: volta e passagem (T02b)', () => {
  it('série nova: /configurar não vira nó; os eventos dele ficam no nó atual', () => {
    const eventos = [
      ev(0, 'lp_page_view', '/'),
      ev(5, 'lp_page_view', '/configurar'),
      ev(9, 'lp_janela_aberta', EDITAR),
    ];
    const t = trajetoriaDaVisita(eventos, V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', 'Abriu modal de entrada']);
    expect(t.nos[0].eventos.map((e) => e.nome)).toEqual(['lp_page_view', 'lp_page_view']);
  });

  it('série nova: /configurar como 1º evento fica no nó Visitou', () => {
    const t = trajetoriaDaVisita([ev(0, 'lp_page_view', '/configurar'), ev(3, 'lp_clique_escolha_modelo', '/configurar')], V)!;
    expect(t.nos).toHaveLength(1);
    expect(t.nos[0].rotulo).toBe('Visitou');
    expect(t.nos[0].eventos).toHaveLength(2);
  });

  it('série antiga: /configurar vira o nó "Escolha do modelo"', () => {
    const antes = Date.parse('2026-11-10T10:00:00-03:00');
    const eventos = [
      { em: antes, nome: 'lp_page_view', caminho: '/', visita: V },
      { em: antes + 5000, nome: 'lp_page_view', caminho: '/configurar', visita: V },
      { em: antes + 9000, nome: 'lp_clique_escolha_modelo', caminho: '/configurar', visita: V },
    ];
    const t = trajetoriaDaVisita(eventos, V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', 'Escolha do modelo']);
    expect(t.nos[1].tipo).toBe('pagina');
  });

  it('série antiga: lp_config_started, lp_selection_completed, lp_first_edit e lp_preview_opened são marcos', () => {
    const antes = Date.parse('2026-11-10T10:00:00-03:00');
    const mk = (s: number, nome: string, caminho: string): EventoJornada => ({ em: antes + s * 1000, nome, caminho, visita: V });
    const t = trajetoriaDaVisita(
      [
        mk(0, 'lp_page_view', '/'),
        mk(1, 'lp_config_started', '/configurar'),
        mk(2, 'lp_selection_completed', '/configurar'),
        mk(3, 'lp_first_edit', EDITAR),
        mk(4, 'lp_preview_opened', PREVIA),
      ],
      V,
    )!;
    expect(t.nos.map((n) => n.rotulo)).toEqual([
      'Visitou',
      'Abriu o configurador',
      'Escolheu modelo e tema',
      'Editou',
      'Viu a página final',
    ]);
    expect(t.nos.every((n) => n.tipo === 'etapa')).toBe(true);
  });

  it('série nova: lp_first_edit e lp_preview_opened são ações, não marcos', () => {
    const t = trajetoriaDaVisita(
      [ev(0, 'lp_page_view', EDITAR), ev(4, 'lp_first_edit', EDITAR), ev(6, 'lp_preview_opened', EDITAR)],
      V,
    )!;
    expect(t.nos).toHaveLength(1);
    expect(t.nos[0].eventos.map((e) => e.tipo)).toEqual(['leitura', 'acao', 'acao']);
  });

  it('sem corte (null), a visita é da série antiga', () => {
    const t = trajetoriaDaVisita([ev(0, 'lp_page_view', '/'), ev(2, 'lp_page_view', '/configurar')], V, null)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', 'Escolha do modelo']);
  });

  it('janela reaberta depois de Descartar gera dois nós "Abriu modal de entrada"', () => {
    const t = trajetoriaDaVisita(
      [
        ev(0, 'lp_page_view', '/'),
        ev(10, 'lp_janela_aberta', EDITAR),
        ev(20, 'lp_clique_editor_descartar', EDITAR),
        ev(30, 'lp_janela_aberta', EDITAR),
      ],
      V,
    )!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', 'Abriu modal de entrada', 'Abriu modal de entrada']);
  });

  it('Prévia → Editor → Prévia gera três nós de página e o 2º Prévia tem volta', () => {
    const t = trajetoriaDaVisita(
      [
        ev(0, 'lp_page_view', '/'),
        ev(10, 'lp_clique_previa_botao', PREVIA),
        ev(20, 'lp_clique_editor_imagem', EDITAR),
        ev(30, 'lp_clique_previa_botao', PREVIA),
      ],
      V,
    )!;
    const paginas = t.nos.filter((n) => n.tipo === 'pagina');
    expect(paginas.map((n) => n.rotulo)).toEqual(['Prévia', 'Editor', 'Prévia']);
    expect(paginas.map((n) => n.volta)).toEqual([false, false, true]);
    expect(t.voltas).toBe(1);
  });

  it('visita de um só evento tem um nó com 0 s', () => {
    const t = trajetoriaDaVisita([ev(0, 'lp_page_view', '/')], V)!;
    expect(t.nos).toHaveLength(1);
    expect(t.nos[0].segundos).toBe(0);
    expect(t.duracaoMs).toBe(0);
  });
});

const ANTES_DO_CORTE = Date.parse('2026-11-10T10:00:00-03:00');

// Os marcos das duas séries, com o rótulo literal da spec (Vocabulário, "Rótulo do marco"), não o que o código monta.
const MARCOS_DA_SERIE_NOVA: Array<[string, string]> = [
  ['lp_janela_aberta', 'Abriu modal de entrada'],
  ['lp_janela_enviada', 'Enviou os dados'],
  ['lp_site_montado_ia', 'Viu o site montado'],
  ['lp_site_montado_reserva', 'Viu o site montado'],
  ['lp_site_montado_modelo_pronto', 'Viu o site montado'],
  ['lp_checkout_opened', 'Abriu a contratação'],
  ['lp_checkout_submitted', 'Enviou a contratação'],
  ['lp_checkout_succeeded', 'Contratou'],
];
const MARCOS_SO_DA_SERIE_ANTIGA: Array<[string, string]> = [
  ['lp_config_started', 'Abriu o configurador'],
  ['lp_topo_comecou', 'Começou'],
  ['lp_selection_completed', 'Escolheu modelo e tema'],
  ['lp_first_edit', 'Editou'],
  ['lp_preview_opened', 'Viu a página final'],
];

describe('trajetoriaDaVisita: todos os marcos abrem um nó de etapa (RF-JT-11, L-02)', () => {
  it.each(MARCOS_DA_SERIE_NOVA)('série nova: %s abre o nó "%s"', (nome, rotulo) => {
    const t = trajetoriaDaVisita([ev(0, 'lp_page_view', '/'), ev(10, nome, '/outro-caminho')], V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', rotulo]);
    expect(t.nos[1].tipo).toBe('etapa');
    expect(t.nos[1].eventos.map((e) => e.nome)).toEqual([nome]);
  });

  it.each([...MARCOS_DA_SERIE_NOVA, ...MARCOS_SO_DA_SERIE_ANTIGA])('série antiga: %s abre o nó "%s"', (nome, rotulo) => {
    const mk = (s: number, n: string, caminho: string): EventoJornada => ({
      em: ANTES_DO_CORTE + s * 1000,
      nome: n,
      caminho,
      visita: V,
    });
    const t = trajetoriaDaVisita([mk(0, 'lp_page_view', '/'), mk(10, nome, '/outro-caminho')], V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', rotulo]);
    expect(t.nos[1].tipo).toBe('etapa');
    expect(t.nos[1].eventos.map((e) => e.nome)).toEqual([nome]);
  });

  it.each(MARCOS_SO_DA_SERIE_ANTIGA)('série nova: %s não é marco', (nome) => {
    const t = trajetoriaDaVisita([ev(0, 'lp_page_view', '/'), ev(10, nome, '/')], V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou']);
  });
});

describe('trajetoriaDaVisita: medição de saída em outro caminho (RF-JT-13, L-01)', () => {
  // Medições que o navegador manda ao sair da página ou do campo: chegam atrasadas.
  const PASSIVAS = ['lp_campo_contratar_email', 'lp_tempo_na_pagina'];

  // Visitou(/) → Abriu modal(editor) → Prévia → Abriu modal(editor, 2ª vez) → Prévia (volta).
  // O nó atual é a segunda Prévia; os dois nós do editor são os candidatos do caminho.
  const base = [
    ev(0, 'lp_page_view', '/'),
    ev(10, 'lp_janela_aberta', EDITAR),
    ev(20, 'lp_clique_previa_botao', PREVIA),
    ev(30, 'lp_janela_aberta', EDITAR),
    ev(40, 'lp_clique_previa_botao', PREVIA),
  ];

  it.each(PASSIVAS)('%s em caminho diferente do nó atual não abre nó e entra no nó mais recente do caminho', (nome) => {
    const t = trajetoriaDaVisita([...base, ev(50, nome, EDITAR, { segundos: 5 })], V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual([
      'Visitou',
      'Abriu modal de entrada',
      'Prévia',
      'Abriu modal de entrada',
      'Prévia',
    ]);
    expect(t.nos[3].eventos.map((e) => e.nome)).toEqual(['lp_janela_aberta', nome]);
    expect(t.nos[3].eventos[1].tipo).toBe('leitura');
    expect(t.nos[1].eventos.map((e) => e.nome)).toEqual(['lp_janela_aberta']);
    expect(t.nos[4].eventos.map((e) => e.nome)).toEqual(['lp_clique_previa_botao']);
  });

  it.each(PASSIVAS)('%s em caminho sem nó não abre nó e entra no nó atual', (nome) => {
    const t = trajetoriaDaVisita([...base, ev(50, nome, '/configurar/contratar', { segundos: 5 })], V)!;
    expect(t.nos).toHaveLength(5);
    expect(t.nos[4].eventos.map((e) => e.nome)).toEqual(['lp_clique_previa_botao', nome]);
    expect(t.voltas).toBe(1);
  });
});

describe('trajetoriaDaVisita: medição de leitura em outro caminho (RF-JT-13)', () => {
  // Rolagem, seções, miniatura e token acontecem com a pessoa na página: valem como troca de página.
  const LEITURAS = ['lp_secao_depoimentos', 'lp_previa_secao_faq', 'lp_mini_hero_rolagem_50', 'lp_verificacao_token', 'lp_rolagem_75'];
  const base = [
    ev(0, 'lp_page_view', '/'),
    ev(10, 'lp_janela_aberta', EDITAR),
    ev(20, 'lp_clique_previa_botao', PREVIA),
    ev(30, 'lp_clique_previa_voltar', PREVIA),
    ev(40, 'lp_clique_editor_imagem', EDITAR),
  ];

  it.each(LEITURAS)('%s em outro caminho abre o nó da página, com tipo leitura', (nome) => {
    const t = trajetoriaDaVisita([...base, ev(50, nome, PREVIA), ev(60, 'lp_clique_previa_contratar', PREVIA)], V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', 'Abriu modal de entrada', 'Prévia', 'Editor', 'Prévia']);
    expect(t.nos[4].volta).toBe(true);
    expect(t.nos[4].eventos.map((e) => e.nome)).toEqual([nome, 'lp_clique_previa_contratar']);
    expect(t.nos[4].eventos[0].tipo).toBe('leitura');
    expect(t.nos[2].eventos.map((e) => e.nome)).toEqual(['lp_clique_previa_botao', 'lp_clique_previa_voltar']);
  });

  it('a rolagem da prévia que abre o nó não vira ação principal', () => {
    const t = trajetoriaDaVisita([...base, ev(50, 'lp_rolagem_100', PREVIA), ev(60, 'lp_clique_previa_contratar', PREVIA)], V)!;
    expect(acoesPrincipais(t.nos[4])).toEqual({ itens: [{ rotulo: 'Clicou em Contratar', tipo: 'acao' }], restantes: 0 });
  });
});

describe('trajetoriaDaVisita: segundos com floor (RF-JT-14, L-03)', () => {
  it('eventos fora do segundo inteiro arredondam para baixo, e a soma não passa de floor(duracaoMs/1000)', () => {
    const t = trajetoriaDaVisita(
      [
        { em: T0, nome: 'lp_page_view', caminho: '/', visita: V },
        { em: T0 + 1500, nome: 'lp_janela_aberta', caminho: EDITAR, visita: V },
        { em: T0 + 4499, nome: 'lp_janela_enviada', caminho: EDITAR, visita: V },
        { em: T0 + 7500, nome: 'lp_site_montado_ia', caminho: EDITAR, visita: V },
        { em: T0 + 9499, nome: 'lp_clique_editor_imagem', caminho: EDITAR, visita: V },
      ],
      V,
    )!;
    expect(t.duracaoMs).toBe(9499);
    expect(t.nos.map((n) => n.segundos)).toEqual([1, 2, 3, 1]);
    expect(t.nos.reduce((s, n) => s + n.segundos, 0)).toBeLessThanOrEqual(Math.floor(t.duracaoMs / 1000));
  });
});

describe('trajetoriaDaVisita: eventos e rolagem do nó (T03)', () => {
  it('o nó guarda o evento que o abriu e classifica erro, leitura e ação', () => {
    const t = trajetoriaDaVisita(
      [
        ev(0, 'lp_page_view', '/'),
        ev(10, 'lp_janela_aberta', EDITAR),
        ev(12, 'lp_erro_janela_nome', EDITAR),
        ev(13, 'lp_rolagem_50', EDITAR),
        ev(14, 'lp_clique_editor_imagem', EDITAR),
        ev(15, 'lp_evento_que_ninguem_conhece', EDITAR),
      ],
      V,
    )!;
    const no = t.nos[1];
    expect(no.eventos.map((e) => e.nome)).toEqual([
      'lp_janela_aberta',
      'lp_erro_janela_nome',
      'lp_rolagem_50',
      'lp_clique_editor_imagem',
      'lp_evento_que_ninguem_conhece',
    ]);
    expect(no.eventos.map((e) => e.tipo)).toEqual(['acao', 'erro', 'leitura', 'acao', 'acao']);
    expect(no.eventos[0].rotulo).toBe("Viu a janela 'Vamos montar seu site'");
    expect(no.eventos[1].rotulo).toBe('Erro: nome vazio na janela');
    expect(no.eventos[3].rotulo).toBe('Pôs ou trocou imagem');
    expect(no.eventos[4].rotulo).toBeNull();
    expect(no.eventos[3].em).toBe(T0 + 14_000);
  });

  it('o lp_page_view é leitura', () => {
    const t = trajetoriaDaVisita([ev(0, 'lp_page_view', '/')], V)!;
    expect(t.nos[0].eventos[0].tipo).toBe('leitura');
  });

  it('rolagem 100 e rolagem 25 sozinhas: o nó guarda o valor', () => {
    const cem = trajetoriaDaVisita([ev(0, 'lp_page_view', '/'), ev(5, 'lp_rolagem_100', '/')], V)!;
    expect(cem.nos[0].rolagem).toBe(100);
    const vinteECinco = trajetoriaDaVisita([ev(0, 'lp_page_view', '/'), ev(5, 'lp_rolagem_25', '/')], V)!;
    expect(vinteECinco.nos[0].rolagem).toBe(25);
  });

  it('a rolagem do nó é a maior (25 e 75 → 75)', () => {
    const t = trajetoriaDaVisita(
      [ev(0, 'lp_page_view', '/'), ev(5, 'lp_rolagem_25', '/'), ev(9, 'lp_rolagem_75', '/'), ev(11, 'lp_rolagem_50', '/')],
      V,
    )!;
    expect(t.nos[0].rolagem).toBe(75);
  });
});

describe('acoesPrincipais (T04)', () => {
  const visitaDoT04: EventoJornada[] = [
    ev(0, 'lp_page_view', EDITAR),
    ev(1, 'lp_clique_editor_imagem', EDITAR),
    ev(2, 'lp_clique_editor_imagem', EDITAR),
    ev(3, 'lp_previa_secao_faq', EDITAR),
    ev(4, 'lp_erro_editor_whatsapp', EDITAR),
    ev(5, 'lp_menu_ia', EDITAR),
    ev(6, 'lp_ia_pedido_enviado', EDITAR),
    ev(7, 'lp_ia_mudancas_aplicadas', EDITAR),
  ];

  it('erros primeiro, consecutivos juntos, corta em 3 e conta o que sobrou', () => {
    const no = trajetoriaDaVisita(visitaDoT04, V)!.nos[0];
    expect(acoesPrincipais(no)).toEqual({
      itens: [
        { rotulo: 'Erro: WhatsApp vazio', tipo: 'erro' },
        { rotulo: 'Pôs ou trocou imagem ×2', tipo: 'acao' },
        { rotulo: 'Menu: Editar com IA', tipo: 'acao' },
      ],
      restantes: 2,
    });
  });

  it('o limite é configurável', () => {
    const no = trajetoriaDaVisita(visitaDoT04, V)!.nos[0];
    const todas = acoesPrincipais(no, 10);
    expect(todas.itens).toHaveLength(5);
    expect(todas.restantes).toBe(0);
    expect(acoesPrincipais(no, 1)).toEqual({ itens: [{ rotulo: 'Erro: WhatsApp vazio', tipo: 'erro' }], restantes: 4 });
  });

  it('nó só com leitura: nada e zero restantes', () => {
    const no = trajetoriaDaVisita([ev(0, 'lp_page_view', '/'), ev(3, 'lp_rolagem_25', '/'), ev(4, 'lp_tempo_10s', '/')], V)!.nos[0];
    expect(acoesPrincipais(no)).toEqual({ itens: [], restantes: 0 });
  });

  it('o evento que abriu o nó não conta como ação', () => {
    const t = trajetoriaDaVisita([ev(0, 'lp_page_view', '/'), ev(5, 'lp_janela_aberta', EDITAR), ev(6, 'lp_clique_editor_imagem', EDITAR)], V)!;
    expect(acoesPrincipais(t.nos[1]).itens).toEqual([{ rotulo: 'Pôs ou trocou imagem', tipo: 'acao' }]);
  });

  it('nome desconhecido usa o nome cru', () => {
    const no = trajetoriaDaVisita([ev(0, 'lp_page_view', '/'), ev(2, 'lp_coisa_nova', '/')], V)!.nos[0];
    expect(acoesPrincipais(no).itens).toEqual([{ rotulo: 'lp_coisa_nova', tipo: 'acao' }]);
  });

  it('leitura entre duas ações iguais não as separa (só acao e erro são considerados)', () => {
    const no = trajetoriaDaVisita(
      [ev(0, 'lp_page_view', '/'), ev(1, 'lp_clique_editor_imagem', '/'), ev(2, 'lp_rolagem_25', '/'), ev(3, 'lp_clique_editor_imagem', '/')],
      V,
    )!.nos[0];
    expect(acoesPrincipais(no).itens).toEqual([{ rotulo: 'Pôs ou trocou imagem ×2', tipo: 'acao' }]);
  });

  it('mesmo rótulo separado por outra ação não junta', () => {
    const no = trajetoriaDaVisita(
      [ev(0, 'lp_page_view', '/'), ev(1, 'lp_clique_editor_imagem', '/'), ev(2, 'lp_menu_ia', '/'), ev(3, 'lp_clique_editor_imagem', '/')],
      V,
    )!.nos[0];
    expect(acoesPrincipais(no).itens.map((i) => i.rotulo)).toEqual([
      'Pôs ou trocou imagem',
      'Menu: Editar com IA',
      'Pôs ou trocou imagem',
    ]);
  });
});

describe('trajetoriaDaVisita: prévia logo depois da montagem (RF-JT-12a)', () => {
  const eventos: EventoJornada[] = [
    ev(0, 'lp_page_view', '/'),
    ev(48, 'lp_janela_aberta', EDITAR),
    ev(120, 'lp_janela_enviada', EDITAR),
    ev(139, 'lp_site_montado_ia', EDITAR, { segundos: 19 }),
    ev(140, 'lp_rolagem_25', PREVIA),
    ev(141, 'lp_previa_chegada_vista', PREVIA),
    ev(160, 'lp_clique_previa_voltar', PREVIA),
    ev(170, 'lp_clique_editor_imagem', EDITAR),
    ev(200, 'lp_clique_editor_previa', EDITAR),
    ev(201, 'lp_clique_previa_botao', PREVIA),
  ];

  it('a prévia que abre depois da montagem fica no nó "Viu o site montado", com o caminho da prévia', () => {
    const t = trajetoriaDaVisita(eventos, V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual([
      'Visitou', 'Abriu modal de entrada', 'Enviou os dados', 'Viu o site montado', 'Editor', 'Prévia',
    ]);
    expect(t.nos[3].caminho).toBe(PREVIA);
    expect(t.nos[3].eventos.map((e) => e.nome)).toEqual([
      'lp_site_montado_ia', 'lp_rolagem_25', 'lp_previa_chegada_vista', 'lp_clique_previa_voltar',
    ]);
    expect(t.nos[3].segundos).toBe(31);
  });

  it('a prévia aberta depois disso conta como volta', () => {
    const t = trajetoriaDaVisita(eventos, V)!;
    expect(t.nos.map((n) => n.volta)).toEqual([false, false, false, false, true, true]);
    expect(t.voltas).toBe(2);
  });

  it('sem prévia logo depois (ação no editor antes), a montagem fica no editor e a prévia abre nó', () => {
    const t = trajetoriaDaVisita([
      ev(0, 'lp_page_view', '/'),
      ev(139, 'lp_site_montado_modelo_pronto', EDITAR),
      ev(150, 'lp_clique_editor_imagem', EDITAR),
      ev(170, 'lp_clique_editor_previa', EDITAR),
      ev(171, 'lp_clique_previa_botao', PREVIA),
    ], V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual(['Visitou', 'Viu o site montado', 'Prévia']);
    expect(t.nos[1].caminho).toBe(EDITAR);
    expect(t.nos[2].volta).toBe(false);
  });
});
