import { render, screen } from '@testing-library/react';
import TenantDetailsPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useParams, useRouter } from 'next/navigation';

// A seção de usuários lê catálogo e papéis (gestao-de-acesso-f2).
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
    listSites: vi.fn().mockResolvedValue([]),
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

// fix-achados-2b-3-5, achado 3: "Próximo Débito" mostra contract.paid_until
// (AAAA-MM-DD) como DD/MM/AAAA, sem passar por new Date(), e não mais o
// next_billing_at, que é gravado na criação e nunca muda.
const NEXT_BILLING_AT = '2026-12-15T12:00:00Z';

const baseTenant = {
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
  plan_cycle: 'anual',
  activated_at: '2026-11-15T12:00:00Z',
  next_billing_at: NEXT_BILLING_AT,
  renewal_at: '2027-11-14T12:00:00Z',
  is_blocked: false,
};

const baseContract = {
  plan_id: 'lp_basico',
  plan_type: 'pago',
  activation_fee: 0,
  monthly_value: 199,
  created_at: '2026-11-15T12:00:00Z',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantDetailsPage />
    </QueryClientProvider>
  );
}

async function valorDoProximoDebito(): Promise<string> {
  const rotulo = await screen.findByText('Próximo Débito:');
  const linha = rotulo.parentElement as HTMLElement;
  return (linha.textContent ?? '').replace('Próximo Débito:', '').trim();
}

describe('TenantDetailsPage - Próximo Débito (fix-achados-2b-3-5, 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: 'tenant-123' });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never);
  });

  test('critério 6 - mostra "15/11/2027" a partir de contract.paid_until e não a data de next_billing_at', async () => {
    vi.mocked(tenantService.getById).mockResolvedValue({
      ...baseTenant,
      contract: { ...baseContract, paid_until: '2027-11-15' },
    } as never);

    renderPage();

    const valor = await valorDoProximoDebito();
    expect(valor).toBe('15/11/2027');
    expect(valor).not.toContain(new Date(NEXT_BILLING_AT).toLocaleDateString());
    expect(screen.queryByText('15/12/2026')).toBeNull();
  });

  test('critério 7 - sem paid_until no contrato mostra "—"', async () => {
    vi.mocked(tenantService.getById).mockResolvedValue({
      ...baseTenant,
      contract: { ...baseContract },
    } as never);

    renderPage();

    expect(await valorDoProximoDebito()).toBe('—');
  });

  test('critério 7 - paid_until vazio mostra "—"', async () => {
    vi.mocked(tenantService.getById).mockResolvedValue({
      ...baseTenant,
      contract: { ...baseContract, paid_until: '' },
    } as never);

    renderPage();

    expect(await valorDoProximoDebito()).toBe('—');
  });

  test('critério 7 - tenant sem contrato mostra "—"', async () => {
    vi.mocked(tenantService.getById).mockResolvedValue({ ...baseTenant } as never);

    renderPage();

    expect(await valorDoProximoDebito()).toBe('—');
  });
});
