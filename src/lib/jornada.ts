// Cálculos e rótulos da jornada do visitante (spec-2-painel, blueprint §3 e §5).
// Funções puras: a tela filtra e soma as linhas cruas da API sem nova chamada.
import type { Aparelho, EventoJornada, FunilJornada, InstanteMs, OrigemCrua, PaginaDeEntrada } from '@/types/jornada';

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

// spec-4-detalhe Vocabulário: rotas e rótulos no painel.
export const ROTULOS_ROTA: Record<string, string> = {
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

// Caminho fora da tabela aparece cru.
export function rotuloDaRota(caminho: string): string {
  return Object.hasOwn(ROTULOS_ROTA, caminho) ? ROTULOS_ROTA[caminho] : caminho;
}

// TECH-DESIGN-jornada-detalhe-da-visita §4.4: nome do clique (sem "lp_clique_") → rótulo no painel.
export const ROTULOS_CLIQUE_CONFIGURADOR: Record<string, string> = {
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

// TECH-DESIGN §4.5: nome do erro (sem "lp_erro_") → rótulo no painel. A prévia repete os do editor.
export const ROTULOS_ERRO: Record<string, string> = {
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

// spec-4-detalhe RF-4-28: seções da prévia (sem "lp_previa_secao_"), na ordem da tabela de seções.
export const ROTULOS_SECAO_PREVIA: Record<string, string> = {
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

const TEMPO_NA_PAGINA = 'lp_tempo_na_pagina';

const ROLAGEM: Record<string, 25 | 50 | 75 | 100> = {
  lp_rolagem_25: 25,
  lp_rolagem_50: 50,
  lp_rolagem_75: 75,
  lp_rolagem_100: 100,
};

// Tipo do evento para o resumo da visita (RF-4-25); o rótulo vem sem prefixo.
type TipoDoEvento = 'acao' | 'clique' | 'erro' | 'secao' | 'secao_previa';

function rotuloPorPrefixo(nome: string, prefixo: string, rotulos: Record<string, string>): string | null {
  if (!nome.startsWith(prefixo)) return null;
  const chave = nome.slice(prefixo.length);
  return Object.hasOwn(rotulos, chave) ? rotulos[chave] : null;
}

function classificar(nome: string): { tipo: TipoDoEvento; rotulo: string } | null {
  // Etapas e usos do editor; lp_page_view é a passagem, não uma ação.
  if (nome !== 'lp_page_view' && Object.hasOwn(ROTULOS_EVENTOS, nome)) {
    return { tipo: 'acao', rotulo: ROTULOS_EVENTOS[nome] };
  }
  const prefixados: Array<[TipoDoEvento, string, Record<string, string>]> = [
    ['secao', 'lp_secao_', ROTULOS_SECAO],
    ['secao_previa', 'lp_previa_secao_', ROTULOS_SECAO_PREVIA],
    ['clique', 'lp_clique_', ROTULOS_CLIQUE],
    ['clique', 'lp_clique_', ROTULOS_CLIQUE_CONFIGURADOR],
    ['erro', 'lp_erro_', ROTULOS_ERRO],
  ];
  for (const [tipo, prefixo, rotulos] of prefixados) {
    const rotulo = rotuloPorPrefixo(nome, prefixo, rotulos);
    if (rotulo !== null) return { tipo, rotulo };
  }
  return null;
}

const PREFIXO_NA_LINHA_DO_TEMPO: Record<TipoDoEvento, string> = {
  acao: '',
  clique: 'Clicou: ',
  erro: 'Erro: ',
  secao: 'Viu: ',
  secao_previa: 'Viu na prévia: ',
};

// spec-4-detalhe RF-4-28: recebe o evento inteiro (o tempo depende de segundos).
// null para evento desconhecido: a tela mostra o nome cru.
export function rotuloDoEvento(evento: EventoJornada): string | null {
  const { nome } = evento;
  if (nome === TEMPO_NA_PAGINA) {
    return evento.segundos === undefined ? null : `Ficou ${formatarDuracao(evento.segundos)} nesta página`;
  }
  if (nome === 'lp_page_view') return ROTULOS_EVENTOS[nome];
  if (Object.hasOwn(ROTULOS_LEITURA, nome)) return ROTULOS_LEITURA[nome];
  const classificado = classificar(nome);
  return classificado ? `${PREFIXO_NA_LINHA_DO_TEMPO[classificado.tipo]}${classificado.rotulo}` : null;
}

// spec-4-detalhe RF-4-26.
export function formatarDuracao(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  if (segundos < 3600) {
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;
    return resto === 0 ? `${minutos} min` : `${minutos} min ${resto} s`;
  }
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return `${horas} h ${String(minutos).padStart(2, '0')} min`;
}

export interface AcaoDaPagina {
  rotulo: string;
  vezes: number;
}

export interface PaginaDaVisita {
  caminho: string;
  passagens: number;
  segundos: number | null;
  rolagem: 25 | 50 | 75 | 100 | null;
  secoes: string[];
  acoes: AcaoDaPagina[];
  erros: string[];
}

export interface ResumoDaVisita {
  inicio: InstanteMs;
  fim: InstanteMs;
  duracaoMs: number;
  paginas: PaginaDaVisita[];
  ultimaPagina: string;
}

function emOrdem(eventos: EventoJornada[]): EventoJornada[] {
  return [...eventos].sort((a, b) => a.em - b.em);
}

// spec-4-detalhe RF-4-25: só os eventos da visita, na ordem do tempo. null se a visita não tem eventos.
export function resumirVisita(eventos: EventoJornada[], visita: string): ResumoDaVisita | null {
  const daVisita = emOrdem(eventos.filter((e) => e.visita === visita));
  if (daVisita.length === 0) return null;

  const paginas = new Map<string, PaginaDaVisita>();
  for (const evento of daVisita) {
    let pagina = paginas.get(evento.caminho);
    if (!pagina) {
      pagina = { caminho: evento.caminho, passagens: 0, segundos: null, rolagem: null, secoes: [], acoes: [], erros: [] };
      paginas.set(evento.caminho, pagina);
    }
    const { nome } = evento;
    if (nome === 'lp_page_view') {
      pagina.passagens += 1;
      continue;
    }
    if (nome === TEMPO_NA_PAGINA) {
      pagina.segundos = (pagina.segundos ?? 0) + (evento.segundos ?? 0);
      continue;
    }
    if (Object.hasOwn(ROLAGEM, nome)) {
      pagina.rolagem = Math.max(pagina.rolagem ?? 0, ROLAGEM[nome]) as PaginaDaVisita['rolagem'];
      continue;
    }
    const classificado = classificar(nome);
    if (!classificado) continue;
    const { tipo, rotulo } = classificado;
    if (tipo === 'secao' || tipo === 'secao_previa') {
      if (!pagina.secoes.includes(rotulo)) pagina.secoes.push(rotulo);
    } else if (tipo === 'erro') {
      if (!pagina.erros.includes(rotulo)) pagina.erros.push(rotulo);
    } else {
      const anterior = pagina.acoes.at(-1);
      if (anterior?.rotulo === rotulo) anterior.vezes += 1;
      else pagina.acoes.push({ rotulo, vezes: 1 });
    }
  }

  const inicio = daVisita[0].em;
  const fim = daVisita[daVisita.length - 1].em;
  return {
    inicio,
    fim,
    duracaoMs: fim - inicio,
    paginas: [...paginas.values()],
    ultimaPagina: daVisita[daVisita.length - 1].caminho,
  };
}

export interface TempoDaPagina {
  caminho: string;
  segundos: number;
  visitas: number;
}

// spec-4-detalhe RF-4-27: soma de todas as visitas, uma linha por caminho com tempo medido, na ordem da 1ª vez.
export function tempoPorPagina(eventos: EventoJornada[]): TempoDaPagina[] {
  const porCaminho = new Map<string, { segundos: number; visitas: Set<string> }>();
  for (const evento of emOrdem(eventos)) {
    if (evento.nome !== TEMPO_NA_PAGINA) continue;
    const linha = porCaminho.get(evento.caminho) ?? { segundos: 0, visitas: new Set<string>() };
    linha.segundos += evento.segundos ?? 0;
    linha.visitas.add(evento.visita);
    porCaminho.set(evento.caminho, linha);
  }
  return [...porCaminho].map(([caminho, { segundos, visitas }]) => ({ caminho, segundos, visitas: visitas.size }));
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

const UM_DIA_MS = 86_400_000;

// spec-4-detalhe RF-4-21: períodos da página Jornada, nesta ordem.
export const PERIODOS: ReadonlyArray<{ rotulo: string; ms: number }> = [
  { rotulo: '1 h', ms: 3_600_000 },
  { rotulo: '3 h', ms: 10_800_000 },
  { rotulo: '6 h', ms: 21_600_000 },
  { rotulo: '12 h', ms: 43_200_000 },
  { rotulo: '24 horas', ms: UM_DIA_MS },
  { rotulo: '3 dias', ms: 3 * UM_DIA_MS },
  { rotulo: '7 dias', ms: 7 * UM_DIA_MS },
  { rotulo: '15 dias', ms: 15 * UM_DIA_MS },
  { rotulo: '30 dias', ms: 30 * UM_DIA_MS },
];

// Janela móvel que termina agora, em ms.
export function janela(ms: number, agora: InstanteMs): { desde: InstanteMs; ate: InstanteMs } {
  return { desde: agora - ms, ate: agora };
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
