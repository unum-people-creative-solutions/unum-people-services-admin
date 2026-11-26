// Contrato de GET /admin/dashboard/tools-uso?de=AAAA-MM-DD&ate=AAAA-MM-DD (unum-people-services-api,
// Lambda admin, GlobalAdmin). Espelha, campo a campo, internal/handler/testdata/tools-uso-resposta.json
// e medicao-de-uso RF-MU-06 / DT-MU-08. Sem dados, `dias` chega como [] (nunca null).

export type FerramentaTools = 'home' | 'quanto-cobrar' | 'vale-anunciar' | 'servicos-compensam' | 'qr-code' | 'link-whatsapp';

export type EventoTools = 'visita' | 'comecou' | 'resultado' | 'convite' | 'guia' | 'planilha' | 'baixou';

// Totais do período por ferramenta; evento sem dado vem 0.
export interface TotaisDaFerramenta {
  ferramenta: FerramentaTools;
  visita: number;
  comecou: number;
  resultado: number;
  convite: number;
  guia: number;
  planilha: number;
  baixou: number;
}

// Série por dia (AAAA-MM-DD, Brasília), só dos eventos que tiveram contagem.
export interface LinhaDoDia {
  dia: string;
  ferramenta: FerramentaTools;
  evento: EventoTools;
  n: number;
}

export interface ResumoToolsUso {
  de: string;
  ate: string;
  ferramentas: TotaisDaFerramenta[];
  dias: LinhaDoDia[];
}
