// Contratos de GET /admin/dashboard/jornada/* (unum-people-services-api,
// Lambda admin). Espelham, campo a campo, os RF-2-01 a RF-2-03 de
// unum-people-docs/spec/features/unum-people-services/jornada-do-visitante/spec-2-painel.md.
// Os instantes (inicio, fim, em) chegam como número: milissegundos Unix (int64 no Go).

// Milissegundos desde 1970-01-01T00:00:00Z.
export type InstanteMs = number;

export type Aparelho = 'celular' | 'computador';

// Origem crua: google_ads, utm:<fonte>, ref:<host> ou direto. A tela agrupa.
export type OrigemCrua = string;

// RF-2-01: etapas somadas no período (etapa = n da tabela de etapas, 1 a 8).
export interface LinhaEtapa {
  etapa: number;
  aparelho: Aparelho;
  origem: OrigemCrua;
  visitas: number;
}

// RF-2-01: uso do editor, dos SKs uso:<evento>.
export interface LinhaUso {
  evento: string;
  aparelho: Aparelho;
  origem: OrigemCrua;
  visitas: number;
}

// RF-2-01: visitas com etapa_8 cujo tenant ligado está ATIVO, sem bloqueio e sem teste.
export interface LinhaPagou {
  aparelho: Aparelho;
  origem: OrigemCrua;
  visitas: number;
}

// spec-3-leitura: página de entrada (/, /saude, /crm, /blog).
export type PaginaDeEntrada = 'inicio' | 'saude' | 'crm' | 'blog';

// RF-3-11/12: leitura das páginas de entrada, dos SKs leitura:<pagina>:<evento>.
// evento vem sem "lp_": visita, rolagem_*, tempo_*, secao_* ou clique_*.
export interface LinhaLeitura {
  pagina: PaginaDeEntrada;
  evento: string;
  aparelho: Aparelho;
  origem: OrigemCrua;
  visitas: number;
}

// medicao-de-mercado M3 (RF-MM-36): sessões "sem sinal humano" (só a chegada) que o funil por janela
// deixou de fora, por aparelho e origem.
export interface LinhaSemSinal {
  aparelho: Aparelho;
  origem: OrigemCrua;
  visitas: number;
}

// GET /admin/dashboard/jornada/funil?desde=<ms>&ate=<ms> (spec-4-detalhe RF-4-18)
// ou ?de=AAAA-MM-DD&ate=AAAA-MM-DD (formato antigo); a resposta é a mesma.
export interface FunilJornada {
  etapas: LinhaEtapa[];
  uso: LinhaUso[];
  pagou: LinhaPagou[];
  // RF-3-11: lista vazia é [], nunca null.
  leitura: LinhaLeitura[];
  // medicao-de-mercado M3: só no formato de janela e só quando alguma sessão sem sinal humano ficou de fora
  // (a chave é omitida com &sem_sinal=incluir e no formato por dia).
  sem_sinal_humano?: LinhaSemSinal[];
}

// RF-2-02/03: contratação ligada ao visitante.
export interface ContratacaoJornada {
  tenant_id: string;
  nome: string;
  status: string;
  pago: boolean;
  plano: string;
  em: InstanteMs;
}

// RF-2-02: resumo de uma visita.
export interface VisitaJornada {
  visitante: string;
  visita: string;
  inicio: InstanteMs;
  fim: InstanteMs;
  aparelho: Aparelho;
  origem: OrigemCrua;
  campanha?: string;
  // medicao-e-robustez spec §1.4 (F1): dados do anúncio e do navegador, só quando a visita os trouxe.
  // grupo: número do grupo de anúncio (utm_content), até 20 dígitos.
  grupo?: string;
  // termo: palavra-chave (utm_term), texto do Google.
  termo?: string;
  // correspondencia: tipo de correspondência (matchtype): 'e', 'p', 'b' ou 'a'.
  correspondencia?: string;
  // navegador: '<familia>-<sistema>' (ex.: 'chrome-android').
  navegador?: string;
  // spec §1.4 (F2): instante em que o pagamento foi confirmado nesta visita (atributo pagou).
  pagou_em?: InstanteMs;
  paginas: number;
  etapas: number[];
  usos: string[];
  teste: boolean;
  // medicao-de-mercado M3 (RF-MM-34): só a chegada (critério da abertura, calculado na API); a chave só vem quando true.
  sem_sinal_humano?: boolean;
  contratacao?: ContratacaoJornada;
}

// RF-2-03: evento da linha do tempo.
export interface EventoJornada {
  em: InstanteMs;
  nome: string;
  caminho: string;
  visita: string;
  // spec-4-detalhe RF-4-16/RF-4-20: só em lp_tempo_na_pagina (1 a 300); omitido nos outros.
  segundos?: number;
}

// GET /admin/dashboard/jornada/visitantes/{visitante}
export interface VisitanteJornada {
  visitante: string;
  visitas: VisitaJornada[];
  eventos: EventoJornada[];
  contratacoes: ContratacaoJornada[];
}
