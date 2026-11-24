import { api } from '@/lib/api';
import type { ResumoDeModelos } from '@/types/jornadaModelos';

// opiniao-e-modelos RF-OM-04 e DT-OM-06: leitura do operador; período de até 92 dias (acima disso, 400
// periodo_invalido). de e ate são dias AAAA-MM-DD de Brasília.
export const jornadaModelosService = {
  resumo: (de: string, ate: string): Promise<ResumoDeModelos> =>
    api.get(`/admin/dashboard/jornada/modelos?de=${de}&ate=${ate}`),
};
