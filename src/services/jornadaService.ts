import { api } from '@/lib/api';
import type { FunilJornada, InstanteMs, VisitaJornada, VisitanteJornada } from '@/types/jornada';

// spec-4-detalhe RF-4-20: o funil aceita a janela em ms (página Jornada) e,
// pelo formato antigo, os dias AAAA-MM-DD do cartão do funil em /dashboard.
// medicao-de-mercado M3 (RF-MM-36): a API exclui por padrão as sessões sem sinal humano da janela;
// incluirSemSinal acrescenta &sem_sinal=incluir. O formato por dia não muda.
export interface OpcoesDoFunil {
  incluirSemSinal?: boolean;
}

function funil(desde: InstanteMs, ate: InstanteMs, opcoes?: OpcoesDoFunil): Promise<FunilJornada>;
function funil(de: string, ate: string): Promise<FunilJornada>;
function funil(de: InstanteMs | string, ate: InstanteMs | string, opcoes?: OpcoesDoFunil): Promise<FunilJornada> {
  return typeof de === 'number'
    ? api.get(`/admin/dashboard/jornada/funil?desde=${de}&ate=${ate}${opcoes?.incluirSemSinal ? '&sem_sinal=incluir' : ''}`)
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
