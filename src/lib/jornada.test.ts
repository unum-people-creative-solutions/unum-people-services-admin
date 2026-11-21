import { describe, expect, it } from 'vitest';
import type { EventoJornada, FunilJornada, VisitaJornada, VisitanteJornada } from '@/types/jornada';
import {
  JANELA_CONSOLIDACAO_MS,
  consolidarVisitas,
  editouAPagina,
  origemDaMontagem,
  ROTULOS_ETAPAS,
  rotuloDoEvento,
  rotuloDoAparelho,
  grupoDaOrigem,
  rotuloDaOrigem,
  ROTULOS_ORIGEM,
  calcularFunil,
  calcularUso,
  taxa,
  periodoUtc,
  diaUtc,
  somarDias,
  formatarHora,
  formatarHoraComSegundos,
  formatarDiaMes,
  maiorEtapa,
  ROTULOS_PAGINA,
  ROTULOS_SECAO,
  ROTULOS_CLIQUE,
  SECOES_DA_PAGINA,
  BOTOES_DA_PAGINA,
  ROLAGEM_LEITURA,
  TEMPO_LEITURA,
  calcularLeitura,
  PERIODOS,
  janela,
  formatarDuracao,
  ROTULOS_ROTA,
  rotuloDaRota,
  ROTULOS_CLIQUE_CONFIGURADOR,
  ROTULOS_ERRO,
  ROTULOS_SECAO_PREVIA,
  resumirVisita,
  tempoPorPagina,
  notaDaEtapa,
  DESDE_CHEGADA_NA_CONTRATACAO,
  DESDE_ENTRADA_COM_IA,
  ROTULOS_ETAPAS_ENTRADA_COM_IA,
  ETAPAS_COMPARAVEIS,
  calcularFunilEntradaComIa,
  medianaDaMontagem,
  inicioDoDiaEmBrasilia,
  dividirPelaEntradaComIa,
  compararSeries,
  calcularAoLadoEntradaComIa,
  ateOndeFoi,
  usouOEditor,
  OPCOES_MENU,
  LINHAS_DA_IA,
  eventosDaLinhaDoTempo,
} from './jornada';
// JSON real de GET /admin/dashboard/jornada/funil (L-071).
import fixtureFunilLeitura from '@/services/__fixtures__/funil-leitura.json';
// JSON real de GET /admin/dashboard/jornada/visitantes/{v} com segundos (CA-4-16, L-071).
import fixtureVisitanteComTempo from '@/services/__fixtures__/visitante-com-tempo.json';
// JSON real de GET /admin/dashboard/jornada/visitantes/{v} com os 41 nomes da A1 (TASK-BE-106/BE-204, L-071).
import fixtureVisitanteA1 from '@/services/__fixtures__/visitante-a1.json';
// Resposta do funil da A2 (configurador-com-ia spec §3.7, TASK-API-210), copiada sem edição.
import fixtureFunilA2 from '@/services/__fixtures__/funil-a2.json';

// spec-4-detalhe RF-4-28: rotuloDoEvento recebe o evento inteiro.
function ev(nome: string, extra: Partial<EventoJornada> = {}): EventoJornada {
  return { em: 0, nome, caminho: '/', visita: 'v', ...extra };
}

// spec-2-painel CA-2-07 e CA-2-10; rótulos do blueprint §5.

const funil: FunilJornada = {
  etapas: [
    { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 50 },
    { etapa: 1, aparelho: 'computador', origem: 'google_ads', visitas: 20 },
    { etapa: 1, aparelho: 'celular', origem: 'utm:instagram', visitas: 10 },
    { etapa: 1, aparelho: 'computador', origem: 'ref:www.bing.com', visitas: 15 },
    { etapa: 1, aparelho: 'celular', origem: 'direto', visitas: 25 },
    { etapa: 2, aparelho: 'celular', origem: 'google_ads', visitas: 20 },
    { etapa: 2, aparelho: 'computador', origem: 'direto', visitas: 8 },
    { etapa: 2, aparelho: 'celular', origem: 'utm:facebook', visitas: 4 },
    { etapa: 8, aparelho: 'computador', origem: 'google_ads', visitas: 3 },
  ],
  uso: [
    { evento: 'lp_menu_tema', aparelho: 'celular', origem: 'google_ads', visitas: 5 },
    { evento: 'lp_menu_tema', aparelho: 'computador', origem: 'direto', visitas: 2 },
    { evento: 'lp_ia_copiou', aparelho: 'computador', origem: 'google_ads', visitas: 4 },
  ],
  pagou: [
    { aparelho: 'computador', origem: 'google_ads', visitas: 2 },
    { aparelho: 'celular', origem: 'direto', visitas: 1 },
  ],
  leitura: [],
};

