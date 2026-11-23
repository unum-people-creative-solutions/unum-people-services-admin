// Cálculos e rótulos da jornada do visitante (spec-2-painel, blueprint §3 e §5).
// Funções puras: a tela filtra e soma as linhas cruas da API sem nova chamada.
import type {
  Aparelho,
  EventoJornada,
  FunilJornada,
  InstanteMs,
  OrigemCrua,
  PaginaDeEntrada,
  VisitaJornada,
} from '@/types/jornada';

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

// medicao-e-robustez MR-25 (divergência D6): dia (AAAA-MM-DD, Brasília) em que "Abriu a contratação"
// passou a contar a chegada na tela (lp-builder F4 em produção). Preenchido na TASK-FE-307: deploy de
// produção do lp-builder terminou em 15/11/2026 às 17:10 de Brasília (lp-builder #221).
export const DESDE_CHEGADA_NA_CONTRATACAO: string | null = '2026-11-15';

const ETAPA_ABRIU_A_CONTRATACAO = 6;

// MR-25: nota junto do rótulo da etapa 6; null em qualquer outro caso.
export function notaDaEtapa(etapa: number, desde: string | null): string | null {
  if (etapa !== ETAPA_ABRIU_A_CONTRATACAO || desde === null) return null;
  const [, mes, dia] = desde.split('-');
  return `conta a chegada na tela desde ${Number(dia)}/${Number(mes)}`;
}

const ROTULOS_EVENTOS: Record<string, string> = {
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
  // configurador-com-ia blueprint §9.2: "Editar com IA" e, nas quatro de copiar e colar, o sufixo.
  lp_menu_ia: 'Menu: Editar com IA',
  lp_menu_guia: 'Menu: Como editar',
  lp_ia_pedido_enviado: 'IA: pediu mudança',
  lp_ia_mudancas_vistas: 'IA: viu as mudanças',
  lp_ia_sem_mudancas: 'IA: resposta sem mudança',
  lp_ia_mudancas_aplicadas: 'IA: aplicou',
  lp_ia_fora_do_escopo: 'IA: pedido fora do assunto',
  lp_ia_convite_exibido: 'IA: viu o convite para contratar',
  lp_ia_tema_aplicado: 'IA: trocou as cores',
  lp_ia_secao_aplicada: 'IA: adicionou seção',
  lp_ia_copiou: 'IA: copiou as instruções (copiar e colar)',
  lp_ia_viu_mudancas: 'IA: viu as mudanças (copiar e colar)',
  lp_ia_resposta_invalida: 'IA: resposta não lida (copiar e colar)',
  lp_ia_aplicou: 'IA: aplicou as mudanças (copiar e colar)',
  // Blueprint §9.3: etapas da entrada com IA (os dois "site montado" levam os segundos, abaixo).
  lp_topo_comecou: 'Começou no topo',
  lp_janela_aberta: "Viu a janela 'Vamos montar seu site'",
  lp_janela_enviada: 'Enviou os dados',
  // jornada-fluxo-atual RF-JF-05/06/07/08 (RF-JF-43): passos novos, nomes da tabela "Vale em".
  lp_site_montado_modelo_pronto: 'Viu o site montado com um modelo pronto',
  lp_previa_chegada_vista: 'Viu o aviso de chegada na prévia',
  lp_previa_chegada_fechada: 'Fechou o aviso de chegada na prévia',
  lp_editor_aviso_edicao_visto: 'Viu o aviso da primeira edição',
  lp_editor_aviso_edicao_fechado: 'Fechou o aviso da primeira edição',
  lp_rascunho_troca_aberta: 'Rascunho: viu a confirmação de troca',
  lp_rascunho_troca_continuar: 'Rascunho: escolheu continuar o atual',
  lp_rascunho_troca_outra: 'Rascunho: escolheu começar outra página',
  lp_verificacao_interacao_pedida: 'Verificação anti-robô: pediu interação',
  lp_verificacao_liberada: 'Verificação anti-robô: liberou',
};

// Blueprint §9.3: "({s} s)" com os segundos do envio da janela até o site aparecer (1 a 300).
const SITE_MONTADO: Record<string, string> = {
  lp_site_montado_ia: 'Viu o site montado pela IA',
  lp_site_montado_reserva: 'Viu o site no modelo reserva',
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
  // oferta-e-primeira-tela OF-306: botão fixo da home no celular.
  fixo_montar: 'Botão fixo (celular): montar',
  produto_todos_planos: 'Plano: ver todos os planos',
  produto_crm: 'Plano: conhecer o CRM',
  marca: 'Logo',
  minha_conta: 'Minha conta',
  rodape_email: 'Rodapé: e-mail',
  rodape_termos: 'Rodapé: termos',
  rodape_privacidade: 'Rodapé: privacidade',
  rodape_ajuda: 'Rodapé: ajuda',
  // configurador-com-ia A2: exemplo do campo do topo (B2).
  hero_exemplo: 'Topo: tocou num exemplo',
  // jornada-fluxo-atual RF-JF-07: "Continuar editando" na home com rascunho.
  hero_continuar: 'Topo: continuar editando',
  fixo_continuar: 'Botão fixo (celular): continuar editando',
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
  'fechamento_montar', 'fixo_montar', 'minha_conta', 'rodape_email', 'rodape_termos', 'rodape_privacidade', 'rodape_ajuda',
  // jornada-fluxo-atual RF-JF-07: "Continuar editando" (home com rascunho).
  'hero_continuar', 'fixo_continuar',
] as const;

