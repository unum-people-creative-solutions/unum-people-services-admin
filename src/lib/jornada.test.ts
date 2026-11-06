import { describe, expect, it } from 'vitest';
import type { FunilJornada } from '@/types/jornada';
import {
  ROTULOS_ETAPAS,
  rotuloDoEvento,
  rotuloDoAparelho,
  grupoDaOrigem,
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
  formatarDia,
  maiorEtapa,
  ROTULOS_PAGINA,
  ROTULOS_SECAO,
  ROTULOS_CLIQUE,
  SECOES_DA_PAGINA,
  BOTOES_DA_PAGINA,
  ROLAGEM_LEITURA,
  TEMPO_LEITURA,
  calcularLeitura,
} from './jornada';
// JSON real de GET /admin/dashboard/jornada/funil (L-071).
import fixtureFunilLeitura from '@/services/__fixtures__/funil-leitura.json';

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
      lp_editor_opened: 'Abriu o editor',
      lp_first_edit: 'Editou pela primeira vez',
      lp_preview_opened: 'Viu a página final',
      lp_checkout_opened: 'Abriu a contratação',
      lp_checkout_submitted: 'Enviou a contratação',
      lp_checkout_succeeded: 'Contratou',
      lp_menu_tema: 'Menu: Editar tema',
      lp_menu_layout: 'Menu: Editar layout',
      lp_menu_dados: 'Menu: Dados da página',
      lp_menu_buscas: 'Menu: Buscas',
      lp_menu_ia: 'Menu: Editar com sua IA',
      lp_menu_guia: 'Menu: Como editar',
      lp_ia_copiou: 'IA: copiou as instruções',
      lp_ia_viu_mudancas: 'IA: viu as mudanças',
      lp_ia_resposta_invalida: 'IA: resposta não lida',
      lp_ia_aplicou: 'IA: aplicou as mudanças',
    };
    for (const [evento, rotulo] of Object.entries(tabela)) {
      expect(rotuloDoEvento(evento)).toBe(rotulo);
    }
    expect(rotuloDoEvento('lp_desconhecido')).toBeNull();
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
    expect(ROTULOS_ORIGEM).toEqual({
      google: 'Anúncio do Google',
      campanha: 'Outra campanha',
      site: 'Outro site',
      direto: 'Direto',
    });
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

  it('formatarDia mostra o dia UTC por extenso', () => {
    expect(formatarDia('2026-11-05')).toBe('5 de nov. de 2026');
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
  produto_todos_planos: 'Plano: ver todos os planos',
  produto_crm: 'Plano: conhecer o CRM',
  marca: 'Logo',
  minha_conta: 'Minha conta',
  rodape_email: 'Rodapé: e-mail',
  rodape_termos: 'Rodapé: termos',
  rodape_privacidade: 'Rodapé: privacidade',
  rodape_ajuda: 'Rodapé: ajuda',
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
      'fechamento_montar', 'minha_conta', 'rodape_email', 'rodape_termos', 'rodape_privacidade', 'rodape_ajuda',
    ];
    const produto = [
      'hero_montar', 'hero_planos', 'plano_escolher', 'pergunta_abrir', 'fechamento_montar', 'produto_todos_planos',
      'produto_crm', 'marca', 'minha_conta', 'rodape_email', 'rodape_termos', 'rodape_privacidade', 'rodape_ajuda',
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
    expect(rotuloDoEvento('lp_rolagem_25')).toBe('Rolou 25%');
    expect(rotuloDoEvento('lp_rolagem_50')).toBe('Rolou 50%');
    expect(rotuloDoEvento('lp_rolagem_75')).toBe('Rolou 75%');
    expect(rotuloDoEvento('lp_rolagem_100')).toBe('Rolou até o fim');
    expect(rotuloDoEvento('lp_tempo_10s')).toBe('Ficou 10 s');
    expect(rotuloDoEvento('lp_tempo_30s')).toBe('Ficou 30 s');
    expect(rotuloDoEvento('lp_tempo_1min')).toBe('Ficou 1 min');
    expect(rotuloDoEvento('lp_tempo_3min')).toBe('Ficou 3 min');
  });

  it('cada seção vira "Viu: <rótulo>"', () => {
    for (const [nome, rotulo] of Object.entries(TABELA_SECOES)) {
      expect(rotuloDoEvento(`lp_secao_${nome}`)).toBe(`Viu: ${rotulo}`);
    }
  });

  it('cada clique vira "Clicou: <rótulo>"', () => {
    for (const [nome, rotulo] of Object.entries(TABELA_CLIQUES)) {
      expect(rotuloDoEvento(`lp_clique_${nome}`)).toBe(`Clicou: ${rotulo}`);
    }
  });

  it('seção, clique, rolagem ou tempo desconhecidos devolvem null', () => {
    expect(rotuloDoEvento('lp_secao_inexistente')).toBeNull();
    expect(rotuloDoEvento('lp_clique_inexistente')).toBeNull();
    expect(rotuloDoEvento('lp_secao_')).toBeNull();
    expect(rotuloDoEvento('lp_clique_toString')).toBeNull();
    expect(rotuloDoEvento('lp_rolagem_90')).toBeNull();
    expect(rotuloDoEvento('lp_tempo_5min')).toBeNull();
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