describe('rótulos', () => {
  it('as 9 etapas na ordem do blueprint', () => {
    expect(ROTULOS_ETAPAS).toEqual([
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
  });

  it('eventos da linha do tempo pela tabela do §5', () => {
    const tabela: Record<string, string> = {
      lp_page_view: 'Viu a página',
      lp_config_started: 'Abriu o configurador',
      lp_selection_completed: 'Escolheu modelo e tema',
      lp_editor_opened: 'Carregou a tela do editor',
      lp_first_edit: 'Editou pela primeira vez',
      lp_preview_opened: 'Viu a página final',
      lp_checkout_opened: 'Abriu a contratação',
      lp_checkout_submitted: 'Enviou a contratação',
      lp_checkout_succeeded: 'Contratou',
      lp_menu_tema: 'Menu: Editar tema',
      lp_menu_layout: 'Menu: Editar layout',
      lp_menu_dados: 'Menu: Dados da página',
      lp_menu_buscas: 'Menu: Buscas',
      // configurador-com-ia blueprint §9.2: "Editar com IA" e o sufixo das quatro de copiar e colar.
      lp_menu_ia: 'Menu: Editar com IA',
      lp_menu_guia: 'Menu: Como editar',
      lp_ia_copiou: 'IA: copiou as instruções (copiar e colar)',
      lp_ia_viu_mudancas: 'IA: viu as mudanças (copiar e colar)',
      lp_ia_resposta_invalida: 'IA: resposta não lida (copiar e colar)',
      lp_ia_aplicou: 'IA: aplicou as mudanças (copiar e colar)',
    };
    for (const [evento, rotulo] of Object.entries(tabela)) {
      expect(rotuloDoEvento(ev(evento))).toBe(rotulo);
    }
    expect(rotuloDoEvento(ev('lp_desconhecido'))).toBeNull();
  });

  it('aparelho', () => {
    expect(rotuloDoAparelho('celular')).toBe('Celular');
    expect(rotuloDoAparelho('computador')).toBe('Computador');
  });
});

describe('grupoDaOrigem', () => {
  it('agrupa a origem crua (blueprint §3.1)', () => {
    expect(grupoDaOrigem('google_ads')).toBe('google');
    expect(grupoDaOrigem('utm:instagram')).toBe('campanha');
    expect(grupoDaOrigem('ref:www.bing.com')).toBe('site');
    expect(grupoDaOrigem('direto')).toBe('direto');
    expect(grupoDaOrigem('outra')).toBeNull();
    // medicao-e-robustez MR-22: a ordem das chaves é a ordem do menu.
    expect(Object.entries(ROTULOS_ORIGEM)).toEqual([
      ['google', 'Anúncio do Google'],
      ['campanha', 'Outra campanha'],
      ['assinatura', 'Assinatura das páginas'],
      ['site', 'Outro site'],
      ['direto', 'Direto'],
    ]);
  });

  // medicao-e-robustez MR-22 (T23).
  it('utm:assinatura é "Assinatura das páginas"; as outras utm:* seguem "Outra campanha"', () => {
    expect(grupoDaOrigem('utm:assinatura')).toBe('assinatura');
    expect(grupoDaOrigem('utm:newsletter')).toBe('campanha');
    expect(grupoDaOrigem('utm:assinaturas')).toBe('campanha');
    expect(rotuloDaOrigem('utm:assinatura')).toBe('Assinatura das páginas');
  });
});

describe('calcularFunil', () => {
  it('sem filtro soma tudo, com Pagou na 9ª posição', () => {
    expect(calcularFunil(funil, { origem: 'todas', aparelho: 'todos' })).toEqual([120, 32, 0, 0, 0, 0, 0, 3, 3]);
  });

  it('filtra por origem', () => {
    expect(calcularFunil(funil, { origem: 'google', aparelho: 'todos' })).toEqual([70, 20, 0, 0, 0, 0, 0, 3, 2]);
    expect(calcularFunil(funil, { origem: 'campanha', aparelho: 'todos' })).toEqual([10, 4, 0, 0, 0, 0, 0, 0, 0]);
    expect(calcularFunil(funil, { origem: 'site', aparelho: 'todos' })).toEqual([15, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(calcularFunil(funil, { origem: 'direto', aparelho: 'todos' })).toEqual([25, 8, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('filtra por aparelho e combina os dois', () => {
    expect(calcularFunil(funil, { origem: 'todas', aparelho: 'celular' })).toEqual([85, 24, 0, 0, 0, 0, 0, 0, 1]);
    expect(calcularFunil(funil, { origem: 'google', aparelho: 'computador' })).toEqual([20, 0, 0, 0, 0, 0, 0, 3, 2]);
  });
});

describe('calcularUso', () => {
  it('soma por evento com os filtros', () => {
    expect(calcularUso(funil, { origem: 'todas', aparelho: 'todos' })).toEqual({ lp_menu_tema: 7, lp_ia_copiou: 4 });
    expect(calcularUso(funil, { origem: 'google', aparelho: 'todos' })).toEqual({ lp_menu_tema: 5, lp_ia_copiou: 4 });
    expect(calcularUso(funil, { origem: 'todas', aparelho: 'celular' })).toEqual({ lp_menu_tema: 5 });
  });
});

describe('taxa', () => {
  it('porcentagem arredondada, sem base devolve null', () => {
    expect(taxa(48, 120)).toBe(40);
    expect(taxa(2, 120)).toBe(2);
    expect(taxa(5, 0)).toBeNull();
  });
});

describe('datas', () => {
  it('periodoUtc: hoje e os n-1 dias anteriores, em UTC', () => {
    const agora = new Date('2026-11-05T02:00:00Z'); // 4/11 23h em Brasília
    expect(periodoUtc(7, agora)).toEqual({ de: '2026-10-30', ate: '2026-11-05' });
    expect(periodoUtc(1, agora)).toEqual({ de: '2026-11-05', ate: '2026-11-05' });
    expect(periodoUtc(30, agora)).toEqual({ de: '2026-10-07', ate: '2026-11-05' });
  });

  it('diaUtc e somarDias', () => {
    expect(diaUtc(new Date('2026-11-05T23:59:59Z'))).toBe('2026-11-05');
    expect(somarDias('2026-11-01', -1)).toBe('2026-10-31');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('CA-2-10: horários em Brasília', () => {
    // A API manda os instantes em milissegundos Unix (número), não ISO.
    expect(formatarHora(Date.UTC(2026, 10, 5, 21, 51, 8))).toBe('18:51');
    expect(formatarHoraComSegundos(Date.UTC(2026, 10, 5, 21, 51, 8))).toBe('18:51:08');
    expect(formatarDiaMes(Date.UTC(2026, 10, 6, 1, 30, 0))).toBe('5/11');
  });
});

// spec-3-leitura RF-3-14 e CA-3-15: tabelas copiadas da spec, conferidas por igualdade.
const TABELA_SECOES: Record<string, string> = {
  modelos: 'Modelos',
  vantagens: 'Vantagens',
  como_funciona: 'Como funciona',
  planos: 'Planos',
  blog: 'Blog',
  crm: 'CRM',
  perguntas: 'Perguntas frequentes',
  caminho: 'Caminho',
  funcoes: 'Funções',
  junto: 'Junto',
  fechamento: 'Fechamento',
};

const TABELA_CLIQUES: Record<string, string> = {
  hero_montar: 'Topo: botão principal',
  hero_planos: 'Topo: ver planos',
  galeria_modelo: 'Galeria: escolheu um modelo',
  galeria_aparelho: 'Galeria: trocou o aparelho',
  galeria_montar: 'Galeria: botão para montar',
  vantagens_montar: 'Vantagens: botão para montar',
  plano_escolher: 'Planos: escolheu um plano',
  blog_conhecer: 'Blog: conhecer',
  blog_plano: 'Blog: ver o plano',
  crm_conhecer: 'CRM: conhecer',
  crm_plano: 'CRM: ver o plano',
  pergunta_abrir: 'Abriu uma pergunta',
  fechamento_montar: 'Fechamento: botão principal',
  fixo_montar: 'Botão fixo (celular): montar', // OF-306
  produto_todos_planos: 'Plano: ver todos os planos',
  produto_crm: 'Plano: conhecer o CRM',
  marca: 'Logo',
  minha_conta: 'Minha conta',
  rodape_email: 'Rodapé: e-mail',
  rodape_termos: 'Rodapé: termos',
  rodape_privacidade: 'Rodapé: privacidade',
  rodape_ajuda: 'Rodapé: ajuda',
  hero_exemplo: 'Topo: tocou num exemplo', // configurador-com-ia A2 (lp_clique_hero_exemplo)
  // jornada-fluxo-atual RF-JF-07: "Continuar editando" na home com rascunho.
  hero_continuar: 'Topo: continuar editando',
  fixo_continuar: 'Botão fixo (celular): continuar editando',
};

describe('rótulos da leitura (RF-3-14)', () => {
  it('páginas na ordem das abas', () => {
    expect(Object.entries(ROTULOS_PAGINA)).toEqual([
      ['inicio', 'Início'],
      ['saude', 'Saúde'],
      ['crm', 'CRM'],
      ['blog', 'Blog'],
    ]);
  });

  it('seções e cliques pela tabela da spec, na ordem dela', () => {
    expect(Object.entries(ROTULOS_SECAO)).toEqual(Object.entries(TABELA_SECOES));
    expect(Object.entries(ROTULOS_CLIQUE)).toEqual(Object.entries(TABELA_CLIQUES));
  });

  it('seções de cada página na ordem do RF-3-05', () => {
    const produto = ['caminho', 'funcoes', 'junto', 'planos', 'perguntas', 'fechamento'];
    expect(SECOES_DA_PAGINA).toEqual({
      inicio: ['modelos', 'vantagens', 'como_funciona', 'planos', 'blog', 'crm', 'perguntas', 'fechamento'],
      saude: produto,
      crm: produto,
      blog: produto,
    });
  });

  it('botões de cada página, na ordem da tabela de cliques (desempate)', () => {
    const inicio = [
      'hero_montar', 'hero_planos', 'galeria_modelo', 'galeria_aparelho', 'galeria_montar', 'vantagens_montar',
      'plano_escolher', 'blog_conhecer', 'blog_plano', 'crm_conhecer', 'crm_plano', 'pergunta_abrir',
      'fechamento_montar', 'fixo_montar', 'minha_conta', 'rodape_email', 'rodape_termos', 'rodape_privacidade', 'rodape_ajuda',
      // jornada-fluxo-atual RF-JF-07: leitura da home (ler_inicio_clique_*), depois dos da tabela de antes.
      'hero_continuar', 'fixo_continuar',
    ];
    const produto = [
      'hero_montar', 'hero_planos', 'plano_escolher', 'pergunta_abrir', 'fechamento_montar', 'produto_todos_planos',
      'produto_crm', 'marca', 'minha_conta', 'rodape_email', 'rodape_termos', 'rodape_privacidade', 'rodape_ajuda',
      // L-02: o "Continuar editando" do topo existe também em Saúde, CRM e Blog (HeroProduto); o fixo é só da home.
      'hero_continuar',
    ];
    expect(BOTOES_DA_PAGINA).toEqual({ inicio, saude: produto, crm: produto, blog: produto });
  });

  it('linhas de rolagem e de tempo (RF-3-13)', () => {
    expect(ROLAGEM_LEITURA).toEqual([
      { evento: 'rolagem_25', rotulo: '25%' },
      { evento: 'rolagem_50', rotulo: '50%' },
      { evento: 'rolagem_75', rotulo: '75%' },
      { evento: 'rolagem_100', rotulo: 'Até o fim' },
    ]);
    expect(TEMPO_LEITURA).toEqual([
      { evento: 'tempo_10s', rotulo: '10 s' },
      { evento: 'tempo_30s', rotulo: '30 s' },
      { evento: 'tempo_1min', rotulo: '1 min' },
      { evento: 'tempo_3min', rotulo: '3 min' },
    ]);
  });
});

describe('rotuloDoEvento com a leitura (RF-3-15, CA-3-15)', () => {
  it('rolagem e tempo', () => {
    expect(rotuloDoEvento(ev('lp_rolagem_25'))).toBe('Rolou 25%');
    expect(rotuloDoEvento(ev('lp_rolagem_50'))).toBe('Rolou 50%');
    expect(rotuloDoEvento(ev('lp_rolagem_75'))).toBe('Rolou 75%');
    expect(rotuloDoEvento(ev('lp_rolagem_100'))).toBe('Rolou até o fim');
    expect(rotuloDoEvento(ev('lp_tempo_10s'))).toBe('Ficou 10 s');
    expect(rotuloDoEvento(ev('lp_tempo_30s'))).toBe('Ficou 30 s');
    expect(rotuloDoEvento(ev('lp_tempo_1min'))).toBe('Ficou 1 min');
    expect(rotuloDoEvento(ev('lp_tempo_3min'))).toBe('Ficou 3 min');
  });

  it('cada seção vira "Viu: <rótulo>"', () => {
    for (const [nome, rotulo] of Object.entries(TABELA_SECOES)) {
      expect(rotuloDoEvento(ev(`lp_secao_${nome}`))).toBe(`Viu: ${rotulo}`);
    }
  });

  it('cada clique vira "Clicou: <rótulo>"', () => {
    for (const [nome, rotulo] of Object.entries(TABELA_CLIQUES)) {
      expect(rotuloDoEvento(ev(`lp_clique_${nome}`))).toBe(`Clicou: ${rotulo}`);
    }
  });

  it('seção, clique, rolagem ou tempo desconhecidos devolvem null', () => {
    expect(rotuloDoEvento(ev('lp_secao_inexistente'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_clique_inexistente'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_secao_'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_clique_toString'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_rolagem_90'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_tempo_5min'))).toBeNull();
  });
});

describe('calcularLeitura (CA-3-14, com o JSON real)', () => {
  // O mesmo JSON.parse do lib/api.ts.
  const funilReal = JSON.parse(JSON.stringify(fixtureFunilLeitura)) as FunilJornada;

  it('sem filtro soma por página e evento', () => {
    expect(calcularLeitura(funilReal, { origem: 'todas', aparelho: 'todos' })).toEqual({
      inicio: { clique_galeria_modelo: 1, rolagem_25: 3, secao_modelos: 3, tempo_10s: 2, visita: 5 },
      saude: {
        clique_hero_montar: 2,
        clique_hero_planos: 1,
        rolagem_100: 1,
        rolagem_25: 7,
        rolagem_50: 4,
        rolagem_75: 2,
        secao_caminho: 6,
        secao_planos: 1,
        tempo_10s: 6,
        tempo_30s: 3,
        visita: 12,
      },
      crm: { clique_produto_crm: 1, rolagem_50: 1, secao_caminho: 2, tempo_30s: 1, visita: 3 },
      blog: { clique_rodape_ajuda: 1, rolagem_25: 1, secao_funcoes: 1, tempo_10s: 1, visita: 1 },
    });
  });

  it('filtra por origem e por aparelho; página sem linhas fica vazia', () => {
    const google = calcularLeitura(funilReal, { origem: 'google', aparelho: 'todos' });
    expect(google.saude.visita).toBe(10);
    expect(google.crm).toEqual({});
    expect(google.blog).toEqual({});
    expect(google.inicio.visita).toBe(5);

    expect(calcularLeitura(funilReal, { origem: 'todas', aparelho: 'computador' })).toEqual({
      inicio: {},
      saude: { visita: 2 },
      crm: { clique_produto_crm: 1, rolagem_50: 1, secao_caminho: 2, tempo_30s: 1, visita: 3 },
      blog: {},
    });

    expect(calcularLeitura(funilReal, { origem: 'direto', aparelho: 'celular' })).toEqual({
      inicio: {},
      saude: {},
      crm: {},
      blog: { clique_rodape_ajuda: 1, rolagem_25: 1, secao_funcoes: 1, tempo_10s: 1, visita: 1 },
    });
  });

  it('leitura vazia devolve as quatro páginas sem números', () => {
    expect(calcularLeitura(funil, { origem: 'todas', aparelho: 'todos' })).toEqual({
      inicio: {},
      saude: {},
      crm: {},
      blog: {},
    });
  });
});

describe('maiorEtapa', () => {
  it('a maior etapa alcançada, ou null', () => {
    expect(maiorEtapa([1, 2, 6, 3])).toBe(6);
    expect(maiorEtapa([])).toBeNull();
  });
});

// spec-4-detalhe RF-4-21: períodos, na ordem da tabela, e a janela móvel.
describe('períodos e janela (RF-4-21, CA-4-17)', () => {
  it('nove períodos, com rótulo e duração em ms, sem "Hoje"', () => {
    expect(PERIODOS).toEqual([
      { rotulo: '1 h', ms: 3_600_000 },
      { rotulo: '3 h', ms: 10_800_000 },
      { rotulo: '6 h', ms: 21_600_000 },
      { rotulo: '12 h', ms: 43_200_000 },
      { rotulo: '24 horas', ms: 86_400_000 },
      { rotulo: '3 dias', ms: 3 * 86_400_000 },
      { rotulo: '7 dias', ms: 7 * 86_400_000 },
      { rotulo: '15 dias', ms: 15 * 86_400_000 },
      { rotulo: '30 dias', ms: 30 * 86_400_000 },
    ]);
  });

  it('janela(ms, agora) = { desde: agora − ms, ate: agora }', () => {
    const agora = Date.UTC(2026, 10, 6, 17, 5, 0);
    expect(janela(86_400_000, agora)).toEqual({ desde: agora - 86_400_000, ate: agora });
    expect(janela(3_600_000, agora)).toEqual({ desde: agora - 3_600_000, ate: agora });
  });
});

// spec-4-detalhe RF-4-26, CA-4-22: igualdade exata.
describe('formatarDuracao (RF-4-26, CA-4-22)', () => {
  it('exemplos da spec', () => {
    expect(formatarDuracao(45)).toBe('45 s');
    expect(formatarDuracao(60)).toBe('1 min');
    expect(formatarDuracao(252)).toBe('4 min 12 s');
    expect(formatarDuracao(3720)).toBe('1 h 02 min');
    expect(formatarDuracao(0)).toBe('0 s');
    expect(formatarDuracao(3600)).toBe('1 h 00 min');
  });

  it('nos limites de 60 e 3 600', () => {
    expect(formatarDuracao(59)).toBe('59 s');
    expect(formatarDuracao(3599)).toBe('59 min 59 s');
  });
});

// spec-4-detalhe Vocabulário e TECH-DESIGN §4.4/§4.5/§8.1: tabelas copiadas, conferidas por igualdade.
const TABELA_ROTAS: Record<string, string> = {
  '/': 'Início',
  '/saude': 'Saúde',
  '/crm': 'CRM',
  '/blog': 'Blog',
  '/configurar': 'Escolha do modelo',
  '/configurar/editar': 'Editor',
  '/configurar/preview': 'Prévia',
  '/configurar/contratar': 'Contratação',
  '/configurar/sucesso': 'Sucesso',
};

const TABELA_CLIQUES_CONFIGURADOR: Record<string, string> = {
  escolha_guia: 'Abriu "Como funciona?"',
  escolha_modelo: 'Trocou o modelo',
  escolha_tema: 'Trocou o tema',
  escolha_botao: 'Mudou o destino do botão',
  escolha_celular: 'Viu no celular',
  escolha_computador: 'Viu no computador',
  escolha_voltar: 'Voltou para o início',
  editor_voltar: 'Voltou para a escolha do modelo',
  editor_menu: 'Abriu o menu Editar',
  editor_opcoes: 'Abriu Opções',
  editor_previa: 'Foi para a prévia',
  editor_descartar: 'Descartou o rascunho',
  editor_contratar: 'Clicou em Contratar',
  editor_imagem: 'Pôs ou trocou imagem',
  editor_imagem_remover: 'Removeu imagem',
  editor_link: 'Editou um link',
  editor_whatsapp: 'Editou o WhatsApp',
  editor_item_adicionar: 'Adicionou item',
  editor_item_remover: 'Removeu item',
  editor_secao_ocultar: 'Ocultou seção',
  editor_secao_mostrar: 'Mostrou seção',
  editor_layout_confirmar: 'Confirmou a troca de layout',
  editor_layout_cancelar: 'Desistiu da troca de layout',
  previa_voltar: 'Voltou a editar',
  previa_contratar: 'Clicou em Contratar',
  previa_botao: 'Testou um botão da página',
  contratar_plano: 'Escolheu um plano',
  contratar_periodo_mensal: 'Escolheu o período mensal', // OF-306
  contratar_periodo_anual: 'Escolheu o período anual', // OF-306
  contratar_pix: 'Escolheu Pix',
  contratar_cartao: 'Escolheu cartão',
  contratar_termo_ler: 'Abriu o Termo',
  contratar_termo_aceitar: 'Marcou o aceite do Termo',
  contratar_voltar: 'Voltou para a prévia',
  contratar_finalizar: 'Clicou em Finalizar',
  contratar_crm_planos: 'Foi ver planos com CRM',
  contratar_crm_whatsapp: 'Trocou para WhatsApp',
  sucesso_fatura: 'Abriu a fatura',
  sucesso_site: 'Abriu o site no ar',
  // configurador-com-ia A2 (tabela 2.10.1, nomes 13–15).
  montagem_tentar: 'Clicou em "Tentar com a IA"',
  editor_ia_sugestao: 'Tocou numa sugestão do Editar com IA',
  editor_ia_contratar: 'Clicou em Contratar no convite da IA',
  // jornada-fluxo-atual RF-JF-04 (nomes da tabela "Vale em" de medicao-e-robustez).
  editor_layout: 'Trocou o layout no editor',
  editor_tema: 'Trocou o tema no editor',
  editor_botao: 'Mudou o destino do botão no editor',
};

const TABELA_ERROS: Record<string, string> = {
  escolha_endereco: 'Endereço da página inválido',
  escolha_link: 'Link do botão inválido',
  editor_rascunho_incompativel: 'Rascunho descartado (versão antiga)',
  editor_rascunho_ilegivel: 'Rascunho ilegível',
  editor_imagem_nao_guardada: 'Imagem não guardada no navegador',
  editor_rascunho_nao_salvo: 'Navegador não guarda o rascunho',
  editor_imagem_grande: 'Imagem grande demais',
  editor_imagem_formato: 'Formato de imagem recusado',
  editor_imagem_processar: 'Falha ao processar a imagem',
  editor_link: 'Link inválido',
  editor_whatsapp: 'WhatsApp vazio',
  editor_texto_limite: 'Texto no limite de caracteres',
  editor_endereco: 'Endereço da página inválido',
  editor_link_botao: 'Link do botão inválido',
  editor_ia_copiar: 'IA: não copiou sozinho',
  previa_rascunho_incompativel: 'Rascunho descartado (versão antiga)',
  previa_rascunho_ilegivel: 'Rascunho ilegível',
  previa_imagem_nao_guardada: 'Imagem não guardada no navegador',
  previa_rascunho_nao_salvo: 'Navegador não guarda o rascunho',
  previa_sem_rascunho: 'Prévia sem página montada',
  contratar_negocio: 'Campo Nome do negócio',
  contratar_nome: 'Campo Seu nome',
  contratar_email: 'Campo E-mail',
  contratar_documento: 'Campo CPF ou CNPJ',
  contratar_celular: 'Campo Celular',
  contratar_nicho: 'Campo Ramo',
  contratar_cep: 'Campo CEP',
  contratar_endereco: 'Campo Endereço',
  contratar_numero: 'Campo Número',
  contratar_bairro: 'Campo Bairro',
  contratar_outro_campo: 'Outro campo',
  contratar_link_em_uso: 'Link em uso',
  contratar_link_formato: 'Link em formato inválido',
  contratar_link_verificar: 'Não conferiu o link',
  contratar_planos: 'Planos não carregaram',
  contratar_sem_planos: 'Nenhum plano disponível',
  contratar_termos: 'Faltou aceitar o Termo',
  contratar_modo_teste: 'Modo teste recusado',
  contratar_termo_atualizado: 'Termo mudou durante o preenchimento',
  contratar_falhou: 'A contratação falhou',
  contratar_sem_rascunho: 'Contratação sem página montada',
  // configurador-com-ia A2 (tabela 2.10.1, nomes 16–23; blueprint §9.3).
  janela_nome: 'nome vazio na janela',
  janela_descricao: 'descrição vazia na janela',
  montagem_prazo: 'montagem passou do prazo',
  montagem_falhou: 'montagem falhou',
  montagem_teto: 'montagem barrada pelo teto',
  montagem_verificacao: 'verificação anti-robô',
  montagem_entrada: 'dados da janela recusados',
  editor_ia_falhou: 'Editar com IA falhou',
  // ia-montagem-parcial (spec §5, RF-MP-35).
  montagem_fora_do_escopo: 'descrição recusada pela IA (voltou à janela)',
};

const TABELA_SECOES_PREVIA: Record<string, string> = {
  benefits: 'Diferenciais',
  steps: 'Passos',
  testimonials: 'Depoimentos',
  faq: 'Perguntas',
  final_cta: 'Chamada',
  location: 'Localização',
  services: 'Serviços',
  gallery: 'Galeria',
  about: 'Quem somos',
  product: 'Produto',
  event: 'Evento',
  menu: 'Cardápio',
  fees: 'Valores',
};

describe('rótulos do configurador (RF-4-28, CA-4-24)', () => {
  it('tabelas completas e na ordem da spec (45 cliques com os 2 da B1, os 3 da A2 e os 3 da gaveta de jornada-fluxo-atual, 50 erros com os 8 da A2 e o 1 de ia-montagem-parcial, 13 seções, 9 rotas)', () => {
    expect(Object.keys(TABELA_CLIQUES_CONFIGURADOR)).toHaveLength(45);
    expect(Object.keys(TABELA_ERROS)).toHaveLength(50);
    expect(Object.keys(TABELA_SECOES_PREVIA)).toHaveLength(13);
    expect(Object.entries(ROTULOS_CLIQUE_CONFIGURADOR)).toEqual(Object.entries(TABELA_CLIQUES_CONFIGURADOR));
    expect(Object.entries(ROTULOS_ERRO)).toEqual(Object.entries(TABELA_ERROS));
    expect(Object.entries(ROTULOS_SECAO_PREVIA)).toEqual(Object.entries(TABELA_SECOES_PREVIA));
    expect(Object.entries(ROTULOS_ROTA)).toEqual(Object.entries(TABELA_ROTAS));
  });

  // RF-4-28 (emenda de 06/11): o clique do configurador já descreve a ação e sai sem prefixo;
  // o da fase 3 (nome de botão) continua com "Clicou: ".
  it('cada clique do configurador vira o próprio rótulo, sem prefixo', () => {
    for (const [nome, rotulo] of Object.entries(TABELA_CLIQUES_CONFIGURADOR)) {
      expect(rotuloDoEvento(ev(`lp_clique_${nome}`))).toBe(rotulo);
    }
    expect(rotuloDoEvento(ev('lp_clique_contratar_finalizar'))).toBe('Clicou em Finalizar');
    expect(rotuloDoEvento(ev('lp_clique_escolha_modelo'))).toBe('Trocou o modelo');
    expect(rotuloDoEvento(ev('lp_clique_hero_montar'))).toBe('Clicou: Topo: botão principal');
  });

  it('cada erro vira "Erro: <rótulo>"', () => {
    for (const [nome, rotulo] of Object.entries(TABELA_ERROS)) {
      expect(rotuloDoEvento(ev(`lp_erro_${nome}`))).toBe(`Erro: ${rotulo}`);
    }
    expect(rotuloDoEvento(ev('lp_erro_editor_imagem_grande'))).toBe('Erro: Imagem grande demais');
    expect(rotuloDoEvento(ev('lp_erro_contratar_documento'))).toBe('Erro: Campo CPF ou CNPJ');
  });

  it('cada seção da prévia vira "Viu na prévia: <rótulo>"', () => {
    for (const [id, rotulo] of Object.entries(TABELA_SECOES_PREVIA)) {
      expect(rotuloDoEvento(ev(`lp_previa_secao_${id}`))).toBe(`Viu na prévia: ${rotulo}`);
    }
  });

  it('lp_tempo_na_pagina vira "Ficou <duração> nesta página"', () => {
    expect(rotuloDoEvento(ev('lp_tempo_na_pagina', { segundos: 42 }))).toBe('Ficou 42 s nesta página');
    expect(rotuloDoEvento(ev('lp_tempo_na_pagina', { segundos: 252 }))).toBe('Ficou 4 min 12 s nesta página');
  });

  it('rótulo da rota pela tabela do Vocabulário; caminho desconhecido aparece cru', () => {
    for (const [caminho, rotulo] of Object.entries(TABELA_ROTAS)) {
      expect(rotuloDaRota(caminho)).toBe(rotulo);
    }
    expect(rotuloDaRota('/minha-conta')).toBe('/minha-conta');
  });

  it('nomes desconhecidos devolvem null', () => {
    expect(rotuloDoEvento(ev('lp_erro_inexistente'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_erro_toString'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_clique_editor_inexistente'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_previa_secao_hero'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_previa_secao_header'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_previa_secao_footer'))).toBeNull();
  });
});

// spec-4-detalhe RF-4-25, CA-4-21 (cálculo).
describe('resumirVisita (RF-4-25, CA-4-21)', () => {
  const V = 'visita-1';
  const T0 = Date.UTC(2026, 10, 6, 17, 2, 0); // 14:02 em Brasília
  const s = (segundos: number) => T0 + segundos * 1000;
  const e = (seg: number, nome: string, caminho: string, extra: Partial<EventoJornada> = {}) =>
    ev(nome, { em: s(seg), caminho, visita: V, ...extra });

  // Fora de ordem de propósito: o resumo segue a ordem do tempo.
  const eventos: EventoJornada[] = [
    e(400, 'lp_page_view', '/configurar/editar'),
    e(0, 'lp_page_view', '/saude'),
    e(5, 'lp_secao_funcoes', '/saude'),
    e(6, 'lp_secao_planos', '/saude'),
    e(7, 'lp_secao_funcoes', '/saude'),
    e(8, 'lp_rolagem_25', '/saude'),
    e(9, 'lp_rolagem_75', '/saude'),
    e(10, 'lp_rolagem_50', '/saude'),
    e(11, 'lp_tempo_10s', '/saude'),
    e(12, 'lp_clique_hero_montar', '/saude'),
    e(70, 'lp_tempo_na_pagina', '/saude', { segundos: 70 }),
    e(71, 'lp_page_view', '/configurar'),
    e(72, 'lp_config_started', '/configurar'),
    e(80, 'lp_clique_escolha_modelo', '/configurar'),
    e(81, 'lp_clique_escolha_modelo', '/configurar'),
    e(82, 'lp_clique_escolha_modelo', '/configurar'),
    e(83, 'lp_clique_escolha_tema', '/configurar'),
    e(84, 'lp_clique_escolha_modelo', '/configurar'),
    e(100, 'lp_page_view', '/configurar/editar'),
    e(101, 'lp_editor_opened', '/configurar/editar'),
    e(102, 'lp_menu_tema', '/configurar/editar'),
    e(103, 'lp_erro_editor_imagem_grande', '/configurar/editar'),
    e(104, 'lp_clique_editor_imagem', '/configurar/editar'),
    e(105, 'lp_erro_editor_imagem_formato', '/configurar/editar'),
    e(106, 'lp_erro_editor_imagem_grande', '/configurar/editar'),
    e(108, 'lp_tempo_na_pagina', '/configurar/editar', { segundos: 8 }),
    e(109, 'lp_page_view', '/configurar/preview'),
    e(110, 'lp_previa_secao_services', '/configurar/preview'),
    e(111, 'lp_previa_secao_hero', '/configurar/preview'),
    e(112, 'lp_previa_secao_steps', '/configurar/preview'),
    e(412, 'lp_tempo_na_pagina', '/configurar/editar', { segundos: 12 }),
    e(413, 'lp_page_view', '/configurar/contratar'),
    e(414, 'lp_clique_contratar_pix', '/configurar/contratar'),
    e(415, 'lp_clique_contratar_finalizar', '/configurar/contratar'),
    e(416, 'lp_erro_contratar_documento', '/configurar/contratar'),
    // Outra visita: fica fora.
    ev('lp_page_view', { em: s(500), caminho: '/crm', visita: 'outra' }),
  ];

  it('período, páginas na ordem da 1ª passagem e a última página', () => {
    expect(resumirVisita(eventos, V)).toEqual({
      inicio: s(0),
      fim: s(416),
      duracaoMs: 416_000,
      ultimaPagina: '/configurar/contratar',
      paginas: [
        {
          caminho: '/saude',
          passagens: 1,
          segundos: 70,
          rolagem: 75,
          secoes: ['Funções', 'Planos'],
          acoes: [{ rotulo: 'Topo: botão principal', vezes: 1 }],
          erros: [],
        },
        {
          caminho: '/configurar',
          passagens: 1,
          segundos: null,
          rolagem: null,
          secoes: [],
          acoes: [
            { rotulo: 'Abriu o configurador', vezes: 1 },
            { rotulo: 'Trocou o modelo', vezes: 3 },
            { rotulo: 'Trocou o tema', vezes: 1 },
            { rotulo: 'Trocou o modelo', vezes: 1 },
          ],
          erros: [],
        },
        {
          caminho: '/configurar/editar',
          passagens: 2,
          segundos: 20,
          rolagem: null,
          secoes: [],
          acoes: [
            { rotulo: 'Carregou a tela do editor', vezes: 1 },
            { rotulo: 'Menu: Editar tema', vezes: 1 },
            { rotulo: 'Pôs ou trocou imagem', vezes: 1 },
          ],
          erros: ['Imagem grande demais', 'Formato de imagem recusado'],
        },
        {
          caminho: '/configurar/preview',
          passagens: 1,
          segundos: null,
          rolagem: null,
          secoes: ['Serviços', 'Passos'],
          acoes: [],
          erros: [],
        },
        {
          caminho: '/configurar/contratar',
          passagens: 1,
          segundos: null,
          rolagem: null,
          secoes: [],
          acoes: [
            { rotulo: 'Escolheu Pix', vezes: 1 },
            { rotulo: 'Clicou em Finalizar', vezes: 1 },
          ],
          erros: ['Campo CPF ou CNPJ'],
        },
      ],
    });
  });

  it('a última página é a do último evento, mesmo já vista antes', () => {
    const volta = [
      e(0, 'lp_page_view', '/configurar'),
      e(10, 'lp_page_view', '/configurar/editar'),
      e(20, 'lp_page_view', '/configurar'),
    ];
    const resumo = resumirVisita(volta, V);
    expect(resumo?.ultimaPagina).toBe('/configurar');
    expect(resumo?.paginas.map((p) => [p.caminho, p.passagens])).toEqual([
      ['/configurar', 2],
      ['/configurar/editar', 1],
    ]);
  });

  it('rolagem até o fim vale 100', () => {
    const resumo = resumirVisita([e(0, 'lp_page_view', '/'), e(1, 'lp_rolagem_100', '/'), e(2, 'lp_rolagem_25', '/')], V);
    expect(resumo?.paginas[0].rolagem).toBe(100);
  });

  it('com o JSON real da API: segundos do editor e prévia sem tempo', () => {
    const dados = JSON.parse(JSON.stringify(fixtureVisitanteComTempo)) as VisitanteJornada;
    const visita = dados.visitas[0].visita;
    expect(resumirVisita(dados.eventos, visita)).toEqual({
      inicio: 1793880000000,
      fim: 1793880043000,
      duracaoMs: 43_000,
      ultimaPagina: '/configurar/preview',
      paginas: [
        {
          caminho: '/configurar/editar',
          passagens: 1,
          segundos: 42,
          rolagem: null,
          secoes: [],
          acoes: [{ rotulo: 'Pôs ou trocou imagem', vezes: 1 }],
          erros: [],
        },
        {
          caminho: '/configurar/preview',
          passagens: 1,
          segundos: null,
          rolagem: null,
          secoes: [],
          acoes: [],
          erros: [],
        },
      ],
    });
  });
});

// spec-4-detalhe RF-4-27 (cálculo), CA-4-23.
describe('tempoPorPagina (RF-4-27)', () => {
  it('soma de todas as visitas por caminho, na ordem da 1ª vez, com o número de visitas', () => {
    const eventos: EventoJornada[] = [
      ev('lp_tempo_na_pagina', { em: 30, caminho: '/configurar', visita: 'v2', segundos: 40 }),
      ev('lp_tempo_na_pagina', { em: 10, caminho: '/configurar/editar', visita: 'v1', segundos: 8 }),
      ev('lp_page_view', { em: 5, caminho: '/saude', visita: 'v1' }),
      ev('lp_tempo_na_pagina', { em: 20, caminho: '/configurar/editar', visita: 'v1', segundos: 12 }),
      ev('lp_tempo_na_pagina', { em: 40, caminho: '/configurar/editar', visita: 'v2', segundos: 30 }),
    ];
    expect(tempoPorPagina(eventos)).toEqual([
      { caminho: '/configurar/editar', segundos: 50, visitas: 2 },
      { caminho: '/configurar', segundos: 40, visitas: 1 },
    ]);
  });
});

// medicao-e-robustez MR-25 (T26): a série de "Abriu a contratação" muda de regra na F4.
describe('notaDaEtapa (MR-25)', () => {
  it('etapa 6 com data dá a nota com o dia e o mês', () => {
    expect(notaDaEtapa(6, '2026-11-20')).toBe('conta a chegada na tela desde 20/11');
    expect(notaDaEtapa(6, '2026-12-05')).toBe('conta a chegada na tela desde 5/12');
  });

  it('outra etapa ou sem data dá null', () => {
    expect(notaDaEtapa(5, '2026-11-20')).toBeNull();
    expect(notaDaEtapa(7, '2026-11-20')).toBeNull();
    expect(notaDaEtapa(6, null)).toBeNull();
  });

  // TASK-FE-307: o lp-builder com a F4 terminou o deploy de produção em 15/11/2026 (20:10 UTC, 17:10 em Brasília).
  it('a série conta a chegada na tela desde o deploy da F4 em produção', () => {
    expect(DESDE_CHEGADA_NA_CONTRATACAO).toBe('2026-11-15');
    expect(notaDaEtapa(6, DESDE_CHEGADA_NA_CONTRATACAO)).toBe('conta a chegada na tela desde 15/11');
  });
});

// medicao-e-robustez MR-21 (T22): cópia literal da tabela da seção 1.2 do spec.md, na ordem,
// com o rótulo da tabela do MR-21. Os campos levam segundos: 12.
const NOMES_A1: ReadonlyArray<[string, string]> = [
  ['lp_carga_recarga', 'Recarregou a página'],
  ['lp_carga_voltou', 'Voltou pelo navegador'],
  ['lp_carga_descartada', 'O navegador descartou e recarregou a página'],
  ['lp_campo_contratar_link', 'Ficou 12 s no campo Seu link'],
  ['lp_campo_contratar_negocio', 'Ficou 12 s no campo Nome do negócio'],
  ['lp_campo_contratar_nome', 'Ficou 12 s no campo Seu nome'],
  ['lp_campo_contratar_email', 'Ficou 12 s no campo E-mail'],
  ['lp_campo_contratar_documento', 'Ficou 12 s no campo CPF ou CNPJ'],
  ['lp_campo_contratar_celular', 'Ficou 12 s no campo Celular'],
  ['lp_campo_contratar_nicho', 'Ficou 12 s no campo Ramo'],
  ['lp_campo_contratar_cep', 'Ficou 12 s no campo CEP'],
  ['lp_campo_contratar_endereco', 'Ficou 12 s no campo Endereço'],
  ['lp_campo_contratar_numero', 'Ficou 12 s no campo Número'],
  ['lp_campo_contratar_bairro', 'Ficou 12 s no campo Bairro'],
  ['lp_campo_contratar_complemento', 'Ficou 12 s no campo Complemento'],
  ['lp_envio_contratar_pix', 'Enviou com Pix'],
  ['lp_envio_contratar_cartao', 'Enviou com cartão'],
  ['lp_envio_contratar_plano_pagina', 'Enviou com o plano Página'],
  ['lp_envio_contratar_plano_presenca', 'Enviou com o plano Presença'],
  ['lp_envio_contratar_plano_captacao', 'Enviou com o plano Captação'],
  ['lp_envio_contratar_plano_pagina_anual', 'Enviou com o plano Página anual'],
  ['lp_envio_contratar_plano_presenca_anual', 'Enviou com o plano Presença anual'],
  ['lp_envio_contratar_plano_captacao_anual', 'Enviou com o plano Captação anual'],
  ['lp_envio_contratar_plano_outro', 'Enviou com o plano outro'],
  ['lp_sucesso_voltou', 'Voltou da fatura'],
  ['lp_sucesso_publicada', 'Viu a página no ar'],
  ['lp_mini_topo_rolagem_25', 'Rolou 25% na miniatura do topo'],
  ['lp_mini_topo_rolagem_50', 'Rolou 50% na miniatura do topo'],
  ['lp_mini_topo_rolagem_75', 'Rolou 75% na miniatura do topo'],
  ['lp_mini_topo_rolagem_100', 'Rolou até o fim na miniatura do topo'],
  ['lp_mini_topo_toque', 'Tocou na miniatura do topo'],
  ['lp_mini_galeria_rolagem_25', 'Rolou 25% na miniatura da galeria'],
  ['lp_mini_galeria_rolagem_50', 'Rolou 50% na miniatura da galeria'],
  ['lp_mini_galeria_rolagem_75', 'Rolou 75% na miniatura da galeria'],
  ['lp_mini_galeria_rolagem_100', 'Rolou até o fim na miniatura da galeria'],
  ['lp_mini_galeria_toque', 'Tocou na miniatura da galeria'],
  ['lp_mini_saude_rolagem_25', 'Rolou 25% na miniatura da Saúde'],
  ['lp_mini_saude_rolagem_50', 'Rolou 50% na miniatura da Saúde'],
  ['lp_mini_saude_rolagem_75', 'Rolou 75% na miniatura da Saúde'],
  ['lp_mini_saude_rolagem_100', 'Rolou até o fim na miniatura da Saúde'],
  ['lp_mini_saude_toque', 'Tocou na miniatura da Saúde'],
];

describe('rótulos dos 41 nomes da A1 (MR-21)', () => {
  it('a lista literal tem os 41 nomes, sem repetição', () => {
    expect(NOMES_A1).toHaveLength(41);
    expect(new Set(NOMES_A1.map(([nome]) => nome)).size).toBe(41);
  });

  it.each(NOMES_A1)('%s vira "%s"', (nome, rotulo) => {
    const segundos = nome.startsWith('lp_campo_contratar_') ? { segundos: 12 } : {};
    expect(rotuloDoEvento(ev(nome, segundos))).toBe(rotulo);
  });

  // §1.2 do spec: segundos é obrigatório nesses nomes (a API recusa sem). Sem ele não há rótulo:
  // a tela mostra o nome cru, o mesmo padrão de lp_tempo_na_pagina.
  it('campo da contratação sem segundos não ganha rótulo', () => {
    expect(rotuloDoEvento(ev('lp_campo_contratar_email'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_campo_contratar_cep'))).toBeNull();
  });

  it('a duração do campo vem de formatarDuracao', () => {
    expect(rotuloDoEvento(ev('lp_campo_contratar_email', { segundos: 12 }))).toBe('Ficou 12 s no campo E-mail');
    expect(rotuloDoEvento(ev('lp_campo_contratar_cep', { segundos: 75 }))).toBe('Ficou 1 min 15 s no campo CEP');
    expect(rotuloDoEvento(ev('lp_mini_saude_rolagem_100'))).toBe('Rolou até o fim na miniatura da Saúde');
  });

  it('nome parecido fora da lista continua null (a tela mostra cru)', () => {
    expect(rotuloDoEvento(ev('lp_campo_contratar_senha', { segundos: 12 }))).toBeNull();
    expect(rotuloDoEvento(ev('lp_envio_contratar_plano_xpto'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_mini_topo_rolagem_30'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_mini_rodape_toque'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_carga_<b>'))).toBeNull();
  });

  it('com o JSON real da API: os 41 nomes estão lá e cada um tem o rótulo da tabela', () => {
    const dados = JSON.parse(JSON.stringify(fixtureVisitanteA1)) as VisitanteJornada;
    const tabela = new Map(NOMES_A1);
    const daA1 = dados.eventos.filter((e) => tabela.has(e.nome));
    expect(new Set(daA1.map((e) => e.nome)).size).toBe(41);
    for (const evento of daA1) {
      const esperado = evento.nome.startsWith('lp_campo_contratar_')
        ? tabela.get(evento.nome)!.replace('Ficou 12 s', `Ficou ${formatarDuracao(evento.segundos!)}`)
        : tabela.get(evento.nome);
      expect(rotuloDoEvento(evento)).toBe(esperado);
    }
    const email = daA1.find((e) => e.nome === 'lp_campo_contratar_email')!;
    expect(rotuloDoEvento(email)).toBe('Ficou 12 s no campo E-mail');
  });

  it('com o JSON real da API: resumirVisita agrupa os campos como ação "Campo <campo>"', () => {
    const dados = JSON.parse(JSON.stringify(fixtureVisitanteA1)) as VisitanteJornada;
    const resumo = resumirVisita(dados.eventos, dados.visitas[0].visita)!;
    const contratar = resumo.paginas.find((p) => p.caminho === '/configurar/contratar')!;
    expect(contratar.acoes.map((a) => a.rotulo)).toEqual([
      'Abriu a contratação',
      'Campo Seu link', 'Campo Nome do negócio', 'Campo Seu nome', 'Campo E-mail', 'Campo CPF ou CNPJ',
      'Campo Celular', 'Campo Ramo', 'Campo CEP', 'Campo Endereço', 'Campo Número', 'Campo Bairro',
      'Campo Complemento',
      'Enviou com Pix', 'Enviou com cartão',
      'Enviou com o plano Página', 'Enviou com o plano Presença', 'Enviou com o plano Captação',
      'Enviou com o plano Página anual', 'Enviou com o plano Presença anual', 'Enviou com o plano Captação anual',
      'Enviou com o plano outro',
      'Enviou a contratação',
    ]);
    expect(resumo.paginas.find((p) => p.caminho === '/')!.acoes[0]).toEqual({
      rotulo: 'Rolou 25% na miniatura do topo', vezes: 1,
    });
    expect(resumo.paginas.find((p) => p.caminho === '/configurar/sucesso')!.acoes.map((a) => a.rotulo)).toEqual([
      'Voltou da fatura', 'Viu a página no ar',
    ]);
  });

  it('resumirVisita: campos viram ação "Campo <campo>" e os outros a ação com o rótulo da tabela', () => {
    const eventos: EventoJornada[] = [
      ev('lp_page_view', { em: 1, caminho: '/configurar/contratar' }),
      ev('lp_checkout_opened', { em: 2, caminho: '/configurar/contratar' }),
      ev('lp_campo_contratar_email', { em: 3, caminho: '/configurar/contratar', segundos: 12 }),
      ev('lp_campo_contratar_email', { em: 4, caminho: '/configurar/contratar', segundos: 3 }),
      ev('lp_campo_contratar_cep', { em: 5, caminho: '/configurar/contratar', segundos: 8 }),
      ev('lp_envio_contratar_plano_pagina', { em: 6, caminho: '/configurar/contratar' }),
      ev('lp_envio_contratar_pix', { em: 7, caminho: '/configurar/contratar' }),
      ev('lp_carga_recarga', { em: 8, caminho: '/configurar/contratar' }),
    ];
    const resumo = resumirVisita(eventos, 'v');
    expect(resumo?.paginas[0].acoes).toEqual([
      { rotulo: 'Abriu a contratação', vezes: 1 },
      { rotulo: 'Campo E-mail', vezes: 2 },
      { rotulo: 'Campo CEP', vezes: 1 },
      { rotulo: 'Enviou com o plano Página', vezes: 1 },
      { rotulo: 'Enviou com Pix', vezes: 1 },
      { rotulo: 'Recarregou a página', vezes: 1 },
    ]);
  });
});

// oferta-e-primeira-tela OF-306 (T33, DV-05): os três nomes novos da B1 ganham rótulo,
// senão somem da linha do tempo (rotuloDoEvento devolve null).
describe('rótulos dos três nomes da B1 (OF-306)', () => {
  it('rotuloDoEvento dá o rótulo com o prefixo de hoje da linha do tempo', () => {
    expect(rotuloDoEvento(ev('lp_clique_fixo_montar'))).toBe('Clicou: Botão fixo (celular): montar');
    expect(rotuloDoEvento(ev('lp_clique_contratar_periodo_mensal'))).toBe('Escolheu o período mensal');
    expect(rotuloDoEvento(ev('lp_clique_contratar_periodo_anual'))).toBe('Escolheu o período anual');
  });

  it('fixo_montar é botão da página inicial, logo depois de fechamento_montar', () => {
    const inicio = BOTOES_DA_PAGINA.inicio;
    expect(inicio).toContain('fixo_montar');
    expect(inicio.indexOf('fixo_montar')).toBe(inicio.indexOf('fechamento_montar') + 1);
    expect(ROTULOS_CLIQUE.fixo_montar).toBe('Botão fixo (celular): montar');
  });

  it('os dois períodos vêm logo depois de contratar_plano no configurador', () => {
    const chaves = Object.keys(ROTULOS_CLIQUE_CONFIGURADOR);
    const plano = chaves.indexOf('contratar_plano');
    expect(chaves.slice(plano, plano + 3)).toEqual(['contratar_plano', 'contratar_periodo_mensal', 'contratar_periodo_anual']);
  });
});

// configurador-com-ia TASK-ADM-303 (spec §3.7; blueprint §9.1 com D-C-01, D-C-03, D-C-28).
describe('série "Entrada com IA" (A2)', () => {
  const todos = { origem: 'todas', aparelho: 'todos' } as const;
  const funilA2 = fixtureFunilA2 as FunilJornada;

  it('DESDE_ENTRADA_COM_IA é o instante em que a flag foi ligada para todos (OPS-09, FLAG#configurador-ia atualizado_em 2026-11-17T19:28:34Z)', () => {
    expect(DESDE_ENTRADA_COM_IA).toBe('2026-11-17T16:28:34-03:00');
  });

  it('oito rótulos na sequência de RF-JF-40 (Editou e Abriu a prévia ficam ao lado)', () => {
    expect(ROTULOS_ETAPAS_ENTRADA_COM_IA).toEqual([
      'Visitou',
      'Abriu a janela no editor',
      'Enviou os dados',
      'Viu o site montado',
      'Abriu a contratação',
      'Enviou a contratação',
      'Contratou',
      'Pagou',
    ]);
  });

  it('T31 — com a fixture da A2, as oito etapas da sequência valem 1 (etapas 1, 10, 11, 12, 6 a 8 e Pagou)', () => {
    expect(calcularFunilEntradaComIa(funilA2, todos)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(calcularAoLadoEntradaComIa(funilA2, todos)).toEqual({ editou: 1, abriuAPrevia: 1 });
  });

  it('lê cada etapa do seu número e Pagou de pagou; respeita o filtro', () => {
    const f: FunilJornada = {
      etapas: [
        { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 100 },
        { etapa: 1, aparelho: 'computador', origem: 'direto', visitas: 50 },
        { etapa: 2, aparelho: 'celular', origem: 'google_ads', visitas: 99 },
        { etapa: 3, aparelho: 'celular', origem: 'google_ads', visitas: 98 },
        { etapa: 10, aparelho: 'celular', origem: 'google_ads', visitas: 80 },
        { etapa: 11, aparelho: 'celular', origem: 'google_ads', visitas: 60 },
        { etapa: 12, aparelho: 'celular', origem: 'google_ads', visitas: 55 },
        { etapa: 4, aparelho: 'celular', origem: 'google_ads', visitas: 40 },
        { etapa: 5, aparelho: 'celular', origem: 'google_ads', visitas: 20 },
        { etapa: 6, aparelho: 'celular', origem: 'google_ads', visitas: 10 },
        { etapa: 7, aparelho: 'celular', origem: 'google_ads', visitas: 5 },
        { etapa: 8, aparelho: 'celular', origem: 'google_ads', visitas: 4 },
        { etapa: 9, aparelho: 'celular', origem: 'google_ads', visitas: 3 },
      ],
      uso: [],
      pagou: [
        { aparelho: 'celular', origem: 'google_ads', visitas: 3 },
        { aparelho: 'computador', origem: 'direto', visitas: 1 },
      ],
      leitura: [],
    };
    expect(calcularFunilEntradaComIa(f, todos)).toEqual([150, 80, 60, 55, 10, 5, 4, 4]);
    expect(calcularFunilEntradaComIa(f, { origem: 'direto', aparelho: 'todos' })).toEqual([50, 0, 0, 0, 0, 0, 0, 1]);
    // RF-JF-41: Editou (4) e Abriu a prévia (5) saem da sequência e vão para o lado.
    expect(calcularAoLadoEntradaComIa(f, todos)).toEqual({ editou: 40, abriuAPrevia: 20 });
    expect(calcularAoLadoEntradaComIa(f, { origem: 'direto', aparelho: 'todos' })).toEqual({ editou: 0, abriuAPrevia: 0 });
  });

  it('calcularFunil de hoje continua com as nove etapas e ignora 10, 11 e 12', () => {
    expect(calcularFunil(funilA2, todos)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(ROTULOS_ETAPAS).toHaveLength(9);
  });

  it('medianaDaMontagem: faixas {14: 1, mais: 1} → 14 (metade arredondada para cima)', () => {
    expect(medianaDaMontagem(calcularUso(funilA2, todos))).toBe(14);
    expect(medianaDaMontagem({ lp_site_montado_s_14: 1, lp_site_montado_s_mais: 1 })).toBe(14);
  });

  it('medianaDaMontagem: sem nenhuma faixa → null; só outras chaves de uso → null', () => {
    expect(medianaDaMontagem({})).toBeNull();
    expect(medianaDaMontagem({ lp_site_montado_ia: 3, lp_topo_comecou: 2 })).toBeNull();
  });

  it('medianaDaMontagem: a faixa final devolve "mais de 30"; as faixas vão de 1 a 30', () => {
    expect(medianaDaMontagem({ lp_site_montado_s_mais: 2, lp_site_montado_s_3: 1 })).toBe('mais de 30');
    expect(medianaDaMontagem({ lp_site_montado_s_1: 1, lp_site_montado_s_30: 1, lp_site_montado_s_mais: 1 })).toBe(30);
    expect(medianaDaMontagem({ lp_site_montado_s_5: 3, lp_site_montado_s_20: 1 })).toBe(5);
    expect(medianaDaMontagem({ lp_site_montado_s_31: 4 })).toBeNull();
  });

  it('ETAPAS_COMPARAVEIS: as quatro etapas que existem nas duas séries com o mesmo sentido', () => {
    // "Viu a página final" fica de fora: na série nova a prévia abre sozinha e "Abriu a prévia" não é comparável.
    expect(ETAPAS_COMPARAVEIS).toEqual(['Visitou', 'Editou', 'Abriu a contratação', 'Pagou']);
    for (const rotulo of ETAPAS_COMPARAVEIS) {
      expect(ROTULOS_ETAPAS).toContain(rotulo);
    }
  });

  it('compararSeries: cada etapa comum em "de cada 100 visitas" de cada série', () => {
    const antiga = [200, 100, 80, 50, 30, 20, 10, 6, 4];
    const nova = [100, 70, 60, 55, 12, 8, 6, 5];
    expect(compararSeries(antiga, nova, { editou: 40, abriuAPrevia: 25 })).toEqual([
      { rotulo: 'Visitou', antiga: 100, nova: 100 },
      { rotulo: 'Editou', antiga: 25, nova: 40 },
      { rotulo: 'Abriu a contratação', antiga: 10, nova: 12 },
      { rotulo: 'Pagou', antiga: 2, nova: 5 },
    ]);
    expect(compararSeries(new Array(9).fill(0), nova, { editou: 0, abriuAPrevia: 0 })[0]).toEqual({
      rotulo: 'Visitou',
      antiga: null,
      nova: 100,
    });
  });

  it('inicioDoDiaEmBrasilia: meia-noite de Brasília (UTC−3) em ms', () => {
    expect(inicioDoDiaEmBrasilia('2026-11-20')).toBe(Date.UTC(2026, 10, 20, 3, 0, 0));
  });

  it('dividirPelaEntradaComIa: sem data, só a série antiga com a janela inteira', () => {
    expect(dividirPelaEntradaComIa(1000, 2000, null)).toEqual({ antiga: { desde: 1000, ate: 2000 }, nova: null });
  });

  it('dividirPelaEntradaComIa: janela antes, depois e cruzando a data (fim inclusivo como a API)', () => {
    const corte = inicioDoDiaEmBrasilia('2026-11-20');
    expect(dividirPelaEntradaComIa(corte - 5000, corte - 1, '2026-11-20')).toEqual({
      antiga: { desde: corte - 5000, ate: corte - 1 },
      nova: null,
    });
    expect(dividirPelaEntradaComIa(corte, corte + 5000, '2026-11-20')).toEqual({
      antiga: null,
      nova: { desde: corte, ate: corte + 5000 },
    });
    expect(dividirPelaEntradaComIa(corte - 5000, corte + 5000, '2026-11-20')).toEqual({
      antiga: { desde: corte - 5000, ate: corte - 1 },
      nova: { desde: corte, ate: corte + 5000 },
    });
  });

  it('dividirPelaEntradaComIa: com instante, corta na hora exata e não à meia-noite', () => {
    const corte = Date.UTC(2026, 10, 17, 19, 28, 34);
    const meiaNoite = inicioDoDiaEmBrasilia('2026-11-17');
    expect(dividirPelaEntradaComIa(meiaNoite - 5000, corte + 5000, '2026-11-17T16:28:34-03:00')).toEqual({
      antiga: { desde: meiaNoite - 5000, ate: corte - 1 },
      nova: { desde: corte, ate: corte + 5000 },
    });
    expect(dividirPelaEntradaComIa(meiaNoite, corte - 1, '2026-11-17T16:28:34-03:00')).toEqual({
      antiga: { desde: meiaNoite, ate: corte - 1 },
      nova: null,
    });
  });
});

// configurador-com-ia TASK-ADM-305 (blueprint §9.2 e §9.3).
describe('rótulos da A2: uso do editor e linha do tempo', () => {
  it('§9.2 — uso da IA nova e o sufixo das quatro de copiar e colar', () => {
    const tabela: Array<[string, string]> = [
      ['lp_menu_ia', 'Menu: Editar com IA'],
      ['lp_ia_pedido_enviado', 'IA: pediu mudança'],
      ['lp_ia_mudancas_vistas', 'IA: viu as mudanças'],
      ['lp_ia_sem_mudancas', 'IA: resposta sem mudança'],
      ['lp_ia_mudancas_aplicadas', 'IA: aplicou'],
      ['lp_ia_fora_do_escopo', 'IA: pedido fora do assunto'],
      ['lp_ia_convite_exibido', 'IA: viu o convite para contratar'],
      ['lp_ia_copiou', 'IA: copiou as instruções (copiar e colar)'],
      ['lp_ia_viu_mudancas', 'IA: viu as mudanças (copiar e colar)'],
      ['lp_ia_resposta_invalida', 'IA: resposta não lida (copiar e colar)'],
      ['lp_ia_aplicou', 'IA: aplicou as mudanças (copiar e colar)'],
    ];
    for (const [nome, rotulo] of tabela) expect(rotuloDoEvento(ev(nome))).toBe(rotulo);
  });

  it('§9.2 — as linhas da IA no cartão "Uso do editor", nesta ordem', () => {
    expect(LINHAS_DA_IA.map((l) => [l.evento, l.rotulo])).toEqual([
      ['lp_ia_pedido_enviado', 'IA: pediu mudança'],
      ['lp_ia_mudancas_vistas', 'IA: viu as mudanças'],
      ['lp_ia_sem_mudancas', 'IA: resposta sem mudança'],
      ['lp_ia_mudancas_aplicadas', 'IA: aplicou'],
      ['lp_ia_fora_do_escopo', 'IA: pedido fora do assunto'],
      ['lp_ia_convite_exibido', 'IA: viu o convite para contratar'],
      ['lp_ia_copiou', 'IA: copiou as instruções (copiar e colar)'],
      ['lp_ia_viu_mudancas', 'IA: viu as mudanças (copiar e colar)'],
      ['lp_ia_resposta_invalida', 'IA: resposta não lida (copiar e colar)'],
      ['lp_ia_aplicou', 'IA: aplicou as mudanças (copiar e colar)'],
    ]);
  });

  it('§9.2 — no menu "Editar", a opção da IA diz "Editar com IA"', () => {
    expect(OPCOES_MENU.find((o) => o.evento === 'lp_menu_ia')?.rotulo).toBe('Editar com IA');
  });

  it('§9.3 — etapas da entrada com IA na linha do tempo', () => {
    expect(rotuloDoEvento(ev('lp_topo_comecou', { caminho: '/' }))).toBe('Começou no topo');
    expect(rotuloDoEvento(ev('lp_janela_aberta'))).toBe("Viu a janela 'Vamos montar seu site'");
    expect(rotuloDoEvento(ev('lp_janela_enviada'))).toBe('Enviou os dados');
  });

  it('§9.3 — site montado com os segundos; sem segundos, sem rótulo (como lp_tempo_na_pagina)', () => {
    expect(rotuloDoEvento(ev('lp_site_montado_ia', { segundos: 14 }))).toBe('Viu o site montado pela IA (14 s)');
    expect(rotuloDoEvento(ev('lp_site_montado_reserva', { segundos: 31 }))).toBe('Viu o site no modelo reserva (31 s)');
    expect(rotuloDoEvento(ev('lp_site_montado_ia'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_site_montado_reserva'))).toBeNull();
  });

  it('§9.3 — erros com o prefixo de hoje', () => {
    const erros: Array<[string, string]> = [
      ['lp_erro_montagem_prazo', 'Erro: montagem passou do prazo'],
      ['lp_erro_montagem_falhou', 'Erro: montagem falhou'],
      ['lp_erro_montagem_teto', 'Erro: montagem barrada pelo teto'],
      ['lp_erro_montagem_verificacao', 'Erro: verificação anti-robô'],
      ['lp_erro_montagem_entrada', 'Erro: dados da janela recusados'],
      ['lp_erro_janela_nome', 'Erro: nome vazio na janela'],
      ['lp_erro_janela_descricao', 'Erro: descrição vazia na janela'],
      ['lp_erro_editor_ia_falhou', 'Erro: Editar com IA falhou'],
      ['lp_erro_montagem_fora_do_escopo', 'Erro: descrição recusada pela IA (voltou à janela)'],
    ];
    for (const [nome, rotulo] of erros) expect(rotuloDoEvento(ev(nome))).toBe(rotulo);
  });

  it('cliques novos: o do topo com "Clicou: ", os do configurador sem prefixo', () => {
    expect(rotuloDoEvento(ev('lp_clique_hero_exemplo', { caminho: '/' }))).toBe('Clicou: Topo: tocou num exemplo');
    expect(rotuloDoEvento(ev('lp_clique_montagem_tentar'))).toBe('Clicou em "Tentar com a IA"');
    expect(rotuloDoEvento(ev('lp_clique_editor_ia_sugestao'))).toBe('Tocou numa sugestão do Editar com IA');
    expect(rotuloDoEvento(ev('lp_clique_editor_ia_contratar'))).toBe('Clicou em Contratar no convite da IA');
  });

  it('A1 F6 — lp_sucesso_retorno_asaas vira "Voltou do Asaas"', () => {
    expect(rotuloDoEvento(ev('lp_sucesso_retorno_asaas', { caminho: '/configurar/sucesso' }))).toBe('Voltou do Asaas');
  });

  it('o resumo da visita mostra as ações novas na página delas', () => {
    const eventos: EventoJornada[] = [
      { em: 1, nome: 'lp_page_view', caminho: '/configurar/editar', visita: 'v' },
      { em: 2, nome: 'lp_janela_aberta', caminho: '/configurar/editar', visita: 'v' },
      { em: 3, nome: 'lp_erro_janela_nome', caminho: '/configurar/editar', visita: 'v' },
      { em: 4, nome: 'lp_janela_enviada', caminho: '/configurar/editar', visita: 'v' },
      { em: 5, nome: 'lp_ia_pedido_enviado', caminho: '/configurar/editar', visita: 'v' },
    ];
    const resumo = resumirVisita(eventos, 'v');
    expect(resumo?.paginas[0].acoes.map((a) => a.rotulo)).toEqual(["Viu a janela 'Vamos montar seu site'", 'Enviou os dados', 'IA: pediu mudança']);
    expect(resumo?.paginas[0].erros).toEqual(['nome vazio na janela']);
  });
});

// jornada-fluxo-atual RF-JF-44 (pedido do dono, 20/11): "Até onde foi" pela sequência da série nova.
describe('ateOndeFoi: série nova (RF-JF-44)', () => {
  const corte = '2026-11-17T16:28:34-03:00';
  const depois = Date.parse('2026-11-20T10:00:00-03:00');
  const antes = Date.parse('2026-11-15T10:00:00-03:00');

  it.each([
    // visitas reais de exemplo
    [[1, 10, 11, 12, 5], 'Viu o site montado'],
    [[1, 10, 11, 12, 6], 'Abriu a contratação'],
    [[1, 10, 11, 12, 4, 5], 'Viu o site montado'],
    [[1, 10, 11, 12, 4], 'Viu o site montado'],
    [[1, 10, 11, 12, 5, 6, 7], 'Enviou a contratação'],
    [[1, 10, 11, 12], 'Viu o site montado'],
    [[1, 10, 11], 'Enviou os dados'],
    [[1, 10], 'Abriu a janela no editor'],
    [[1], 'Visitou'],
    [[1, 2, 3], 'Escolheu modelo e tema'],
  ])('com as etapas %j, "%s"', (etapas, rotulo) => {
    expect(ateOndeFoi(etapas, depois, corte)).toBe(rotulo);
  });

  // Decisão: sem a 12 (lote recusado ou rascunho retomado), a 4 e a 5 mostram o que a pessoa fez, sem passar a 12.
  it('sem a etapa 12, "Abriu a prévia" e "Editou" aparecem pelo nome e ficam atrás de "Viu o site montado"', () => {
    expect(ateOndeFoi([1, 10, 5], depois, corte)).toBe('Abriu a prévia');
    expect(ateOndeFoi([1, 10, 11, 5], depois, corte)).toBe('Abriu a prévia');
    expect(ateOndeFoi([1, 10, 4], depois, corte)).toBe('Editou');
    expect(ateOndeFoi([1, 10, 11, 12, 5], depois, corte)).toBe('Viu o site montado');
  });

  it('visita que começou exatamente no corte é da série nova; 1 ms antes, da antiga', () => {
    const noCorte = Date.parse(corte);
    expect(ateOndeFoi([1, 10, 11, 12, 5], noCorte, corte)).toBe('Viu o site montado');
    expect(ateOndeFoi([1, 10, 11, 12, 5], noCorte - 1, corte)).toBe('Viu a página final');
  });

  it('corte só com o dia vale a meia-noite de Brasília', () => {
    expect(ateOndeFoi([1, 10, 11, 12, 5], Date.parse('2026-11-20T00:00:00-03:00'), '2026-11-20')).toBe('Viu o site montado');
    expect(ateOndeFoi([1, 10, 11, 12, 5], Date.parse('2026-11-19T23:59:59-03:00'), '2026-11-20')).toBe('Viu a página final');
  });

  it('série antiga: a ordem de hoje (Editou e Viu a página final à frente de Viu o site montado)', () => {
    expect(ateOndeFoi([1, 10, 11, 12, 5], antes, corte)).toBe('Viu a página final');
    expect(ateOndeFoi([1, 10, 11, 12, 4], antes, corte)).toBe('Editou');
    expect(ateOndeFoi([1, 10, 11, 12, 6], antes, corte)).toBe('Abriu a contratação');
    expect(ateOndeFoi([1, 2, 3], antes, corte)).toBe('Escolheu modelo e tema');
  });

  it('sem corte (null), tudo é série antiga; sem etapas, null', () => {
    expect(ateOndeFoi([1, 10, 11, 12, 5], depois, null)).toBe('Viu a página final');
    expect(ateOndeFoi([], depois, corte)).toBeNull();
  });
});

// jornada-fluxo-atual RF-JF-45: o nome da etapa 10 depende da série da visita.
describe('ateOndeFoi: nome da etapa 10 (RF-JF-45)', () => {
  const corte = '2026-11-17T16:28:34-03:00';
  const depois = Date.parse('2026-11-20T10:00:00-03:00');
  const antes = Date.parse('2026-11-15T10:00:00-03:00');

  it('série nova: "Abriu a janela no editor"; série antiga e sem corte: "Começou"', () => {
    expect(ateOndeFoi([1, 10], depois, corte)).toBe('Abriu a janela no editor');
    expect(ateOndeFoi([1, 10], antes, corte)).toBe('Começou');
    expect(ateOndeFoi([1, 10], depois, null)).toBe('Começou');
  });

  it('as etapas 11 e 12 seguem com o nome de sempre na série nova', () => {
    expect(ateOndeFoi([1, 10, 11], depois, corte)).toBe('Enviou os dados');
    expect(ateOndeFoi([1, 10, 11, 12], depois, corte)).toBe('Viu o site montado');
  });
});

// jornada-fluxo-atual RF-JF-46: /configurar só redireciona; desde o corte, sai do caminho da visita.
describe('resumirVisita: passagem por /configurar (RF-JF-46)', () => {
  const V = 'visita-1';
  const depois = Date.parse('2026-11-20T16:01:00-03:00');
  const antes = Date.parse('2026-11-15T16:01:00-03:00');
  const e = (t0: number, seg: number, nome: string, caminho: string, extra: Partial<EventoJornada> = {}) =>
    ev(nome, { em: t0 + seg * 1000, caminho, visita: V, ...extra });
  const caminhos = (r: ReturnType<typeof resumirVisita>) => r?.paginas.map((p) => p.caminho);

  const completa = (t0: number) => [
    e(t0, 0, 'lp_page_view', '/'),
    e(t0, 10, 'lp_page_view', '/configurar'),
    e(t0, 10, 'lp_tempo_na_pagina', '/configurar', { segundos: 1 }),
    e(t0, 11, 'lp_page_view', '/configurar/editar'),
    e(t0, 30, 'lp_tempo_na_pagina', '/configurar/editar', { segundos: 19 }),
  ];

  it('visita de 20/11 com /, /configurar e /configurar/editar: Início → Editor, sem a página de passagem', () => {
    const r = resumirVisita(completa(depois), V);
    expect(caminhos(r)).toEqual(['/', '/configurar/editar']);
    expect(r?.ultimaPagina).toBe('/configurar/editar');
  });

  it('visita anterior ao corte fica como estava, com /configurar', () => {
    expect(caminhos(resumirVisita(completa(antes), V))).toEqual(['/', '/configurar', '/configurar/editar']);
  });

  it('visita que começou exatamente no corte é da série nova', () => {
    const noCorte = Date.parse(DESDE_ENTRADA_COM_IA as string);
    expect(caminhos(resumirVisita(completa(noCorte), V))).toEqual(['/', '/configurar/editar']);
  });

  it('só /configurar/editar e outras rotas /configurar/* não são escondidas', () => {
    const r = resumirVisita([e(depois, 0, 'lp_page_view', '/configurar/preview'), e(depois, 1, 'lp_page_view', '/configurar/contratar')], V);
    expect(caminhos(r)).toEqual(['/configurar/preview', '/configurar/contratar']);
  });

  // Decisão: a visita nunca fica sem destino; a passagem aparece quando é a única ou a última página.
  it('se /configurar é a única página, ela aparece', () => {
    expect(caminhos(resumirVisita([e(depois, 0, 'lp_page_view', '/configurar')], V))).toEqual(['/configurar']);
  });

  it('se /configurar é a última página, ela aparece com "saiu aqui"', () => {
    const r = resumirVisita([e(depois, 0, 'lp_page_view', '/'), e(depois, 5, 'lp_page_view', '/configurar')], V);
    expect(caminhos(r)).toEqual(['/', '/configurar']);
    expect(r?.ultimaPagina).toBe('/configurar');
  });
});

// jornada-fluxo-atual RF-JF-43: rótulos em português dos eventos novos na linha do tempo da visita.
describe('rótulos dos eventos novos (RF-JF-43)', () => {
  const evento = (nome: string, extra: Partial<EventoJornada> = {}): EventoJornada =>
    ({ visita: 'v', caminho: '/', em: 1, nome, ...extra }) as EventoJornada;

  it.each([
    ['lp_clique_editor_layout', 'Trocou o layout no editor'],
    ['lp_clique_editor_tema', 'Trocou o tema no editor'],
    ['lp_clique_editor_botao', 'Mudou o destino do botão no editor'],
    ['lp_site_montado_modelo_pronto', 'Viu o site montado com um modelo pronto'],
    ['lp_previa_chegada_vista', 'Viu o aviso de chegada na prévia'],
    ['lp_previa_chegada_fechada', 'Fechou o aviso de chegada na prévia'],
    ['lp_editor_aviso_edicao_visto', 'Viu o aviso da primeira edição'],
    ['lp_editor_aviso_edicao_fechado', 'Fechou o aviso da primeira edição'],
    ['lp_clique_hero_continuar', 'Clicou: Topo: continuar editando'],
    ['lp_clique_fixo_continuar', 'Clicou: Botão fixo (celular): continuar editando'],
    ['lp_rascunho_troca_aberta', 'Rascunho: viu a confirmação de troca'],
    ['lp_rascunho_troca_continuar', 'Rascunho: escolheu continuar o atual'],
    ['lp_rascunho_troca_outra', 'Rascunho: escolheu começar outra página'],
    ['lp_verificacao_interacao_pedida', 'Verificação anti-robô: pediu interação'],
    ['lp_verificacao_liberada', 'Verificação anti-robô: liberou'],
  ])('%s → "%s"', (nome, rotulo) => {
    expect(rotuloDoEvento(evento(nome))).toBe(rotulo);
  });

  it('"modelo pronto" não leva segundos (RF-JF-05) e não conta como uso do editor', () => {
    expect(rotuloDoEvento(evento('lp_site_montado_modelo_pronto'))).not.toBeNull();
    expect(usouOEditor(['lp_site_montado_modelo_pronto'])).toBe(false);
  });
});

// jornada-fluxo-atual RF-JF-47 (dono, 20/11): "Só o que a pessoa viu" — a janela e a tela do editor são uma linha só.
describe('janela depois do editor: uma linha só (RF-JF-47)', () => {
  const V = 'visita-janela';
  const EDITAR = '/configurar/editar';
  const JANELA = "Viu a janela 'Vamos montar seu site'";
  const t0 = Date.parse('2026-11-20T16:01:44-03:00');
  const e = (seg: number, nome: string, extra: Partial<EventoJornada> = {}) =>
    ev(nome, { em: t0 + seg * 1000, caminho: EDITAR, visita: V, ...extra });
  const rotulos = (eventos: EventoJornada[]) => eventosDaLinhaDoTempo(eventos).map((x) => rotuloDoEvento(x));

  // Visita real de 20/11, 16:01:44 a 16:01:49.
  const real = (): EventoJornada[] => [
    e(0, 'lp_page_view'),
    e(1, 'lp_rolagem_25'),
    e(2, 'lp_rolagem_50'),
    e(3, 'lp_rolagem_75'),
    e(4, 'lp_rolagem_100'),
    e(4, 'lp_editor_opened'),
    e(5, 'lp_janela_aberta'),
    e(5, 'lp_tempo_na_pagina', { segundos: 4 }),
  ];

  it('caso real: a linha única leva o rótulo novo e o horário da janela; as rolagens e o tempo ficam', () => {
    const linhas = eventosDaLinhaDoTempo(real());
    expect(linhas.map((x) => rotuloDoEvento(x))).toEqual([
      'Viu a página',
      'Rolou 25%',
      'Rolou 50%',
      'Rolou 75%',
      'Rolou até o fim',
      JANELA,
      'Ficou 4 s nesta página',
    ]);
    expect(linhas.find((x) => rotuloDoEvento(x) === JANELA)?.em).toBe(t0 + 5000);
  });

  it('sem janela em seguida (retomar rascunho), continua "Carregou a tela do editor"', () => {
    const eventos = [e(0, 'lp_page_view'), e(1, 'lp_editor_opened'), e(5, 'lp_tempo_na_pagina', { segundos: 4 })];
    expect(rotulos(eventos)).toEqual(['Viu a página', 'Carregou a tela do editor', 'Ficou 4 s nesta página']);
  });

  it('janela sozinha usa o rótulo novo', () => {
    expect(rotulos([e(0, 'lp_page_view'), e(1, 'lp_janela_aberta')])).toEqual(['Viu a página', JANELA]);
  });

  it('outro evento de ação entre os dois mantém as duas linhas', () => {
    const eventos = [e(0, 'lp_editor_opened'), e(1, 'lp_menu_tema'), e(2, 'lp_janela_aberta')];
    expect(rotulos(eventos)).toEqual(['Carregou a tela do editor', 'Menu: Editar tema', JANELA]);
  });

  it('outra passagem (lp_page_view) ou outro caminho entre os dois mantém as duas linhas', () => {
    expect(rotulos([e(0, 'lp_editor_opened'), e(1, 'lp_page_view'), e(2, 'lp_janela_aberta')])).toEqual([
      'Carregou a tela do editor',
      'Viu a página',
      JANELA,
    ]);
    expect(rotulos([e(0, 'lp_editor_opened'), e(1, 'lp_janela_aberta', { caminho: '/' })])).toEqual([
      'Carregou a tela do editor',
      JANELA,
    ]);
  });

  it('duas passagens pelo editor: cada janela absorve o editor da sua passagem', () => {
    const eventos = [
      e(0, 'lp_editor_opened'),
      e(1, 'lp_janela_aberta'),
      e(10, 'lp_page_view'),
      e(11, 'lp_editor_opened'),
    ];
    expect(rotulos(eventos)).toEqual([JANELA, 'Viu a página', 'Carregou a tela do editor']);
  });

  it('não muda a lista recebida nem as visitas sem os dois eventos', () => {
    const eventos = real();
    const copia = structuredClone(eventos);
    eventosDaLinhaDoTempo(eventos);
    expect(eventos).toEqual(copia);
    const sem = [e(0, 'lp_page_view'), e(1, 'lp_menu_tema')];
    expect(eventosDaLinhaDoTempo(sem)).toEqual(sem);
  });

  it('resumo da visita: a ação é só a janela, sem "Carregou a tela do editor"', () => {
    const resumo = resumirVisita(real(), V);
    expect(resumo?.paginas[0].acoes).toEqual([{ rotulo: JANELA, vezes: 1 }]);
    expect(resumo?.paginas[0].rolagem).toBe(100);
    expect(resumo?.paginas[0].segundos).toBe(4);
  });

  it('resumo da visita: sem janela em seguida, a ação é "Carregou a tela do editor"', () => {
    const resumo = resumirVisita([e(0, 'lp_page_view'), e(1, 'lp_editor_opened')], V);
    expect(resumo?.paginas[0].acoes).toEqual([{ rotulo: 'Carregou a tela do editor', vezes: 1 }]);
  });
});

// jornada-higiene-e-qualidade (RF-JH-20, RF-JH-22, RF-JH-23, RF-JH-24; CA-JH-20).
describe('consolidarVisitas, origemDaMontagem, editouAPagina e resumirVisita multi-visita (RF-JH-20..24)', () => {
  const MIN = 60_000;
  const T0 = Date.UTC(2026, 10, 20, 13, 0, 0);
  const vBase = (over: Partial<VisitaJornada>): VisitaJornada => ({
    visitante: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    visita: 'v1',
    inicio: T0,
    fim: T0 + MIN,
    aparelho: 'celular',
    origem: 'google_ads',
    paginas: 1,
    etapas: [1],
    usos: [],
    teste: false,
    ...over,
  });

  it('CA-JH-20 — funde aberturas do mesmo visitante em janela deslizante <= 30 min e separa > 30 min e teste', () => {
    expect(JANELA_CONSOLIDACAO_MS).toBe(30 * MIN);
    const v1 = vBase({
      visita: 'v1', inicio: T0, fim: T0 + 2 * MIN, paginas: 2,
      aparelho: 'celular', origem: 'google_ads', campanha: 'pagina', termo: 'site',
      etapas: [1, 10], usos: ['lp_topo_comecou'],
    });
    const v2 = vBase({
      visita: 'v2', inicio: T0 + 4 * MIN, fim: T0 + 5 * MIN, paginas: 3,
      aparelho: 'celular', origem: 'direto',
      etapas: [1, 10, 11, 12], usos: ['lp_site_montado_ia'],
    });
    // Gap exato de 30 min a partir de v2.fim -> ainda consolida.
    const v3 = vBase({
      visita: 'v3', inicio: T0 + 35 * MIN, fim: T0 + 36 * MIN, paginas: 1,
      aparelho: 'computador', origem: 'direto',
      etapas: [1, 4], usos: ['lp_menu_tema', 'lp_site_montado_ia'],
    });
    // Visita de teste 1 min depois de v1: nunca funde com real.
    const vTeste = vBase({
      visita: 'vt', inicio: T0 + 3 * MIN, fim: T0 + 3 * MIN + 10_000, paginas: 1, teste: true,
    });
    // Gap de 30 min + 1 ms a partir de v3.fim -> sessão separada.
    const v4 = vBase({
      visita: 'v4', inicio: T0 + 66 * MIN + 1, fim: T0 + 67 * MIN, paginas: 2, etapas: [1],
    });

    const out = consolidarVisitas([v4, v3, vTeste, v2, v1]);
    expect(out).toHaveLength(3);
    // Ordenado por inicio decrescente: v4, vTeste, consolidada(v1+v2+v3).
    expect(out[0].visita).toBe('v4');
    expect(out[0].visitasAgrupadas).toEqual(['v4']);
    expect(out[1].visita).toBe('vt');
    expect(out[1].teste).toBe(true);
    expect(out[2]).toMatchObject({
      visita: 'v1',
      inicio: T0,
      fim: T0 + 36 * MIN,
      paginas: 6,
      aparelho: 'celular',
      origem: 'google_ads',
      campanha: 'pagina',
      termo: 'site',
      etapas: [1, 10, 11, 12, 4],
      usos: ['lp_topo_comecou', 'lp_site_montado_ia', 'lp_menu_tema'],
      visitasAgrupadas: ['v1', 'v2', 'v3'],
    });
  });

  it('CA-JH-20 — resumirVisita aceita múltiplas visitas agrupadas e une eventos em ordem cronológica', () => {
    const eventos: EventoJornada[] = [
      { em: T0 + 10_000, nome: 'lp_page_view', caminho: '/configurar/editar', visita: 'v2' },
      { em: T0, nome: 'lp_page_view', caminho: '/', visita: 'v1' },
      { em: T0 + 20_000, nome: 'lp_page_view', caminho: '/configurar/contratar', visita: 'v3' },
      { em: T0 + 30_000, nome: 'lp_page_view', caminho: '/crm', visita: 'outra' },
    ];
    const resumo = resumirVisita(eventos, ['v1', 'v2', 'v3']);
    expect(resumo?.inicio).toBe(T0);
    expect(resumo?.fim).toBe(T0 + 20_000);
    expect(resumo?.ultimaPagina).toBe('/configurar/contratar');
    expect(resumo?.paginas.map((p) => p.caminho)).toEqual(['/', '/configurar/editar', '/configurar/contratar']);
  });

  it('RF-JH-23 — origemDaMontagem classifica IA, modelo pronto, reserva e null com prioridade determinística', () => {
    expect(origemDaMontagem([])).toBeNull();
    expect(origemDaMontagem(['lp_topo_comecou', 'lp_menu_tema'])).toBeNull();
    expect(origemDaMontagem(['lp_site_montado_reserva'])).toBe('reserva');
    expect(origemDaMontagem(['lp_site_montado_modelo_pronto'])).toBe('modelo_pronto');
    expect(origemDaMontagem(['lp_site_montado_reserva', 'lp_site_montado_modelo_pronto'])).toBe('modelo_pronto');
    expect(origemDaMontagem(['lp_site_montado_reserva', 'lp_site_montado_ia'])).toBe('ia');
  });

  it('RF-JH-24 — editouAPagina detecta etapa 4', () => {
    expect(editouAPagina([1, 10, 11, 12])).toBe(false);
    expect(editouAPagina([1, 10, 11, 12, 4])).toBe(true);
  });
});
