import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import type { FunilJornada } from '@/types/jornada';

// medicao-de-mercado M2 (RF-MM-2d, T20): o cartão "Motivos da reserva" ao lado do "Uso do editor",
// com os mesmos filtros e o mesmo período.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
// O cartão "Uso do Tools" (medicao-de-uso) tem teste próprio em page.usoDoTools.test.tsx; aqui fica sem resposta.
vi.mock('@/services/toolsUsoService', () => ({ toolsUsoService: { resumo: vi.fn(() => new Promise(() => {})) } }));
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => '/dashboard/jornada') }));

const funil: FunilJornada = {
  etapas: [{ etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 10 }],
  uso: [
    { evento: 'lp_site_montado_reserva', aparelho: 'celular', origem: 'google_ads', visitas: 5 },
    { evento: 'lp_site_montado_reserva', aparelho: 'computador', origem: 'direto', visitas: 2 },
    { evento: 'lp_erro_montagem_rede', aparelho: 'celular', origem: 'google_ads', visitas: 3 },
    { evento: 'lp_erro_montagem_prazo_ia', aparelho: 'computador', origem: 'direto', visitas: 2 },
    { evento: 'lp_verificacao_token_s_6', aparelho: 'celular', origem: 'google_ads', visitas: 4 },
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

describe('Jornada: Motivos da reserva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
    vi.mocked(jornadaService.visitas).mockResolvedValue([]);
  });

  test('o cartão aparece com os totais e a mediana, e acompanha os filtros de origem e aparelho', async () => {
    renderizar();
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'todas' } });
    const cartao = await screen.findByRole('region', { name: 'Motivos da reserva' });
    expect(await within(cartao).findByText('Visitas que caíram na reserva: 7')).toBeInTheDocument();
    expect(within(cartao).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['IA passou de 27 s2', 'falha de rede3']);
    expect(within(cartao).getByText('Tempo mediano do token anti-robô: 6 s')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Aparelho' }), { target: { value: 'computador' } });
    expect(await within(cartao).findByText('Visitas que caíram na reserva: 2')).toBeInTheDocument();
    expect(within(cartao).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['IA passou de 27 s2']);
    expect(within(cartao).queryByText(/Tempo mediano/)).toBeNull();
  });
});