const BOTOES_PRODUTO = [
  'hero_montar', 'hero_planos', 'plano_escolher', 'pergunta_abrir', 'fechamento_montar', 'produto_todos_planos',
  'produto_crm', 'marca', 'minha_conta', 'rodape_email', 'rodape_termos', 'rodape_privacidade', 'rodape_ajuda',
  // jornada-fluxo-atual RF-JF-07: o "Continuar editando" do topo (HeroProduto) também vale em Saúde, CRM e Blog;
  // o fixo é só da home.
  'hero_continuar',
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
  // oferta-e-primeira-tela OF-306: escolha de período no checkout.
  contratar_periodo_mensal: 'Escolheu o período mensal',
  contratar_periodo_anual: 'Escolheu o período anual',
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
  // configurador-com-ia A2 (spec tabela 2.10.1, nomes 13–15).
  montagem_tentar: 'Clicou em "Tentar com a IA"',
  editor_ia_sugestao: 'Tocou numa sugestão do Editar com IA',
  editor_ia_contratar: 'Clicou em Contratar no convite da IA',
  // jornada-fluxo-atual RF-JF-04: troca na gaveta do editor (e da prévia).
  editor_layout: 'Trocou o layout no editor',
  editor_tema: 'Trocou o tema no editor',
  editor_botao: 'Mudou o destino do botão no editor',
  // medicao-de-mercado M4 (RF-MM-47): o botão "Usar este exemplo" da janela "Vamos montar seu site".
  janela_exemplo: 'Clicou em "Usar este exemplo"',
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
  // configurador-com-ia A2 (spec tabela 2.10.1, nomes 16–23; textos do blueprint §9.3).
  janela_nome: 'nome vazio na janela',
  janela_descricao: 'descrição vazia na janela',
  montagem_prazo: 'montagem passou do prazo',
  montagem_falhou: 'montagem falhou',
  montagem_teto: 'montagem barrada pelo teto',
  montagem_verificacao: 'verificação anti-robô',
  montagem_entrada: 'dados da janela recusados',
  editor_ia_falhou: 'Editar com IA falhou',
  // ia-montagem-parcial (spec §5, RF-MP-35, D-MP-26): a IA recusou a descrição inteira e a pessoa voltou à janela.
  montagem_fora_do_escopo: 'descrição recusada pela IA (voltou à janela)',
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

// medicao-e-robustez MR-21: os 41 nomes da A1 (spec §1.2), em listas fechadas.
// Campo do formulário de contratação (sem "lp_campo_contratar_") → rótulo do campo.
const ROTULOS_CAMPO_CONTRATAR: Record<string, string> = {
  link: 'Seu link',
  negocio: 'Nome do negócio',
  nome: 'Seu nome',
  email: 'E-mail',
  documento: 'CPF ou CNPJ',
  celular: 'Celular',
  nicho: 'Ramo',
  cep: 'CEP',
  endereco: 'Endereço',
  numero: 'Número',
  bairro: 'Bairro',
  complemento: 'Complemento',
};

// medicao-de-mercado M2 (RF-MM-2a): o motivo fino da reserva. Tabela própria, fora de ROTULOS_ERRO, que o teste da
// fase 4 fixa por inteiro (mesma razão de DD-MM-01); `classificar` consulta as duas.
export const ROTULOS_ERRO_DA_RESERVA: Record<string, string> = {
  montagem_prazo_token: 'token anti-robô não chegou em 30 s',
  montagem_prazo_ia: 'IA passou do prazo',
  montagem_rede: 'falha de rede na montagem',
  montagem_resposta_ilegivel: 'resposta ilegível na montagem',
  montagem_indisponivel: 'IA indisponível na montagem',
};

// medicao-de-mercado M4 (RF-MM-47): campo da janela "Vamos montar seu site" (sem o prefixo) → rótulo do campo.
const ROTULOS_CAMPO_DA_JANELA: Record<string, string> = {
  nome: 'Nome do negócio',
  descricao: 'O que o negócio faz',
  cidade: 'Cidade',
};
const ESTADOS_DO_CAMPO_DA_JANELA: Record<string, string> = { preenchido: 'saiu preenchido', vazio: 'saiu vazio' };

const PREFIXO_CAMPO_CONTRATAR = 'lp_campo_contratar_';
const PREFIXO_CAMPO_DA_JANELA = 'lp_campo_janela_';
const PREFIXO_ERRO_DA_MONTAGEM = 'lp_erro_montagem_';

const ROTULOS_PLANO_ENVIO: Record<string, string> = {
  pagina: 'Página',
  presenca: 'Presença',
  captacao: 'Captação',
  pagina_anual: 'Página anual',
  presenca_anual: 'Presença anual',
  captacao_anual: 'Captação anual',
  outro: 'outro',
};

const LUGARES_MINIATURA: Record<string, string> = {
  topo: 'do topo',
  galeria: 'da galeria',
  saude: 'da Saúde',
};

function rotulosDaMedicao(): Record<string, string> {
  const rotulos: Record<string, string> = {
    lp_carga_recarga: 'Recarregou a página',
    lp_carga_voltou: 'Voltou pelo navegador',
    lp_carga_descartada: 'O navegador descartou e recarregou a página',
    lp_envio_contratar_pix: 'Enviou com Pix',
    lp_envio_contratar_cartao: 'Enviou com cartão',
  };
  for (const [slug, plano] of Object.entries(ROTULOS_PLANO_ENVIO)) {
    rotulos[`lp_envio_contratar_plano_${slug}`] = `Enviou com o plano ${plano}`;
  }
  rotulos.lp_sucesso_voltou = 'Voltou da fatura';
  rotulos.lp_sucesso_publicada = 'Viu a página no ar';
  // configurador-com-ia A1 F6: volta do Asaas na tela de sucesso.
  rotulos.lp_sucesso_retorno_asaas = 'Voltou do Asaas';
  for (const [lugar, rotulo] of Object.entries(LUGARES_MINIATURA)) {
    for (const marco of [25, 50, 75]) {
      rotulos[`lp_mini_${lugar}_rolagem_${marco}`] = `Rolou ${marco}% na miniatura ${rotulo}`;
    }
    rotulos[`lp_mini_${lugar}_rolagem_100`] = `Rolou até o fim na miniatura ${rotulo}`;
    rotulos[`lp_mini_${lugar}_toque`] = `Tocou na miniatura ${rotulo}`;
  }
  return rotulos;
}

// Os 29 nomes da A1 que não são campo: o mesmo rótulo na linha do tempo e no resumo da visita.
const ROTULOS_MEDICAO = rotulosDaMedicao();

const TEMPO_NA_PAGINA = 'lp_tempo_na_pagina';

export const ROLAGEM: Record<string, 25 | 50 | 75 | 100> = {
  lp_rolagem_25: 25,
  lp_rolagem_50: 50,
  lp_rolagem_75: 75,
  lp_rolagem_100: 100,
};

// Tipo do evento para o resumo da visita (RF-4-25); o rótulo vem sem prefixo.
type TipoDoEvento = 'acao' | 'clique' | 'clique_configurador' | 'erro' | 'secao' | 'secao_previa';

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
  // MR-21: no resumo da visita, o campo é a ação "Campo <campo>"; os outros nomes da A1, o rótulo da tabela.
  const campo = rotuloPorPrefixo(nome, PREFIXO_CAMPO_CONTRATAR, ROTULOS_CAMPO_CONTRATAR);
  if (campo !== null) return { tipo: 'acao', rotulo: `Campo ${campo}` };
  if (Object.hasOwn(ROTULOS_MEDICAO, nome)) return { tipo: 'acao', rotulo: ROTULOS_MEDICAO[nome] };
  const prefixados: Array<[TipoDoEvento, string, Record<string, string>]> = [
    ['secao', 'lp_secao_', ROTULOS_SECAO],
    ['secao_previa', 'lp_previa_secao_', ROTULOS_SECAO_PREVIA],
    ['clique', 'lp_clique_', ROTULOS_CLIQUE],
    ['clique_configurador', 'lp_clique_', ROTULOS_CLIQUE_CONFIGURADOR],
    ['erro', 'lp_erro_', ROTULOS_ERRO],
    ['erro', 'lp_erro_', ROTULOS_ERRO_DA_RESERVA],
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
  // RF-4-28: o rótulo do clique do configurador já descreve a ação ("Clicou em Contratar").
  clique_configurador: '',
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
  // MR-21: o campo da contratação leva o tempo nele (segundos é obrigatório nesses nomes).
  const campo = rotuloPorPrefixo(nome, PREFIXO_CAMPO_CONTRATAR, ROTULOS_CAMPO_CONTRATAR);
  if (campo !== null) {
    return evento.segundos === undefined ? null : `Ficou ${formatarDuracao(evento.segundos)} no campo ${campo}`;
  }
  // medicao-de-mercado RF-MM-47: lp_campo_janela_<campo>_<estado>, com o tempo no campo.
  if (nome.startsWith(PREFIXO_CAMPO_DA_JANELA)) {
    const corpo = nome.slice(PREFIXO_CAMPO_DA_JANELA.length);
    const corte = corpo.lastIndexOf('_');
    const campoDaJanela = corte < 0 ? undefined : ROTULOS_CAMPO_DA_JANELA[corpo.slice(0, corte)];
    const estado = corte < 0 ? undefined : ESTADOS_DO_CAMPO_DA_JANELA[corpo.slice(corte + 1)];
    if (campoDaJanela === undefined || estado === undefined || !Object.hasOwn(ROTULOS_CAMPO_DA_JANELA, corpo.slice(0, corte))) {
      return null;
    }
    return evento.segundos === undefined
      ? null
      : `Ficou ${formatarDuracao(evento.segundos)} no campo ${campoDaJanela} e ${estado}`;
  }
  if (Object.hasOwn(SITE_MONTADO, nome)) {
    return evento.segundos === undefined ? null : `${SITE_MONTADO[nome]} (${evento.segundos} s)`;
  }
  // montagem-prazo-do-token RF-PT-05: segundos (1 a 300) do envio da janela até o token anti-robô chegar.
  if (nome === 'lp_verificacao_token') {
    return evento.segundos === undefined ? null : `Token anti-robô em ${evento.segundos} s`;
  }
  if (nome === 'lp_page_view') return ROTULOS_EVENTOS[nome];
  if (Object.hasOwn(ROTULOS_LEITURA, nome)) return ROTULOS_LEITURA[nome];
  const classificado = classificar(nome);
  if (!classificado) return null;
  const rotulo = `${PREFIXO_NA_LINHA_DO_TEMPO[classificado.tipo]}${classificado.rotulo}`;
  // medicao-de-mercado RF-MM-2a: o motivo da reserva leva o tempo até a falha, quando vem.
  if (classificado.tipo === 'erro' && nome.startsWith(PREFIXO_ERRO_DA_MONTAGEM) && evento.segundos !== undefined) {
    return `${rotulo} (${evento.segundos} s)`;
  }
  return rotulo;
}

// jornada-fluxo-atual RF-JF-47: o que "logo depois" quer dizer. Depois de lp_editor_opened, o próximo evento que não seja
// medição passiva (rolagem, tempo) tem de ser lp_janela_aberta, no mesmo caminho e na mesma visita; um lp_page_view
// (outra passagem) ou qualquer ação entre os dois desfaz o par. Rolagem e tempo não contam como "entre".
function medicaoPassiva(nome: string): boolean {
  return nome === TEMPO_NA_PAGINA || Object.hasOwn(ROTULOS_LEITURA, nome);
}

function janelaSegueOEditor(eventos: readonly EventoJornada[], i: number): boolean {
  const editor = eventos[i];
  for (let j = i + 1; j < eventos.length; j++) {
    const proximo = eventos[j];
    if (medicaoPassiva(proximo.nome)) continue;
    return proximo.nome === 'lp_janela_aberta' && proximo.caminho === editor.caminho && proximo.visita === editor.visita;
  }
  return false;
}

// RF-JF-47: eventos da linha do tempo de uma visita (já em ordem) sem o lp_editor_opened que a janela absorve.
// A linha que sobra é a da janela, com o horário dela. Não altera a lista recebida.
export function eventosDaLinhaDoTempo(eventos: readonly EventoJornada[]): EventoJornada[] {
  return eventos.filter((e, i) => !(e.nome === 'lp_editor_opened' && janelaSegueOEditor(eventos, i)));
}

export function caminhoDoVisitante(visitante: string): string {
  return `/dashboard/jornada/${encodeURIComponent(visitante)}`;
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

function emOrdem(eventos: EventoJornada[]): EventoJornada[] {
  return [...eventos].sort((a, b) => a.em - b.em);
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
  { evento: 'lp_menu_ia', rotulo: 'Editar com IA' },
  { evento: 'lp_menu_guia', rotulo: 'Como editar' },
];

// configurador-com-ia blueprint §9.2: linhas da IA no cartão "Uso do editor", nesta ordem.
// base: a linha sobre a qual a porcentagem é calculada (só no funil de copiar e colar, como antes).
// atrito: em âmbar.
export const LINHAS_DA_IA: ReadonlyArray<{ evento: string; rotulo: string; base?: string; atrito?: boolean }> = [
  { evento: 'lp_ia_pedido_enviado' },
  { evento: 'lp_ia_mudancas_vistas' },
  { evento: 'lp_ia_sem_mudancas' },
  { evento: 'lp_ia_mudancas_aplicadas' },
  { evento: 'lp_ia_fora_do_escopo' },
  { evento: 'lp_ia_convite_exibido' },
  { evento: 'lp_ia_copiou' },
  { evento: 'lp_ia_viu_mudancas', base: 'lp_ia_copiou' },
  { evento: 'lp_ia_resposta_invalida', atrito: true },
  { evento: 'lp_ia_aplicou', base: 'lp_ia_copiou' },
].map((linha) => ({ ...linha, rotulo: ROTULOS_EVENTOS[linha.evento] }));

export type GrupoOrigem = 'google' | 'campanha' | 'assinatura' | 'site' | 'direto';

// A ordem das chaves é a do menu de origem (medicao-e-robustez MR-22).
export const ROTULOS_ORIGEM: Record<GrupoOrigem, string> = {
  google: 'Anúncio do Google',
  campanha: 'Outra campanha',
  assinatura: 'Assinatura das páginas',
  site: 'Outro site',
  direto: 'Direto',
};

// MR-22: utm:assinatura é o link da assinatura nas páginas publicadas (lp-builder MR-42).
const ORIGEM_ASSINATURA = 'utm:assinatura';

export function grupoDaOrigem(origem: OrigemCrua): GrupoOrigem | null {
  if (origem === 'google_ads') return 'google';
  if (origem === ORIGEM_ASSINATURA) return 'assinatura';
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

// medicao-e-robustez MR-23: rótulos dos dados da visita. Valor fora das listas sai cru.
const ROTULOS_FAMILIA_NAVEGADOR: Record<string, string> = {
  chrome: 'Chrome',
  safari: 'Safari',
  firefox: 'Firefox',
  edge: 'Edge',
  samsung: 'Samsung Internet',
  opera: 'Opera',
  outro: 'outro navegador',
};

const ROTULOS_SISTEMA: Record<string, string> = {
  android: 'Android',
  ios: 'iOS',
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  chromeos: 'ChromeOS',
  outro: 'outro sistema',
};

// 'a' fica "(a)" até a conferência da ajuda do Google Ads (spec §5).
const ROTULOS_CORRESPONDENCIA: Record<string, string> = {
  e: 'exata',
  p: 'de frase',
  b: 'ampla',
  a: 'a',
};

function rotuloDaLista(valor: string, rotulos: Record<string, string>): string {
  return Object.hasOwn(rotulos, valor) ? rotulos[valor] : valor;
}

// "<familia>-<sistema>" → "Chrome no Android".
function rotuloDoNavegador(navegador: string): string {
  const traco = navegador.indexOf('-');
  if (traco < 0) return navegador;
  const familia = rotuloDaLista(navegador.slice(0, traco), ROTULOS_FAMILIA_NAVEGADOR);
  const sistema = rotuloDaLista(navegador.slice(traco + 1), ROTULOS_SISTEMA);
  return `${familia} no ${sistema}`;
}

// MR-23: os itens da lista "Dados da visita", na ordem; cada um só quando o dado existe.
export function dadosDaVisita(visita: VisitaJornada): string[] {
  const itens: string[] = [];
  if (visita.campanha) itens.push(`Campanha: ${visita.campanha}`);
  if (visita.grupo) itens.push(`Grupo de anúncio: ${visita.grupo}`);
  if (visita.termo) {
    const tipo = visita.correspondencia ? ` (${rotuloDaLista(visita.correspondencia, ROTULOS_CORRESPONDENCIA)})` : '';
    itens.push(`Palavra-chave: ${visita.termo}${tipo}`);
  } else if (visita.grupo || visita.correspondencia) {
    itens.push('Palavra-chave: sem termo');
  }
  if (visita.navegador) itens.push(`Navegador: ${rotuloDoNavegador(visita.navegador)}`);
  if (visita.pagou_em !== undefined) {
    itens.push(`Pagou em ${formatarDiaMes(visita.pagou_em)} às ${formatarHora(visita.pagou_em)}`);
  }
  return itens;
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

export function filtrarVisitas<T extends { aparelho: Aparelho; origem: OrigemCrua }>(
  visitas: readonly T[],
  filtro: FiltroJornada,
): T[] {
  return visitas.filter((v) => passa(v, filtro));
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

// configurador-com-ia spec §3.7 e blueprint §9.1 (D-UI-29): quando a flag configurador-ia ficou
// ligada, como dia (AAAA-MM-DD, Brasília) ou instante ISO com fuso. Visitas desse ponto em diante
// são da série "Entrada com IA"; antes, da "Escolha de modelo". OPS-09: o dono ligou a flag para
// todos em 17/11/2026 às 16h28m34s de Brasília (atualizado_em do item FLAG#configurador-ia). O
// instante, e não o dia, porque as visitas da manhã de 17/11 ainda viram a escolha de modelo.
export const DESDE_ENTRADA_COM_IA: string | null = '2026-11-17T16:28:34-03:00';

// jornada-fluxo-atual RF-JF-45: na série nova a etapa 10 é a abertura da janela no editor, não um "começo".
// Rótulo único: o funil, o "Até onde foi" e a nota do funil usam esta constante.
export const ROTULO_ETAPA_10_ENTRADA_COM_IA = 'Abriu modal de entrada';

// Blueprint §9.1, série nova, na ordem de exibição (não a dos números da API).
export const ROTULOS_ETAPAS_ENTRADA_COM_IA = [
  'Visitou',
  ROTULO_ETAPA_10_ENTRADA_COM_IA,
  'Enviou os dados',
  'Viu o site montado',
  'Abriu a contratação',
  'Enviou a contratação',
  'Contratou',
  'Pagou',
] as const;

// D-C-01 e RF-JF-40: números da API das sete primeiras etapas da sequência da série nova; "Pagou" vem de `pagou`.
// "Editou" (4) e "Abriu a prévia" (5) saem da sequência (RF-JF-41) e vão para calcularAoLadoEntradaComIa.
const ETAPAS_DA_ENTRADA_COM_IA = [1, 10, 11, 12, 6, 7, 8] as const;
const ETAPA_EDITOU = 4;
const ETAPA_ABRIU_A_PREVIA = 5;

// Os oito valores na ordem de ROTULOS_ETAPAS_ENTRADA_COM_IA.
export function calcularFunilEntradaComIa(funil: FunilJornada, filtro: FiltroJornada): number[] {
  const valores = new Array<number>(ROTULOS_ETAPAS_ENTRADA_COM_IA.length).fill(0);
  for (const linha of funil.etapas) {
    const i = (ETAPAS_DA_ENTRADA_COM_IA as readonly number[]).indexOf(linha.etapa);
    if (i < 0 || !passa(linha, filtro)) continue;
    valores[i] += linha.visitas;
  }
  for (const linha of funil.pagou) {
    if (passa(linha, filtro)) valores[ETAPAS_DA_ENTRADA_COM_IA.length] += linha.visitas;
  }
  return valores;
}

export interface AoLadoDaEntradaComIa {
  editou: number;
  abriuAPrevia: number;
}

// RF-JF-41: visitas que editaram e que abriram a prévia (na série nova, só por escolha), com o mesmo filtro.
export function calcularAoLadoEntradaComIa(funil: FunilJornada, filtro: FiltroJornada): AoLadoDaEntradaComIa {
  const aoLado = { editou: 0, abriuAPrevia: 0 };
  for (const linha of funil.etapas) {
    if (!passa(linha, filtro)) continue;
    if (linha.etapa === ETAPA_EDITOU) aoLado.editou += linha.visitas;
    else if (linha.etapa === ETAPA_ABRIU_A_PREVIA) aoLado.abriuAPrevia += linha.visitas;
  }
  return aoLado;
}

// D-C-03: faixas de 1 s somadas como uso pela API (lp_site_montado_s_1 … _30 e _mais).
const PREFIXO_FAIXA_DA_MONTAGEM = 'lp_site_montado_s_';
const ULTIMA_FAIXA_DA_MONTAGEM = 30;
// medicao-de-mercado DD-MM-08: a mesma régua para o tempo do token anti-robô.
export const PREFIXO_FAIXA_DO_TOKEN = 'lp_verificacao_token_s_';

export type MedianaDaMontagem = number | 'mais de 30';

// spec §3.7 (D-C-28): a faixa em que a soma acumulada alcança metade do total (arredondada para cima).
// null sem nenhuma faixa: a parte "· tempo mediano" some. O prefixo diz de quais faixas (montagem ou token).
export function medianaDasFaixas(uso: Record<string, number>, prefixo: string): MedianaDaMontagem | null {
  const faixas: Array<{ faixa: MedianaDaMontagem; visitas: number }> = [];
  for (let s = 1; s <= ULTIMA_FAIXA_DA_MONTAGEM; s++) {
    faixas.push({ faixa: s, visitas: uso[`${prefixo}${s}`] ?? 0 });
  }
  faixas.push({ faixa: 'mais de 30', visitas: uso[`${prefixo}mais`] ?? 0 });
  const total = faixas.reduce((soma, f) => soma + f.visitas, 0);
  if (total <= 0) return null;
  const metade = Math.ceil(total / 2);
  let acumulado = 0;
  for (const { faixa, visitas } of faixas) {
    acumulado += visitas;
    if (acumulado >= metade) return faixa;
  }
  return null;
}

export function medianaDaMontagem(uso: Record<string, number>): MedianaDaMontagem | null {
  return medianaDasFaixas(uso, PREFIXO_FAIXA_DA_MONTAGEM);
}

// Blueprint §9.1, bloco de comparação: só as etapas que existem nas duas séries com o mesmo sentido.
// "Viu a página final" fica de fora: na série nova a prévia abre sozinha (D-PM-10), e "Abriu a prévia" não se compara.
export const ETAPAS_COMPARAVEIS = ['Visitou', 'Editou', 'Abriu a contratação', 'Pagou'] as const;

export interface LinhaDaComparacao {
  rotulo: (typeof ETAPAS_COMPARAVEIS)[number];
  // "de cada 100 visitas" de cada série; null sem visitas na série.
  antiga: number | null;
  nova: number | null;
}

// antiga: os nove valores de calcularFunil; nova: os oito de calcularFunilEntradaComIa; aoLado: "Editou" da nova.
export function compararSeries(antiga: number[], nova: number[], aoLado: AoLadoDaEntradaComIa): LinhaDaComparacao[] {
  const valorNovo = (rotulo: (typeof ETAPAS_COMPARAVEIS)[number]) =>
    rotulo === 'Editou' ? aoLado.editou : (nova[ROTULOS_ETAPAS_ENTRADA_COM_IA.indexOf(rotulo)] ?? 0);
  return ETAPAS_COMPARAVEIS.map((rotulo) => ({
    rotulo,
    antiga: taxa(antiga[ROTULOS_ETAPAS.indexOf(rotulo)] ?? 0, antiga[0] ?? 0),
    nova: taxa(valorNovo(rotulo), nova[0] ?? 0),
  }));
}

// Brasília é UTC−3 o ano todo (sem horário de verão), como o fuso fixo da API.
export function inicioDoDiaEmBrasilia(dia: string): InstanteMs {
  return Date.parse(`${dia}T00:00:00-03:00`);
}

// O corte da série nova (dia AAAA-MM-DD ou instante ISO com fuso) em ms.
export function instanteDoCorte(corte: string): InstanteMs {
  return corte.includes('T') ? Date.parse(corte) : inicioDoDiaEmBrasilia(corte);
}

type JanelaMs = { desde: InstanteMs; ate: InstanteMs };

// Blueprint §9.1: cada série só com as visitas do seu lado da data. A API conta as visitas que
// começaram em [desde, ate] (fim inclusivo), então a antiga termina 1 ms antes do corte.
export function dividirPelaEntradaComIa(
  desde: InstanteMs,
  ate: InstanteMs,
  corte: string | null,
): { antiga: JanelaMs | null; nova: JanelaMs | null } {
  if (corte === null) return { antiga: { desde, ate }, nova: null };
  const inicio = instanteDoCorte(corte);
  if (ate < inicio) return { antiga: { desde, ate }, nova: null };
  if (desde >= inicio) return { antiga: null, nova: { desde, ate } };
  return { antiga: { desde, ate: inicio - 1 }, nova: { desde: inicio, ate } };
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

// medicao-de-mercado M4 (RF-MM-48): o campo a campo da janela "Vamos montar seu site". `viram` é a etapa 10 e
// `enviaram` a 11 (visitas); `exemplo` e cada coluna vêm das marcas de uso. Uma visita pode estar nas duas colunas.
export interface DadosDaJanela {
  viram: number;
  enviaram: number;
  exemplo: number;
  campos: Array<{ campo: 'nome' | 'descricao' | 'cidade'; rotulo: string; preenchido: number; vazio: number }>;
}

export function calcularJanela(funil: FunilJornada, filtro: FiltroJornada): DadosDaJanela {
  const uso = calcularUso(funil, filtro);
  const daEtapa = (etapa: number) =>
    funil.etapas.reduce((soma, l) => (l.etapa === etapa && passa(l, filtro) ? soma + l.visitas : soma), 0);
  return {
    viram: daEtapa(10),
    enviaram: daEtapa(11),
    exemplo: uso['lp_clique_janela_exemplo'] ?? 0,
    campos: (['nome', 'descricao', 'cidade'] as const).map((campo) => ({
      campo,
      rotulo: ROTULOS_CAMPO_DA_JANELA[campo],
      preenchido: uso[`${PREFIXO_CAMPO_DA_JANELA}${campo}_preenchido`] ?? 0,
      vazio: uso[`${PREFIXO_CAMPO_DA_JANELA}${campo}_vazio`] ?? 0,
    })),
  };
}

export function taxa(valor: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round((valor / base) * 100);
}

export function maiorEtapa(etapas: number[]): number | null {
  return etapas.length === 0 ? null : Math.max(...etapas);
}

// configurador-com-ia (SPEC_DEVIATION ADM-1): com as etapas 10, 11 e 12 da A2 (D-C-01), o maior número
// não é mais o ponto mais avançado. Ordem de avanço da série antiga; de 1 a 9, a mesma de antes.
const ORDEM_DE_AVANCO: ReadonlyArray<[number, string]> = [
  [1, 'Visitou'],
  [2, 'Abriu o configurador'],
  [10, 'Começou'],
  [3, 'Escolheu modelo e tema'],
  [11, 'Enviou os dados'],
  [12, 'Viu o site montado'],
  [4, 'Editou'],
  [5, 'Viu a página final'],
  [6, 'Abriu a contratação'],
  [7, 'Enviou a contratação'],
  [8, 'Contratou'],
  [9, 'Pagou'],
];

// jornada-fluxo-atual RF-JF-44: ordem da série nova, a sequência de RF-JF-40. "Editou" (4) e "Abriu a prévia" (5)
// ficam logo antes de "Viu o site montado" (12): nunca passam à frente dele; sem a 12 (lote recusado, rascunho
// retomado), aparecem pelo nome. As etapas 2 e 3 não existem na série; ficam só para visita que cruza o corte.
const ORDEM_DE_AVANCO_ENTRADA_COM_IA: ReadonlyArray<[number, string]> = [
  [1, 'Visitou'],
  [2, 'Abriu o configurador'],
  [10, ROTULO_ETAPA_10_ENTRADA_COM_IA],
  [3, 'Escolheu modelo e tema'],
  [11, 'Enviou os dados'],
  [4, 'Editou'],
  [5, 'Abriu a prévia'],
  [12, 'Viu o site montado'],
  [6, 'Abriu a contratação'],
  [7, 'Enviou a contratação'],
  [8, 'Contratou'],
  [9, 'Pagou'],
];

// Rótulo da etapa mais avançada da visita; null sem etapa conhecida. `inicio` (ms) da visita contra `corte`
// (DESDE_ENTRADA_COM_IA) diz de que série ela é; sem corte, tudo é série antiga.
export function ateOndeFoi(etapas: readonly number[], inicio: InstanteMs, corte: string | null): string | null {
  const daSerieNova = corte !== null && inicio >= instanteDoCorte(corte);
  let rotulo: string | null = null;
  for (const [etapa, nome] of daSerieNova ? ORDEM_DE_AVANCO_ENTRADA_COM_IA : ORDEM_DE_AVANCO) {
    if (etapas.includes(etapa)) rotulo = nome;
  }
  return rotulo;
}

// jornada-trajetoria RF-JT-41: posição de 1 a 8 do "Até onde foi" na ordem de ROTULOS_ETAPAS_ENTRADA_COM_IA, para
// os pontinhos. Só a série nova tem; série antiga e visita sem etapa dão null. "Editou" e "Abriu a prévia" contam
// como "Enviou os dados"; o rótulo "Pagou" (etapa 9) e `pagou` dão 8.
const POSICAO_FORA_DA_SEQUENCIA: Record<string, number> = {
  'Abriu o configurador': 1,
  'Escolheu modelo e tema': 2,
  Editou: 3,
  'Abriu a prévia': 3,
};

export function progressoDaVisita(
  etapas: readonly number[],
  inicio: InstanteMs,
  corte: string | null,
  pagou: boolean,
): number | null {
  if (corte === null || inicio < instanteDoCorte(corte)) return null;
  const rotulo = ateOndeFoi(etapas, inicio, corte);
  if (rotulo === null) return null;
  if (pagou) return ROTULOS_ETAPAS_ENTRADA_COM_IA.length;
  const indice = (ROTULOS_ETAPAS_ENTRADA_COM_IA as readonly string[]).indexOf(rotulo);
  return indice >= 0 ? indice + 1 : (POSICAO_FORA_DA_SEQUENCIA[rotulo] ?? null);
}

// jornada-trajetoria RF-JT-42: índice (da 2ª etapa em diante) da etapa com a menor taxa sobre a anterior, só onde
// a anterior é maior que 0. No empate, a primeira. null quando nenhuma taxa é menor que 100% ou sem visitas.
export function etapaDaMaiorQueda(valores: readonly number[]): number | null {
  let melhor: number | null = null;
  for (let i = 1; i < valores.length; i++) {
    const anterior = valores[i - 1];
    if (anterior <= 0 || valores[i] >= anterior) continue;
    // valores[i]/anterior < valores[melhor]/valores[melhor - 1], sem divisão.
    if (melhor === null || valores[i] * valores[melhor - 1] < valores[melhor] * anterior) melhor = i;
  }
  return melhor;
}

// RF-A2-03: o campo do topo e o site montado viram uso da visita, mas não são uso do editor.
const USOS_QUE_NAO_SAO_DO_EDITOR = new Set([
  'lp_topo_comecou',
  'lp_site_montado_ia',
  'lp_site_montado_reserva',
  'lp_site_montado_modelo_pronto',
]);

// medicao-de-mercado RF-MM-2b: as marcas de medição (motivo da reserva, faixa do token, campo a campo da janela e o
// clique do exemplo; os da janela entram já na M2, para a ordem de publicação não acender o selo errado).
const PREFIXOS_DE_USO_QUE_NAO_SAO_DO_EDITOR = [
  PREFIXO_FAIXA_DA_MONTAGEM,
  PREFIXO_ERRO_DA_MONTAGEM,
  PREFIXO_FAIXA_DO_TOKEN,
  'lp_campo_janela_',
  'lp_clique_janela_exemplo',
];

export function usouOEditor(usos: readonly string[]): boolean {
  return usos.some(
    (u) => !USOS_QUE_NAO_SAO_DO_EDITOR.has(u) && !PREFIXOS_DE_USO_QUE_NAO_SAO_DO_EDITOR.some((p) => u.startsWith(p)),
  );
}

// medicao-de-mercado RF-MM-2c: os nove motivos da reserva, na ordem da tabela de rótulos.
export const MOTIVOS_DA_RESERVA: ReadonlyArray<{ evento: string; rotulo: string }> = [
  { evento: 'lp_erro_montagem_prazo_token', rotulo: 'token não chegou em 30 s' },
  { evento: 'lp_erro_montagem_prazo_ia', rotulo: 'IA passou de 27 s' },
  { evento: 'lp_erro_montagem_rede', rotulo: 'falha de rede' },
  { evento: 'lp_erro_montagem_resposta_ilegivel', rotulo: 'resposta ilegível' },
  { evento: 'lp_erro_montagem_indisponivel', rotulo: 'IA indisponível' },
  { evento: 'lp_erro_montagem_teto', rotulo: 'limite de uso' },
  { evento: 'lp_erro_montagem_verificacao', rotulo: 'anti-robô falhou' },
  { evento: 'lp_erro_montagem_falhou', rotulo: 'falha da IA' },
  { evento: 'lp_erro_montagem_prazo', rotulo: 'prazo estourado' },
];

// Os rótulos dos motivos que a visita tem, na ordem da tabela; vazio nas visitas antigas (sem motivo gravado).
export function motivosDaReserva(usos: readonly string[]): string[] {
  return MOTIVOS_DA_RESERVA.filter((m) => usos.includes(m.evento)).map((m) => m.rotulo);
}

// jornada-higiene-e-qualidade (RF-JH-20, RF-JH-23, RF-JH-24).
export const JANELA_CONSOLIDACAO_MS = 30 * 60 * 1000;

export type VisitaConsolidada = VisitaJornada & { visitasAgrupadas: readonly string[] };

export type OrigemDaMontagem = 'ia' | 'reserva' | 'modelo_pronto';

export function origemDaMontagem(usos: readonly string[]): OrigemDaMontagem | null {
  if (usos.includes('lp_site_montado_ia')) return 'ia';
  if (usos.includes('lp_site_montado_modelo_pronto')) return 'modelo_pronto';
  if (usos.includes('lp_site_montado_reserva')) return 'reserva';
  return null;
}

export function editouAPagina(etapas: readonly number[]): boolean {
  return etapas.includes(ETAPA_EDITOU);
}

function fimEfetivo(visita: Pick<VisitaJornada, 'inicio' | 'fim'>): InstanteMs {
  return visita.fim > visita.inicio ? visita.fim : visita.inicio;
}

// medicao-de-mercado M3 (RF-MM-38): a linha consolidada é "sem sinal humano" só se TODAS as aberturas
// agrupadas são (a regra do RF-MM-31 da API; o critério em si nunca é recalculado aqui).
function fecharSemSinal(linha: VisitaConsolidada, todasSemSinal: boolean): VisitaConsolidada {
  if (todasSemSinal) linha.sem_sinal_humano = true;
  else delete linha.sem_sinal_humano;
  return linha;
}

// Funde aberturas consecutivas do mesmo visitante (separando teste de real) cujo
// intervalo entre o fim da sessão consolidada e o início da próxima seja <= janelaMs.
export function consolidarVisitas(
  visitas: readonly VisitaJornada[],
  janelaMs: number = JANELA_CONSOLIDACAO_MS,
): VisitaConsolidada[] {
  const porGrupo = new Map<string, VisitaJornada[]>();
  for (const visita of visitas) {
    const chave = `${visita.visitante}#${visita.teste ? '1' : '0'}`;
    const lista = porGrupo.get(chave);
    if (lista) lista.push(visita);
    else porGrupo.set(chave, [visita]);
  }

  const consolidadas: VisitaConsolidada[] = [];
  for (const lista of porGrupo.values()) {
    lista.sort((a, b) => (a.inicio !== b.inicio ? a.inicio - b.inicio : a.visita.localeCompare(b.visita)));
    let atual: VisitaConsolidada & { visitasAgrupadas: string[] } = {
      ...lista[0],
      fim: fimEfetivo(lista[0]),
      etapas: [...new Set(lista[0].etapas)],
      usos: [...new Set(lista[0].usos)],
      visitasAgrupadas: [lista[0].visita],
    };
    let todasSemSinal = lista[0].sem_sinal_humano === true;

    for (let i = 1; i < lista.length; i += 1) {
      const prox = lista[i];
      const fimProx = fimEfetivo(prox);
      if (prox.inicio - atual.fim <= janelaMs) {
        if (fimProx > atual.fim) atual.fim = fimProx;
        atual.paginas += prox.paginas;
        if (!atual.campanha && prox.campanha) atual.campanha = prox.campanha;
        if (!atual.grupo && prox.grupo) atual.grupo = prox.grupo;
        if (!atual.termo && prox.termo) atual.termo = prox.termo;
        if (!atual.correspondencia && prox.correspondencia) atual.correspondencia = prox.correspondencia;
        if (!atual.navegador && prox.navegador) atual.navegador = prox.navegador;
        atual.etapas = [...new Set([...atual.etapas, ...prox.etapas])];
        atual.usos = [...new Set([...atual.usos, ...prox.usos])];
        if (prox.pagou_em !== undefined && (atual.pagou_em === undefined || prox.pagou_em < atual.pagou_em)) {
          atual.pagou_em = prox.pagou_em;
        }
        if (prox.contratacao && (!atual.contratacao || prox.contratacao.em > atual.contratacao.em)) {
          atual.contratacao = prox.contratacao;
        }
        atual.visitasAgrupadas.push(prox.visita);
        todasSemSinal = todasSemSinal && prox.sem_sinal_humano === true;
      } else {
        consolidadas.push(fecharSemSinal(atual, todasSemSinal));
        atual = {
          ...prox,
          fim: fimProx,
          etapas: [...new Set(prox.etapas)],
          usos: [...new Set(prox.usos)],
          visitasAgrupadas: [prox.visita],
        };
        todasSemSinal = prox.sem_sinal_humano === true;
      }
    }
    consolidadas.push(fecharSemSinal(atual, todasSemSinal));
  }

  consolidadas.sort((a, b) => (a.inicio !== b.inicio ? b.inicio - a.inicio : a.visita.localeCompare(b.visita)));
  return consolidadas;
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
