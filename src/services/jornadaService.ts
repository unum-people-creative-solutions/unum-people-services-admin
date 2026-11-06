import { api } from '@/lib/api';
import type { FunilJornada, InstanteMs, VisitaJornada, VisitanteJornada } from '@/types/jornada';

// spec-4-detalhe RF-4-20: o funil aceita a janela em ms (página Jornada) e,
// pelo formato antigo, os dias AAAA-MM-DD do cartão do funil em /dashboard.
function funil(desde: InstanteMs, ate: InstanteMs): Promise<FunilJornada>;
function funil(de: string, ate: string): Promise<FunilJornada>;
function funil(de: InstanteMs | string, ate: InstanteMs | string): Promise<FunilJornada> {
  return typeof de === 'number'
    ? api.get(`/admin/dashboard/jornada/funil?desde=${de}&ate=${ate}`)
    : api.get(`/admin/dashboard/jornada/funil?de=${de}&ate=${ate}`);
}

// spec-2-painel RF-2-01 a RF-2-03; spec-4-detalhe RF-4-20.
export const jornadaService = {
  funil,

  // RF-4-19: as de teste vêm sempre incluídas; a tela filtra.
  visitas: (desde: InstanteMs, ate: InstanteMs): Promise<VisitaJornada[]> =>
    api.get(`/admin/dashboard/jornada/visitas?desde=${desde}&ate=${ate}`),

  visitante: (id: string): Promise<VisitanteJornada> =>
    api.get(`/admin/dashboard/jornada/visitantes/${encodeURIComponent(id)}`),
};
