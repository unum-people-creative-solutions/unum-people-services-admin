import type { MontagensDoModelo } from '@/types/jornadaModelos';

// opiniao-e-modelos RF-OM-08: estado vazio dos cartões "Modelos" e "Cores" — nenhuma contagem do
// período é maior que zero.
export function semMontagens(linhas: MontagensDoModelo[]): boolean {
  return linhas.every((l) => l.ia + l.pessoa + l.reserva + l.saiu + l.entrou + l.contratados === 0);
}
