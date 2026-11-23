import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JanelaCampoACampo } from './JanelaCampoACampo';
import type { DadosDaJanela } from '@/lib/jornada';

// medicao-de-mercado M4 (RF-MM-48, T37).

const dados: DadosDaJanela = {
  viram: 10,
  enviaram: 6,
  exemplo: 3,
  campos: [
    { campo: 'nome', rotulo: 'Nome do negócio', preenchido: 5, vazio: 2 },
    { campo: 'descricao', rotulo: 'O que o negócio faz', preenchido: 0, vazio: 6 },
    { campo: 'cidade', rotulo: 'Cidade', preenchido: 1, vazio: 0 },
  ],
};

function renderizar(
  janela: DadosDaJanela | undefined,
  extra: { carregando?: boolean; erro?: boolean; onTentar?: () => void } = {},
) {
  render(
    <JanelaCampoACampo
      janela={janela}
      carregando={extra.carregando ?? false}
      erro={extra.erro ?? false}
      onTentar={extra.onTentar ?? (() => {})}
    />,
  );
  return screen.getByRole('region', { name: 'Campo a campo na janela' });
}

describe('JanelaCampoACampo', () => {
  // Cada linha: o campo, a célula "Saiu preenchido" e a "Saiu vazio" (os rótulos de leitura de tela ficam fora do N (P%)).
  function linhas(secao: HTMLElement) {
    const lista = within(secao).getByRole('list', { name: 'Campos da janela' });
    return within(lista)
      .getAllByRole('listitem')
      .map((li) => ({
        campo: li.firstElementChild?.textContent,
        celulas: Array.from(li.querySelectorAll(':scope > span:not(:first-child)')).map((c) => c.textContent),
      }));
  }

  it('uma linha por campo com "Saiu preenchido: N (P%)" e "Saiu vazio: N (P%)", mais as três linhas de base', () => {
    const secao = renderizar(dados);
    expect(linhas(secao)).toEqual([
      { campo: 'Nome do negócio', celulas: ['Saiu preenchido: 5 (50%)', 'Saiu vazio: 2 (20%)'] },
      { campo: 'O que o negócio faz', celulas: ['Saiu preenchido: 0 (0%)', 'Saiu vazio: 6 (60%)'] },
      { campo: 'Cidade', celulas: ['Saiu preenchido: 1 (10%)', 'Saiu vazio: 0 (0%)'] },
    ]);
    expect(within(secao).getByText('Viram a janela: 10')).toBeInTheDocument();
    expect(within(secao).getByText('Enviaram os dados: 6')).toBeInTheDocument();
    expect(within(secao).getByText('Usaram "Usar este exemplo": 3')).toBeInTheDocument();
  });

  it('uma visita pode estar nas duas colunas: as duas contam', () => {
    const secao = renderizar({
      viram: 4,
      enviaram: 4,
      exemplo: 0,
      campos: [{ campo: 'nome', rotulo: 'Nome do negócio', preenchido: 4, vazio: 3 }, ...dados.campos.slice(1)],
    });
    expect(linhas(secao)[0].celulas).toEqual(['Saiu preenchido: 4 (100%)', 'Saiu vazio: 3 (75%)']);
  });

  it('sem visitas na janela (B = 0), "-" no lugar da porcentagem', () => {
    const secao = renderizar({ ...dados, viram: 0, enviaram: 0, exemplo: 0 });
    expect(linhas(secao)[0].celulas).toEqual(['Saiu preenchido: 5 (-)', 'Saiu vazio: 2 (-)']);
    expect(within(secao).getByText('Viram a janela: 0')).toBeInTheDocument();
  });

  it('carregando: região ocupada; erro: alerta com "Tentar de novo"', () => {
    const secao = renderizar(undefined, { carregando: true });
    expect(secao).toHaveAttribute('aria-busy', 'true');
    expect(within(secao).queryByRole('list')).toBeNull();
  });

  it('erro: mostra o alerta e o botão refaz a consulta', () => {
    const onTentar = vi.fn();
    const secao = renderizar(undefined, { erro: true, onTentar });
    expect(within(secao).getByRole('alert')).toBeInTheDocument();
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentar).toHaveBeenCalledTimes(1);
  });
});
