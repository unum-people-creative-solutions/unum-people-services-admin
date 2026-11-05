import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import DashboardPage from './page';
import { tenantService } from '@/services/tenantService';
import { jornadaService } from '@/services/jornadaService';
import { ApiError } from '@/lib/apiError';
import type { FunilJornada } from '@/types/jornada';

// spec-2-painel RF-2-06, CA-2-06, CA-2-09; blueprint §2.

vi.mock('@/services/tenantService', () => ({
  tenantService: { getStats: vi.fn(), getLogs: vi.fn(), getSystemErrors: vi.fn() },
}));
vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));

const funil: FunilJornada = {
  etapas: [
    { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 100 },
    { etapa: 1, aparelho: 'computador', origem: 'direto', visitas: 20 },
    { etapa: 2, aparelho: 'celular', origem: 'google_ads', visitas: 48 },
    { etapa: 3, aparelho: 'celular', origem: 'google_ads', visitas: 30 },
    { etapa: 4, aparelho: 'celular', origem: 'google_ads', visitas: 21 },
    { etapa: 5, aparelho: 'celular', origem: 'google_ads', visitas: 16 },
    { etapa: 6, aparelho: 'celular', origem: 'google_ads', visitas: 8 },
    { etapa: 7, aparelho: 'celular', origem: 'google_ads', visitas: 4 },
    { etapa: 8, aparelho: 'celular', origem: 'google_ads', visitas: 3 },
  ],
  uso: [],
  pagou: [{ aparelho: 'celular', origem: 'google_ads', visitas: 2 }],
};

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('Dashboard: funil da vitrine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T15:00:00Z'));
    vi.mocked(tenantService.getStats).mockResolvedValue({
      total_tenants: 3, active_tenants: 1, blocked_tenants: 1, estimated_mrr: 99, system_health: 'stable',
    });
    vi.mocked(tenantService.getLogs).mockResolvedValue([]);
    vi.mocked(tenantService.getSystemErrors).mockResolvedValue([]);
    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
  });

  afterEach(() => vi.useRealTimers());

  test('pede os últimos 7 dias em UTC', async () => {
    renderizar();
    await screen.findByRole('region', { name: /funil da vitrine/i });
    expect(jornadaService.funil).toHaveBeenCalledWith('2026-10-30', '2026-11-05');
  });

  test('mostra as 9 etapas com número e taxa sobre Visitou, e o link Ver a jornada', async () => {
    renderizar();
    const secao = await screen.findByRole('region', { name: /funil da vitrine · últimos 7 dias/i });
    const etapas = await within(secao).findAllByRole('listitem');
    expect(etapas.map((li) => li.textContent)).toEqual([
      'Visitou120',
      'Abriu o configurador4840%',
      'Escolheu modelo e tema3025%',
      'Editou2118%',
      'Viu a página final1613%',
      'Abriu a contratação87%',
      'Enviou a contratação43%',
      'Contratou33%',
      'Pagou22%',
    ]);
    expect(within(secao).getByRole('link', { name: /ver a jornada/i })).toHaveAttribute('href', '/dashboard/jornada');
  });

  test('período sem visitas mostra o aviso no lugar das barras', async () => {
    vi.mocked(jornadaService.funil).mockResolvedValue({ etapas: [], uso: [], pagou: [] });
    renderizar();
    const secao = await screen.findByRole('region', { name: /funil da vitrine/i });
    expect(await within(secao).findByText('Nenhuma visita registrada nos últimos 7 dias.')).toBeInTheDocument();
    expect(within(secao).queryByRole('listitem')).not.toBeInTheDocument();
  });

  test('CA-2-09: erro mostra a mensagem e Tentar de novo refaz a chamada', async () => {
    vi.mocked(jornadaService.funil).mockRejectedValueOnce(new ApiError('internal', 500));
    renderizar();
    const secao = await screen.findByRole('region', { name: /funil da vitrine/i });
    expect(await within(secao).findByText('Não foi possível carregar.')).toBeInTheDocument();
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(secao).findByText('Visitou')).toBeInTheDocument();
    expect(jornadaService.funil).toHaveBeenCalledTimes(2);
  });

  test('carregando marca a seção com aria-busy', async () => {
    vi.mocked(jornadaService.funil).mockReturnValue(new Promise(() => {}));
    renderizar();
    const secao = await screen.findByRole('region', { name: /funil da vitrine/i });
    expect(secao).toHaveAttribute('aria-busy', 'true');
  });

  test('D4: cartão Ativos passa a Ativos (pagos)', async () => {
    renderizar();
    expect(await screen.findByText('Ativos (pagos)')).toBeInTheDocument();
    expect(screen.queryByText('Ativos')).not.toBeInTheDocument();
  });
});
