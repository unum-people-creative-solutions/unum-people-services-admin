// Cálculos e rótulos da jornada do visitante (spec-2-painel, blueprint §3 e §5).
// Funções puras: a tela filtra e soma as linhas cruas da API sem nova chamada.
import type { Aparelho, FunilJornada, OrigemCrua } from '@/types/jornada';

export const ROTULOS_ETAPAS = [
  'Visitou',
  'Abriu o configurador',
  'Escolheu modelo e tema',
  'Editou',
  'Viu a página final',
  'Abriu a contratação',
  'Enviou a contratação',
  'Contratou',
  'Pagou',
] as const;

const ROTULOS_EVENTOS: Record<string, string> = {
  lp_page_view: 'Viu a página',
  lp_config_started: 'Abriu o configurador',
  lp_selection_completed: 'Escolheu modelo e tema',
  lp_editor_opened: 'Abriu o editor',
  lp_first_edit: 'Editou pela primeira vez',
  lp_preview_opened: 'Viu a página final',
  lp_checkout_opened: 'Abriu a contratação',
  lp_checkout_submitted: 'Enviou a contratação',
  lp_checkout_succeeded: 'Contratou',
  lp_menu_tema: 'Menu: Editar tema',
  lp_menu_layout: 'Menu: Editar layout',
  lp_menu_dados: 'Menu: Dados da página',
  lp_menu_buscas: 'Menu: Buscas',
  lp_menu_ia: 'Menu: Editar com sua IA',
  lp_menu_guia: 'Menu: Como editar',
  lp_ia_copiou: 'IA: copiou as instruções',
  lp_ia_viu_mudancas: 'IA: viu as mudanças',
  lp_ia_resposta_invalida: 'IA: resposta não lida',
  lp_ia_aplicou: 'IA: aplicou as mudanças',
};

// null para evento desconhecido: a tela mostra o nome cru.
export function rotuloDoEvento(nome: string): string | null {
  return Object.hasOwn(ROTULOS_EVENTOS, nome) ? ROTULOS_EVENTOS[nome] : null;
}

const ROTULOS_APARELHO: Record<Aparelho, string> = {
  celular: 'Celular',
  computador: 'Computador',
};

export function rotuloDoAparelho(aparelho: Aparelho): string {
  return ROTULOS_APARELHO[aparelho];
}

// Menu "Editar" (spec-1b U1) e funil da IA (U2), na ordem do blueprint §3.3.
export const OPCOES_MENU: ReadonlyArray<{ evento: string; rotulo: string }> = [
  { evento: 'lp_menu_tema', rotulo: 'Editar tema' },
  { evento: 'lp_menu_layout', rotulo: 'Editar layout' },
  { evento: 'lp_menu_dados', rotulo: 'Dados da página' },
  { evento: 'lp_menu_buscas', rotulo: 'Buscas' },
  { evento: 'lp_menu_ia', rotulo: 'Editar com sua IA' },
  { evento: 'lp_menu_guia', rotulo: 'Como editar' },
];

export const PASSOS_IA = {
  copiou: { evento: 'lp_ia_copiou', rotulo: 'Copiou as instruções' },
  viu: { evento: 'lp_ia_viu_mudancas', rotulo: 'Viu as mudanças' },
  aplicou: { evento: 'lp_ia_aplicou', rotulo: 'Aplicou' },
  invalida: { evento: 'lp_ia_resposta_invalida', rotulo: 'Resposta não lida' },
} as const;

export type GrupoOrigem = 'google' | 'campanha' | 'site' | 'direto';

export const ROTULOS_ORIGEM: Record<GrupoOrigem, string> = {
  google: 'Anúncio do Google',
  campanha: 'Outra campanha',
  site: 'Outro site',
  direto: 'Direto',
};

export function grupoDaOrigem(origem: OrigemCrua): GrupoOrigem | null {
  if (origem === 'google_ads') return 'google';
  if (origem.startsWith('utm:')) return 'campanha';
  if (origem.startsWith('ref:')) return 'site';
  if (origem === 'direto') return 'direto';
  return null;
}

// Rótulo para a tela; uma origem fora do formato aparece crua.
export function rotuloDaOrigem(origem: OrigemCrua): string {
  const grupo = grupoDaOrigem(origem);
  return grupo ? ROTULOS_ORIGEM[grupo] : origem;
}

export interface FiltroJornada {
  origem: GrupoOrigem | 'todas';
  aparelho: Aparelho | 'todos';
}

function passa(linha: { aparelho: Aparelho; origem: OrigemCrua }, filtro: FiltroJornada): boolean {
  if (filtro.aparelho !== 'todos' && linha.aparelho !== filtro.aparelho) return false;
  if (filtro.origem !== 'todas' && grupoDaOrigem(linha.origem) !== filtro.origem) return false;
  return true;
}

// As 9 etapas: 1 a 8 vêm de `etapas`, a 9ª ("Pagou") de `pagou`.
export function calcularFunil(funil: FunilJornada, filtro: FiltroJornada): number[] {
  const valores = new Array<number>(ROTULOS_ETAPAS.length).fill(0);
  for (const linha of funil.etapas) {
    if (linha.etapa < 1 || linha.etapa > 8 || !passa(linha, filtro)) continue;
    valores[linha.etapa - 1] += linha.visitas;
  }
  for (const linha of funil.pagou) {
    if (passa(linha, filtro)) valores[8] += linha.visitas;
  }
  return valores;
}

export function calcularUso(funil: FunilJornada, filtro: FiltroJornada): Record<string, number> {
  const uso: Record<string, number> = {};
  for (const linha of funil.uso) {
    if (!passa(linha, filtro)) continue;
    uso[linha.evento] = (uso[linha.evento] ?? 0) + linha.visitas;
  }
  return uso;
}

export function taxa(valor: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round((valor / base) * 100);
}

export function maiorEtapa(etapas: number[]): number | null {
  return etapas.length === 0 ? null : Math.max(...etapas);
}

// Dias no formato AAAA-MM-DD, em UTC, como os dados.
export function diaUtc(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function somarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return diaUtc(data);
}

export function periodoUtc(dias: number, agora: Date): { de: string; ate: string } {
  const ate = diaUtc(agora);
  return { de: somarDias(ate, -(dias - 1)), ate };
}

// Horários sempre em Brasília (RF-2-11), sem conta de fuso à mão.
const BRASILIA = 'America/Sao_Paulo';

const formatoHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const formatoHoraSegundos = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const formatoDiaMes = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA,
  day: 'numeric',
  month: 'numeric',
});

// O dia da lista de visitas é um dia UTC (GSI1); mostrado como está.
const formatoDia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatarHora(iso: string): string {
  return formatoHora.format(new Date(iso));
}

export function formatarHoraComSegundos(iso: string): string {
  return formatoHoraSegundos.format(new Date(iso));
}

// O pt-BR completa com zero ("05/11"); o blueprint mostra "5/11".
export function formatarDiaMes(iso: string): string {
  const partes = formatoDiaMes.formatToParts(new Date(iso));
  const dia = partes.find((p) => p.type === 'day')?.value ?? '';
  const mes = partes.find((p) => p.type === 'month')?.value ?? '';
  return `${Number(dia)}/${Number(mes)}`;
}

export function formatarDia(dia: string): string {
  return formatoDia.format(new Date(`${dia}T00:00:00Z`));
}
