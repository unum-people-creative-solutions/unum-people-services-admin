import { within } from '@testing-library/react';

// Rótulo de um nó da trajetória lido pelo que o leitor de tela recebe: o texto logo antes do aviso
// "etapa do funil" / "página" (RF-JT-21). Não depende de tag nem de classe.
export function rotuloDoNo(no: HTMLElement): string | null {
  const [marca] = within(no).queryAllByText(/^(etapa do funil|página)$/);
  return marca?.previousElementSibling?.textContent ?? null;
}
