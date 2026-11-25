import type { FunilJornada, InstanteMs } from '@/types/jornada';
import type { ResumoToolsUso } from '@/types/toolsUso';

// medicao-de-uso RF-MU-08 e RF-MU-09: ajudantes do cartão "Uso do Tools" da página da Jornada.

// A API do Tools conta por dia de Brasília (DT-MU-05); a página da Jornada trabalha em ms.
const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// AAAA-MM-DD (en-CA) do instante, em Brasília.
function diaDeBrasilia(instante: InstanteMs): string {
  return formatoDia.format(new Date(instante));
}

// A janela da página (desde, ate em ms) nos dias que a rota do Tools pede.
export function diasDoPeriodo(desde: InstanteMs, ate: InstanteMs): { de: string; ate: string } {
  return { de: diaDeBrasilia(desde), ate: diaDeBrasilia(ate) };
}

// Estado vazio: nenhum número do período é maior que zero.
export function semUsoDoTools(resumo: ResumoToolsUso): boolean {
  return resumo.ferramentas.every(
    (f) => f.visita + f.comecou + f.resultado + f.convite + f.guia + f.planilha + f.baixou === 0,
  );
}

// A etapa 1 do funil é "Visitou" nas duas séries da jornada.
const ETAPA_VISITOU = 1;

// RF-MU-09: visitas da jornada (etapa 1) de uma origem crua no período, de todos os aparelhos.
export function visitasPelaOrigem(funil: FunilJornada, origem: string): number {
  return funil.etapas
    .filter((l) => l.etapa === ETAPA_VISITOU && l.origem === origem)
    .reduce((total, l) => total + l.visitas, 0);
}
