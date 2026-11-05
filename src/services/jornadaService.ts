import { api } from '@/lib/api';
import type { FunilJornada, VisitaJornada, VisitanteJornada } from '@/types/jornada';

// spec-2-painel RF-2-01 a RF-2-03.
export const jornadaService = {
  funil: (de: string, ate: string): Promise<FunilJornada> =>
    api.get(`/admin/dashboard/jornada/funil?de=${de}&ate=${ate}`),

  visitas: (dia: string, teste: boolean): Promise<VisitaJornada[]> =>
    api.get(`/admin/dashboard/jornada/visitas?dia=${dia}&teste=${teste ? 1 : 0}`),

  visitante: (id: string): Promise<VisitanteJornada> =>
    api.get(`/admin/dashboard/jornada/visitantes/${encodeURIComponent(id)}`),
};
