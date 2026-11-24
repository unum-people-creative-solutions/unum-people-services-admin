// Contrato de GET /admin/dashboard/jornada/modelos?de=AAAA-MM-DD&ate=AAAA-MM-DD (unum-people-services-api,
// Lambda admin, operador). Espelha, campo a campo, internal/handler/testdata/jornada-modelos-resposta.json
// (opiniao-e-modelos RF-OM-04, RF-OM-09, DT-OM-06). Todos os itens do catálogo vêm, na ordem dele, com zeros.

// Uma linha do cartão: um modelo (layout) ou um tema (cores).
export interface MontagensDoModelo {
  id: string;
  rotulo: string;
  // Montados pela IA, escolhidos pela pessoa e modelo reserva (`quem` de lp_site_montado_*).
  ia: number;
  pessoa: number;
  reserva: number;
  // Trocaram por outro (de) e vieram de outro (para).
  saiu: number;
  entrou: number;
  contratados: number;
}

export interface ResumoDeModelos {
  de: string;
  ate: string;
  modelos: MontagensDoModelo[];
  temas: MontagensDoModelo[];
}
