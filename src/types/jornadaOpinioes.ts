// Contrato de GET /admin/dashboard/jornada/opinioes?de=AAAA-MM-DD&ate=AAAA-MM-DD (unum-people-services-api,
// Lambda admin, operador). Espelha, campo a campo, internal/handler/testdata/jornada-opinioes-resposta.json
// (opiniao-e-modelos RF-OM-15, RF-OM-19, DT-OM-17). `media`, `total` e `por_nota` contam todas as opiniões do
// período; `opinioes` traz até 200, da mais nova para a mais antiga.

export type NotaDaOpiniao = '1' | '2' | '3' | '4' | '5';

export interface OpiniaoDoEditor {
  // Instante em milissegundos Unix.
  em: number;
  nota: number;
  // Ausente quando a pessoa só deu a nota.
  texto?: string;
  // id do modelo (layout) e do tema da página na hora da opinião, como no cartão "Modelos".
  modelo: string;
  tema: string;
  porta: 'publica' | 'logada';
  // Só na porta pública: abrem a trajetória do visitante, na âncora da visita.
  visitante?: string;
  visita?: string;
  // Só na porta logada.
  tenant?: string;
}

export interface ResumoDeOpinioes {
  de: string;
  ate: string;
  // Média com até 2 casas; a tela mostra 1.
  media: number;
  total: number;
  por_nota: Record<NotaDaOpiniao, number>;
  opinioes: OpiniaoDoEditor[];
}
