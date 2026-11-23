import { api } from '@/lib/api';
import type { ResumoToolsUso } from '@/types/toolsUso';

// medicao-de-uso RF-MU-06 e DT-MU-08: só o GlobalAdmin lê (outro papel recebe 403); período de até
// 92 dias (acima disso, 400 periodo_invalido). de e ate são dias AAAA-MM-DD de Brasília.
export const toolsUsoService = {
  resumo: (de: string, ate: string): Promise<ResumoToolsUso> =>
    api.get(`/admin/dashboard/tools-uso?de=${de}&ate=${ate}`),
};
