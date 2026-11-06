import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import LogsPage from './page';
import { tenantService } from '@/services/tenantService';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getSystemErrors: vi.fn().mockResolvedValue([]),
    getLogs: vi.fn().mockResolvedValue([]),
  },
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('LogsPage - filtro de serviço', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inclui Public e Asaas Worker entre as opções de serviço (lambdas do webhook Asaas)', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogsPage />
      </QueryClientProvider>
    );

    expect(screen.getByRole('option', { name: 'Public (Webhooks)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Asaas Worker' })).toBeInTheDocument();
  });

  it('ao selecionar "Public (Webhooks)", consulta o backend com service=Public', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogsPage />
      </QueryClientProvider>
    );

    const selects = screen.getAllByRole('combobox');
    const serviceSelect = selects[0];
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(serviceSelect, { target: { value: 'Public' } });

    await vi.waitFor(() => {
      expect(tenantService.getSystemErrors).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'Public' })
      );
    });
  });

  it('na fonte de auditoria, mostra a data do registro (created_at do contrato)', async () => {
    const criadoEm = '2026-03-01T12:00:00Z';
    vi.mocked(tenantService.getLogs).mockResolvedValue([
      { tenant_id: 't1', sk: 'AUDIT#1', actor: 'Admin', action: 'TENANT_CREATED', target_id: 't1', ip_address: '127.0.0.1', request_id: 'req-1', expires_at: 0, created_at: criadoEm },
    ]);
    const { fireEvent } = await import('@testing-library/react');

    render(
      <QueryClientProvider client={queryClient}>
        <LogsPage />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Auditoria de Negócio/i }));

    expect(await screen.findByText(new Date(criadoEm).toLocaleString())).toBeInTheDocument();
  });
});

// Os mesmos períodos da Jornada, com 24 horas por padrão.
describe('LogsPage - período', () => {
  const T = Date.UTC(2026, 10, 6, 18, 0, 0);
  const HORA = 3_600_000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T);
    vi.mocked(tenantService.getSystemErrors).mockResolvedValue([]);
    vi.mocked(tenantService.getLogs).mockResolvedValue([]);
  });

  afterEach(() => vi.useRealTimers());

  function renderizar() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <LogsPage />
      </QueryClientProvider>
    );
  }

  it('oferece os nove períodos da Jornada, na ordem, com 24 horas selecionado', () => {
    renderizar();
    const periodo = screen.getByRole('combobox', { name: 'Período' });
    expect(within(periodo).getAllByRole('option').map((o) => o.textContent)).toEqual([
      '1 h', '3 h', '6 h', '12 h', '24 horas', '3 dias', '7 dias', '15 dias', '30 dias',
    ]);
    expect(within(periodo).getByRole('option', { name: '24 horas' })).toHaveProperty('selected', true);
  });

  it('ao abrir, consulta os erros das últimas 24 horas', async () => {
    renderizar();
    await vi.waitFor(() => {
      expect(tenantService.getSystemErrors).toHaveBeenCalledWith(
        expect.objectContaining({ start: new Date(T - 24 * HORA).toISOString() })
      );
    });
  });

  it('ao escolher "3 h", consulta as últimas 3 horas', async () => {
    renderizar();
    fireEvent.change(screen.getByRole('combobox', { name: 'Período' }), { target: { value: '3 h' } });
    await vi.waitFor(() => {
      expect(tenantService.getSystemErrors).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: new Date(T - 3 * HORA).toISOString() })
      );
    });
  });

  it('a auditoria usa o mesmo período, de 15 dias atrás até agora', async () => {
    renderizar();
    fireEvent.change(screen.getByRole('combobox', { name: 'Período' }), { target: { value: '15 dias' } });
    fireEvent.click(screen.getByRole('button', { name: /Auditoria de Negócio/i }));
    await vi.waitFor(() => {
      expect(tenantService.getLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: new Date(T - 15 * 24 * HORA).toISOString(), end: new Date(T).toISOString() })
      );
    });
  });
});
