import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TenantDetailsPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { ApiError } from '@/lib/apiError';
import { useParams, useRouter } from 'next/navigation';

// spec: planos-v2-marca-e-dominio RF-F05 e RF-F06 (T11); TECH-DESIGN T6.

vi.mock('@/services/acessoService', () => ({
  acessoService: {
    catalogo: vi.fn().mockResolvedValue({ ferramentas: [] }),
    listarPapeis: vi.fn().mockResolvedValue([]),
    historico: vi.fn().mockResolvedValue({ registros: [], cursor: '' }),
  },
}));

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getById: vi.fn(),
    update: vi.fn(),
    changePlan: vi.fn(),
    updateBillingMethod: vi.fn(),
    delete: vi.fn(),
    resetPassword: vi.fn(),
    listUsers: vi.fn().mockResolvedValue([]),
    cancelContract: vi.fn(),
    listInvoices: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn().mockResolvedValue({
      active: [{ slug: 'lp_basico', nome: 'LP Básico', monthly_value: 199, activation_fee: 0, included_services: ['site', 'blog'] }],
      inactive: [],
    }),
  },
}));

vi.mock('@/services/termService', () => ({
  termService: {
    list: vi.fn().mockResolvedValue([
      { id: 'term_mock_1', name: 'Termo Mock', description: '', is_active: true, current_version: 1 },
    ]),
  },
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

const MENSAGEM_DOMINIO_LIGADO =
  'Este plano não inclui domínio próprio e a empresa tem um domínio ligado. Remova o domínio antes de trocar o plano.';

const mockTenant = {
  id: 'tenant-123',
  nome_negocio: 'Empresa Teste',
  email_contato: 'contato@teste.com',
  documento: '12345678909',
  nicho: 'SAUDE',
  site_url: 'https://teste.com',
  api_key: 'up_test_key_123456789',
  enabled_services: ['site', 'blog'],
  google_ads_customer_id: '123-456-7890',
  use_mcc_auth: false,
  plan_id: 'lp_basico',
  plan_status: 'ativo',
  plan_value: 199,
  plan_cycle: 'mensal',
  activated_at: new Date().toISOString(),
  next_billing_at: new Date().toISOString(),
  renewal_at: new Date().toISOString(),
  is_blocked: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantDetailsPage />
    </QueryClientProvider>
  );
}

describe('TenantDetailsPage - plano sem domínio próprio e arrependimento em 14 dias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: 'tenant-123' });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never);
    vi.mocked(tenantService.getById).mockResolvedValue(mockTenant as never);
  });

  test('RF-F05 — 409 dominio_ligado na troca de plano mostra a mensagem no elemento de erro', async () => {
    vi.mocked(tenantService.changePlan).mockRejectedValue(
      new ApiError('dominio_ligado', 409, { error: 'dominio_ligado' }),
    );

    renderPage();

    const planSelect = await screen.findByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'livre' } });
    fireEvent.change(await screen.findByLabelText(/Termo de Contratação/i), { target: { value: 'term_mock_1' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await screen.findByText(/Confirmar Troca de Plano/i);
    fireEvent.click(screen.getByRole('button', { name: /confirmar troca/i }));

    await waitFor(() => expect(tenantService.changePlan).toHaveBeenCalled());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(MENSAGEM_DOMINIO_LIGADO);
    expect(alert).not.toHaveTextContent('dominio_ligado');
  });

  test('RF-F05 — outro erro da troca de plano continua com a mensagem da API', async () => {
    vi.mocked(tenantService.changePlan).mockRejectedValue(
      new ApiError('plan_not_found', 404, { error: 'plan_not_found' }),
    );

    renderPage();

    const planSelect = await screen.findByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'livre' } });
    fireEvent.change(await screen.findByLabelText(/Termo de Contratação/i), { target: { value: 'term_mock_1' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await screen.findByText(/Confirmar Troca de Plano/i);
    fireEvent.click(screen.getByRole('button', { name: /confirmar troca/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('plan_not_found');
    expect(alert).not.toHaveTextContent(MENSAGEM_DOMINIO_LIGADO);
  });

  test('RF-F05 — 409 com outro código que não dominio_ligado mantém a mensagem da API', async () => {
    // validation N18: o mapeamento é por status + código; só o par 409/dominio_ligado troca a mensagem.
    vi.mocked(tenantService.changePlan).mockRejectedValue(
      new ApiError('outro_motivo', 409, { error: 'outro_motivo' }),
    );

    renderPage();

    const planSelect = await screen.findByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'livre' } });
    fireEvent.change(await screen.findByLabelText(/Termo de Contratação/i), { target: { value: 'term_mock_1' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await screen.findByText(/Confirmar Troca de Plano/i);
    fireEvent.click(screen.getByRole('button', { name: /confirmar troca/i }));

    await waitFor(() => expect(tenantService.changePlan).toHaveBeenCalled());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('outro_motivo');
    expect(alert).not.toHaveTextContent(MENSAGEM_DOMINIO_LIGADO);
  });

  test('RF-F06 — o aviso de cancelar contrato fala em 14 dias, não em 7', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /mostrar ações/i }));
    fireEvent.click(await screen.findByRole('button', { name: /cancelar contrato/i }));
    await screen.findByRole('heading', { name: /cancelar contrato/i });

    expect(screen.getByText(/há até 14 dias/)).toBeInTheDocument();
    expect(screen.queryByText(/há até 7 dias/)).toBeNull();
  });
});
