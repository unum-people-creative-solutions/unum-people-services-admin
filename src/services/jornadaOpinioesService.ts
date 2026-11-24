import { api } from '@/lib/api';
import type { ResumoDeOpinioes } from '@/types/jornadaOpinioes';

// opiniao-e-modelos RF-OM-15 e DT-OM-17: leitura do operador; período de até 92 dias (acima disso, 400
// periodo_invalido). de e ate são dias AAAA-MM-DD de Brasília.
export const jornadaOpinioesService = {
  resumo: (de: string, ate: string): Promise<ResumoDeOpinioes> =>
    api.get(`/admin/dashboard/jornada/opinioes?de=${de}&ate=${ate}`),
};
