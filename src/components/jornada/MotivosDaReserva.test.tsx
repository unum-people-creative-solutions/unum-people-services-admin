import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MotivosDaReserva } from './MotivosDaReserva';

// medicao-de-mercado M2 (RF-MM-2d, T20).

function renderizar(
  uso: Record<string, number> | undefined,
  extra: { carregando?: boolean; erro?: boolean; onTentar?: () => void } = {},
) {
  render(
    <MotivosDaReserva
      uso={uso}
      carregando={extra.carregando ?? false}
      erro={extra.erro ?? false}
      onTentar={extra.onTentar ?? (() => {})}
    />,
  );
  return screen.getByRole('region', { name: 'Motivos da reserva' });
}

describe('MotivosDaReserva', () => {
  it('total de reservas, uma linha por motivo com valor e a mediana do token', () => {
    const secao = renderizar({
      lp_site_montado_reserva: 7,
      lp_erro_montagem_rede: 3,
      lp_erro_montagem_prazo_ia: 2,
      lp_erro_montagem_indisponivel: 0,
      lp_verificacao_token_s_3: 1,
      lp_verificacao_token_s_5: 2,
      lp_verificacao_token_s_mais: 1,
    });
    expect(within(secao).getByText('Visitas que caíram na reserva: 7')).toBeInTheDocument();
    const lista = within(secao).getByRole('list', { name: 'Motivos' });
    // na ordem da tabela de rótulos (RF-MM-2c), sem os motivos em 0
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'IA passou de 27 s2',
      'falha de rede3',
    ]);
    expect(within(secao).getByText('Tempo mediano do token anti-robô: 5 s')).toBeInTheDocument();
  });

  it('mediana acima de 30 s diz "mais de 30 s"', () => {
    const secao = renderizar({ lp_site_montado_reserva: 1, lp_verificacao_token_s_mais: 4 });
    expect(within(secao).getByText('Tempo mediano do token anti-robô: mais de 30 s')).toBeInTheDocument();
  });

  it('sem faixa do token, a linha da mediana não aparece', () => {
    const secao = renderizar({ lp_site_montado_reserva: 2, lp_erro_montagem_rede: 2 });
    expect(within(secao).queryByText(/Tempo mediano/)).toBeNull();
  });

  it('reserva sem motivo (visitas antigas): total e nenhuma lista', () => {
    const secao = renderizar({ lp_site_montado_reserva: 4 });
    expect(within(secao).getByText('Visitas que caíram na reserva: 4')).toBeInTheDocument();
    expect(within(secao).queryByRole('list')).toBeNull();
    expect(within(secao).queryByText('Nenhuma reserva no período.')).toBeNull();
  });

  it('sem reserva e sem motivo: "Nenhuma reserva no período."', () => {
    const secao = renderizar({ lp_menu_ia: 5 });
    expect(within(secao).getByText('Nenhuma reserva no período.')).toBeInTheDocument();
    expect(within(secao).queryByText(/Visitas que caíram/)).toBeNull();
    expect(within(secao).queryByRole('list')).toBeNull();
  });

  it('sem reserva, a mediana do token ainda aparece quando há faixa', () => {
    const secao = renderizar({ lp_verificacao_token_s_8: 3 });
    expect(within(secao).getByText('Nenhuma reserva no período.')).toBeInTheDocument();
    expect(within(secao).getByText('Tempo mediano do token anti-robô: 8 s')).toBeInTheDocument();
  });

  it('carregando: região ocupada, sem números; erro: alerta com "Tentar de novo"', () => {
    const secao = renderizar(undefined, { carregando: true });
    expect(secao).toHaveAttribute('aria-busy', 'true');
    expect(within(secao).queryByText(/Nenhuma reserva/)).toBeNull();
  });

  it('erro: mostra o alerta e o botão refaz a consulta', () => {
    const onTentar = vi.fn();
    const secao = renderizar(undefined, { erro: true, onTentar });
    expect(within(secao).getByRole('alert')).toBeInTheDocument();
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentar).toHaveBeenCalledTimes(1);
  });
});
