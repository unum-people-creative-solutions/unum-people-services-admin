// Contratos de GET /admin/dashboard/jornada/* (unum-people-services-api,
// Lambda admin). Espelham, campo a campo, os RF-2-01 a RF-2-03 de
// unum-people-docs/spec/features/unum-people-services/jornada-do-visitante/spec-2-painel.md.

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

// GET /admin/dashboard/jornada/funil?de=AAAA-MM-DD&ate=AAAA-MM-DD
export interface FunilJornada {
  etapas: LinhaEtapa[];
  uso: LinhaUso[];
  pagou: LinhaPagou[];
}

// RF-2-02/03: contratação ligada ao visitante.
export interface ContratacaoJornada {
  tenant_id: string;
  nome: string;
  status: string;
  pago: boolean;
  plano: string;
  em: string;
}

// RF-2-02: resumo de uma visita.
export interface VisitaJornada {
  visitante: string;
  visita: string;
  inicio: string;
  fim: string;
  aparelho: Aparelho;
  origem: OrigemCrua;
  campanha?: string;
  paginas: number;
  etapas: number[];
  usos: string[];
  teste: boolean;
  contratacao?: ContratacaoJornada;
}

// RF-2-03: evento da linha do tempo.
export interface EventoJornada {
  em: string;
  nome: string;
  caminho: string;
  visita: string;
}

// GET /admin/dashboard/jornada/visitantes/{visitante}
export interface VisitanteJornada {
  visitante: string;
  visitas: VisitaJornada[];
  eventos: EventoJornada[];
  contratacoes: ContratacaoJornada[];
}
