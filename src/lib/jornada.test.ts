import { describe, expect, it } from 'vitest';
import type { EventoJornada, FunilJornada, VisitanteJornada } from '@/types/jornada';
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
} from './jornada';
// JSON real de GET /admin/dashboard/jornada/funil (L-071).
import fixtureFunilLeitura from '@/services/__fixtures__/funil-leitura.json';
// JSON real de GET /admin/dashboard/jornada/visitantes/{v} com segundos (CA-4-16, L-071).
import fixtureVisitanteComTempo from '@/services/__fixtures__/visitante-com-tempo.json';

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
  it('tabelas completas e na ordem da spec (37 cliques, 41 erros, 13 seções, 9 rotas)', () => {
    expect(Object.keys(TABELA_CLIQUES_CONFIGURADOR)).toHaveLength(37);
    expect(Object.keys(TABELA_ERROS)).toHaveLength(41);
    expect(Object.keys(TABELA_SECOES_PREVIA)).toHaveLength(13);
    expect(Object.entries(ROTULOS_CLIQUE_CONFIGURADOR)).toEqual(Object.entries(TABELA_CLIQUES_CONFIGURADOR));
    expect(Object.entries(ROTULOS_ERRO)).toEqual(Object.entries(TABELA_ERROS));
    expect(Object.entries(ROTULOS_SECAO_PREVIA)).toEqual(Object.entries(TABELA_SECOES_PREVIA));
    expect(Object.entries(ROTULOS_ROTA)).toEqual(Object.entries(TABELA_ROTAS));
  });

  it('cada clique vira "Clicou: <rótulo>"', () => {
    for (const [nome, rotulo] of Object.entries(TABELA_CLIQUES_CONFIGURADOR)) {
      expect(rotuloDoEvento(ev(`lp_clique_${nome}`))).toBe(`Clicou: ${rotulo}`);
    }
    expect(rotuloDoEvento(ev('lp_clique_escolha_modelo'))).toBe('Clicou: Trocou o modelo');
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
            { rotulo: 'Abriu o editor', vezes: 1 },
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
