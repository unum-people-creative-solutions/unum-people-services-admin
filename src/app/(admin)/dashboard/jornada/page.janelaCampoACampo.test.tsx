import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import type { FunilJornada } from '@/types/jornada';

// medicao-de-mercado M4 (RF-MM-48, T37): o cartão "Campo a campo na janela" ao lado dos motivos da reserva,
// com os mesmos filtros e o mesmo período.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => '/dashboard/jornada') }));

const funil: FunilJornada = {
  etapas: [
    { etapa: 10, aparelho: 'celular', origem: 'google_ads', visitas: 8 },
    { etapa: 10, aparelho: 'computador', origem: 'direto', visitas: 2 },
    { etapa: 11, aparelho: 'celular', origem: 'google_ads', visitas: 4 },
  ],
  uso: [
    { evento: 'lp_campo_janela_nome_preenchido', aparelho: 'celular', origem: 'google_ads', visitas: 4 },
    { evento: 'lp_campo_janela_nome_vazio', aparelho: 'computador', origem: 'direto', visitas: 1 },
    { evento: 'lp_clique_janela_exemplo', aparelho: 'celular', origem: 'google_ads', visitas: 2 },
  ],
  pagou: [],
  leitura: [],
};

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <JornadaPage />
    </QueryClientProvider>,
  );
}

describe('Jornada: Campo a campo na janela', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
    vi.mocked(jornadaService.visitas).mockResolvedValue([]);
  });

  test('o cartão aparece e acompanha os filtros de origem e aparelho', async () => {
    renderizar();
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'todas' } });
    const cartao = await screen.findByRole('region', { name: 'Campo a campo na janela' });
    expect(await within(cartao).findByText('Viram a janela: 10')).toBeInTheDocument();
    expect(within(cartao).getByText('Enviaram os dados: 4')).toBeInTheDocument();
    expect(within(cartao).getByText('Usaram "Usar este exemplo": 2')).toBeInTheDocument();
    expect(within(cartao).getAllByRole('listitem')[0]).toHaveTextContent(
      'Nome do negócioSaiu preenchido: 4 (40%)Saiu vazio: 1 (10%)',
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Aparelho' }), { target: { value: 'computador' } });
    expect(await within(cartao).findByText('Viram a janela: 2')).toBeInTheDocument();
    expect(within(cartao).getAllByRole('listitem')[0]).toHaveTextContent(
      'Nome do negócioSaiu preenchido: 0 (0%)Saiu vazio: 1 (50%)',
    );
  });

  test('enquanto o funil não responde o cartão fica ocupado, com o esqueleto no lugar da lista', async () => {
    vi.mocked(jornadaService.funil).mockReturnValue(new Promise<FunilJornada>(() => {}));
    renderizar();
    const cartao = await screen.findByRole('region', { name: 'Campo a campo na janela' });
    expect(cartao).toHaveAttribute('aria-busy', 'true');
    expect(within(cartao).queryByRole('list', { name: 'Campos da janela' })).not.toBeInTheDocument();
    expect(within(cartao).queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
  });

  test('com o funil em erro o cartão mostra a mensagem e "Tentar de novo" refaz a consulta e traz a lista', async () => {
    vi.mocked(jornadaService.funil).mockRejectedValueOnce(new Error('falhou'));
    renderizar();
    const cartao = await screen.findByRole('region', { name: 'Campo a campo na janela' });
    const botao = await within(cartao).findByRole('button', { name: 'Tentar de novo' });
    expect(within(cartao).getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
    expect(cartao).toHaveAttribute('aria-busy', 'false');
    const chamadas = vi.mocked(jornadaService.funil).mock.calls.length;

    fireEvent.click(botao);

    await waitFor(() => expect(vi.mocked(jornadaService.funil).mock.calls.length).toBeGreaterThan(chamadas));
    expect(await within(cartao).findByRole('list', { name: 'Campos da janela' })).toBeInTheDocument();
    expect(within(cartao).queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
  });
});
