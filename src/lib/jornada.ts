// Cálculos e rótulos da jornada do visitante (spec-2-painel, blueprint §3 e §5).
// Funções puras: a tela filtra e soma as linhas cruas da API sem nova chamada.
import type { Aparelho, FunilJornada, InstanteMs, OrigemCrua, PaginaDeEntrada } from '@/types/jornada';

export const ROTULOS_ETAPAS = [
  'Visitou',
  'Abriu o configurador',
  'Escolheu modelo e tema',
  'Editou',
  'Viu a página final',
  'Abriu a contratação',
  'Enviou a contratação',
  'Contratou',
  'Pagou',
] as const;

const ROTULOS_EVENTOS: Record<string, string> = {
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

// spec-3-leitura RF-3-14: páginas de entrada, na ordem das abas (também a do desempate).
export const ROTULOS_PAGINA: Record<PaginaDeEntrada, string> = {
  inicio: 'Início',
  saude: 'Saúde',
  crm: 'CRM',
  blog: 'Blog',
};

// RF-3-14: nome da seção (data-jornada-secao, sem "lp_secao_") → rótulo.
export const ROTULOS_SECAO: Record<string, string> = {
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

// RF-3-14: nome do clique (sem "lp_clique_") → rótulo. A ordem é a da tabela, usada no desempate.
export const ROTULOS_CLIQUE: Record<string, string> = {
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

// RF-3-05: seções na ordem da página. Saúde, CRM e Blog usam a PaginaDeProduto.
const SECOES_PRODUTO = ['caminho', 'funcoes', 'junto', 'planos', 'perguntas', 'fechamento'] as const;

export const SECOES_DA_PAGINA: Record<PaginaDeEntrada, readonly string[]> = {
  inicio: ['modelos', 'vantagens', 'como_funciona', 'planos', 'blog', 'crm', 'perguntas', 'fechamento'],
  saude: SECOES_PRODUTO,
  crm: SECOES_PRODUTO,
  blog: SECOES_PRODUTO,
};

// RF-3-14 "Botões de cada página", na ordem da tabela de cliques (a do desempate).
const BOTOES_INICIO = [
  'hero_montar', 'hero_planos', 'galeria_modelo', 'galeria_aparelho', 'galeria_montar', 'vantagens_montar',
  'plano_escolher', 'blog_conhecer', 'blog_plano', 'crm_conhecer', 'crm_plano', 'pergunta_abrir',
  'fechamento_montar', 'minha_conta', 'rodape_email', 'rodape_termos', 'rodape_privacidade', 'rodape_ajuda',
] as const;

const BOTOES_PRODUTO = [
  'hero_montar', 'hero_planos', 'plano_escolher', 'pergunta_abrir', 'fechamento_montar', 'produto_todos_planos',
  'produto_crm', 'marca', 'minha_conta', 'rodape_email', 'rodape_termos', 'rodape_privacidade', 'rodape_ajuda',
] as const;

export const BOTOES_DA_PAGINA: Record<PaginaDeEntrada, readonly string[]> = {
  inicio: BOTOES_INICIO,
  saude: BOTOES_PRODUTO,
  crm: BOTOES_PRODUTO,
  blog: BOTOES_PRODUTO,
};

// RF-3-13: linhas dos blocos "Rolagem" e "Tempo na página" (evento como vem da API, sem "lp_").
export const ROLAGEM_LEITURA: ReadonlyArray<{ evento: string; rotulo: string }> = [
  { evento: 'rolagem_25', rotulo: '25%' },
  { evento: 'rolagem_50', rotulo: '50%' },
  { evento: 'rolagem_75', rotulo: '75%' },
  { evento: 'rolagem_100', rotulo: 'Até o fim' },
];

export const TEMPO_LEITURA: ReadonlyArray<{ evento: string; rotulo: string }> = [
  { evento: 'tempo_10s', rotulo: '10 s' },
  { evento: 'tempo_30s', rotulo: '30 s' },
  { evento: 'tempo_1min', rotulo: '1 min' },
  { evento: 'tempo_3min', rotulo: '3 min' },
];

// RF-3-15: rolagem e tempo na linha do tempo do visitante.
const ROTULOS_LEITURA: Record<string, string> = {
  lp_rolagem_25: 'Rolou 25%',
  lp_rolagem_50: 'Rolou 50%',
  lp_rolagem_75: 'Rolou 75%',
  lp_rolagem_100: 'Rolou até o fim',
  lp_tempo_10s: 'Ficou 10 s',
  lp_tempo_30s: 'Ficou 30 s',
  lp_tempo_1min: 'Ficou 1 min',
  lp_tempo_3min: 'Ficou 3 min',
};

function rotuloComPrefixo(nome: string, prefixo: string, rotulos: Record<string, string>, antes: string): string | null {
  if (!nome.startsWith(prefixo)) return null;
  const chave = nome.slice(prefixo.length);
  return Object.hasOwn(rotulos, chave) ? `${antes}${rotulos[chave]}` : null;
}

// null para evento desconhecido: a tela mostra o nome cru.
export function rotuloDoEvento(nome: string): string | null {
  if (Object.hasOwn(ROTULOS_EVENTOS, nome)) return ROTULOS_EVENTOS[nome];
  if (Object.hasOwn(ROTULOS_LEITURA, nome)) return ROTULOS_LEITURA[nome];
  return (
    rotuloComPrefixo(nome, 'lp_secao_', ROTULOS_SECAO, 'Viu: ') ??
    rotuloComPrefixo(nome, 'lp_clique_', ROTULOS_CLIQUE, 'Clicou: ')
  );
}

const ROTULOS_APARELHO: Record<Aparelho, string> = {
  celular: 'Celular',
  computador: 'Computador',
};

export function rotuloDoAparelho(aparelho: Aparelho): string {
  return ROTULOS_APARELHO[aparelho];
}

// Menu "Editar" (spec-1b U1) e funil da IA (U2), na ordem do blueprint §3.3.
export const OPCOES_MENU: ReadonlyArray<{ evento: string; rotulo: string }> = [
  { evento: 'lp_menu_tema', rotulo: 'Editar tema' },
  { evento: 'lp_menu_layout', rotulo: 'Editar layout' },
  { evento: 'lp_menu_dados', rotulo: 'Dados da página' },
  { evento: 'lp_menu_buscas', rotulo: 'Buscas' },
  { evento: 'lp_menu_ia', rotulo: 'Editar com sua IA' },
  { evento: 'lp_menu_guia', rotulo: 'Como editar' },
];

export const PASSOS_IA = {
  copiou: { evento: 'lp_ia_copiou', rotulo: 'Copiou as instruções' },
  viu: { evento: 'lp_ia_viu_mudancas', rotulo: 'Viu as mudanças' },
  aplicou: { evento: 'lp_ia_aplicou', rotulo: 'Aplicou' },
  invalida: { evento: 'lp_ia_resposta_invalida', rotulo: 'Resposta não lida' },
} as const;

export type GrupoOrigem = 'google' | 'campanha' | 'site' | 'direto';

export const ROTULOS_ORIGEM: Record<GrupoOrigem, string> = {
  google: 'Anúncio do Google',
  campanha: 'Outra campanha',
  site: 'Outro site',
  direto: 'Direto',
};

export function grupoDaOrigem(origem: OrigemCrua): GrupoOrigem | null {
  if (origem === 'google_ads') return 'google';
  if (origem.startsWith('utm:')) return 'campanha';
  if (origem.startsWith('ref:')) return 'site';
  if (origem === 'direto') return 'direto';
  return null;
}

// Rótulo para a tela; uma origem fora do formato aparece crua.
export function rotuloDaOrigem(origem: OrigemCrua): string {
  const grupo = grupoDaOrigem(origem);
  return grupo ? ROTULOS_ORIGEM[grupo] : origem;
}

export interface FiltroJornada {
  origem: GrupoOrigem | 'todas';
  aparelho: Aparelho | 'todos';
}

function passa(linha: { aparelho: Aparelho; origem: OrigemCrua }, filtro: FiltroJornada): boolean {
  if (filtro.aparelho !== 'todos' && linha.aparelho !== filtro.aparelho) return false;
  if (filtro.origem !== 'todas' && grupoDaOrigem(linha.origem) !== filtro.origem) return false;
  return true;
}

// As 9 etapas: 1 a 8 vêm de `etapas`, a 9ª ("Pagou") de `pagou`.
export function calcularFunil(funil: FunilJornada, filtro: FiltroJornada): number[] {
  const valores = new Array<number>(ROTULOS_ETAPAS.length).fill(0);
  for (const linha of funil.etapas) {
    if (linha.etapa < 1 || linha.etapa > 8 || !passa(linha, filtro)) continue;
    valores[linha.etapa - 1] += linha.visitas;
  }
  for (const linha of funil.pagou) {
    if (passa(linha, filtro)) valores[8] += linha.visitas;
  }
  return valores;
}

export function calcularUso(funil: FunilJornada, filtro: FiltroJornada): Record<string, number> {
  const uso: Record<string, number> = {};
  for (const linha of funil.uso) {
    if (!passa(linha, filtro)) continue;
    uso[linha.evento] = (uso[linha.evento] ?? 0) + linha.visitas;
  }
  return uso;
}

// spec-3-leitura RF-3-13: visitas por página e evento (sem "lp_"), com os mesmos filtros.
export function calcularLeitura(
  funil: FunilJornada,
  filtro: FiltroJornada,
): Record<PaginaDeEntrada, Record<string, number>> {
  const leitura: Record<PaginaDeEntrada, Record<string, number>> = { inicio: {}, saude: {}, crm: {}, blog: {} };
  for (const linha of funil.leitura) {
    if (!Object.hasOwn(leitura, linha.pagina) || !passa(linha, filtro)) continue;
    const pagina = leitura[linha.pagina];
    pagina[linha.evento] = (pagina[linha.evento] ?? 0) + linha.visitas;
  }
  return leitura;
}

export function taxa(valor: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round((valor / base) * 100);
}

export function maiorEtapa(etapas: number[]): number | null {
  return etapas.length === 0 ? null : Math.max(...etapas);
}

// Dias no formato AAAA-MM-DD, em UTC, como os dados.
export function diaUtc(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function somarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return diaUtc(data);
}

export function periodoUtc(dias: number, agora: Date): { de: string; ate: string } {
  const ate = diaUtc(agora);
  return { de: somarDias(ate, -(dias - 1)), ate };
}

// Horários sempre em Brasília (RF-2-11), sem conta de fuso à mão.
const BRASILIA = 'America/Sao_Paulo';

const formatoHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const formatoHoraSegundos = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const formatoDiaMes = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA,
  day: 'numeric',
  month: 'numeric',
});

// O dia da lista de visitas é um dia UTC (GSI1); mostrado como está.
const formatoDia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatarHora(instante: InstanteMs): string {
  return formatoHora.format(new Date(instante));
}

export function formatarHoraComSegundos(instante: InstanteMs): string {
  return formatoHoraSegundos.format(new Date(instante));
}

// O pt-BR completa com zero ("05/11"); o blueprint mostra "5/11".
export function formatarDiaMes(instante: InstanteMs): string {
  const partes = formatoDiaMes.formatToParts(new Date(instante));
  const dia = partes.find((p) => p.type === 'day')?.value ?? '';
  const mes = partes.find((p) => p.type === 'month')?.value ?? '';
  return `${Number(dia)}/${Number(mes)}`;
}

export function formatarDia(dia: string): string {
  return formatoDia.format(new Date(`${dia}T00:00:00Z`));
}
