import type { MontagensDoModelo } from '@/types/jornadaModelos';

// opiniao-e-modelos RF-OM-08: estado vazio dos cartões "Modelos" e "Cores" — nenhuma contagem do
// período é maior que zero.
export function semMontagens(linhas: MontagensDoModelo[]): boolean {
  return linhas.every((l) => movimento(l) === 0);
}

function movimento(l: MontagensDoModelo): number {
  return l.ia + l.pessoa + l.reserva + l.saiu + l.entrou + l.contratados;
}

// top5-modelos-e-cores RF-01 a RF-03: as linhas com movimento, do maior para o menor; no empate vale a ordem
// de entrada (a do catálogo); corta no limite. Não muda o array recebido.
export function principaisDoPeriodo(linhas: MontagensDoModelo[], limite = 5): MontagensDoModelo[] {
  return linhas
    .map((linha, posicao) => ({ linha, posicao, total: movimento(linha) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total || a.posicao - b.posicao)
    .slice(0, limite)
    .map((x) => x.linha);
}
