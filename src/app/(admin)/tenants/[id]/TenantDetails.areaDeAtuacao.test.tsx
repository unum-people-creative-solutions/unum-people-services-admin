import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TenantDetailsPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useParams, useRouter } from 'next/navigation';
import type { Tenant } from '@/types/tenant';

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

vi.mock('next/navigation', () => ({ useParams: vi.fn(), useRouter: vi.fn() }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const AREAS = [
  'Saúde',
  'Beleza e estética',
  'Bem-estar e esporte',
  'Alimentação',
  'Comércio e lojas',
  'Serviços para casa',
  'Serviços profissionais',
  'Educação e cursos',
  'Tecnologia e marketing',
  'Imóveis',
  'Automotivo',
  'Eventos e fotografia',
  'Outro',
];

function tenantComNicho(nicho: string | undefined): Tenant {
  return {
    id: 'tenant-123',
    api_key: 'up_test_key_123',
    nome_negocio: '828 Imóveis',
    email_contato: 'contato@828imoveis.com.br',
    documento: '11222333000181',
    nicho,
    status: 'ativo',
    plan_id: 'lp_basico',
    plan_value: 199,
    plan_cycle: 'mensal',
    activated_at: new Date().toISOString(),
    next_billing_at: new Date().toISOString(),
    renewal_at: new Date().toISOString(),
    is_blocked: false,
    created_at: new Date().toISOString(),
    use_mcc_auth: false,
    celular: '41998785535',
  } as Tenant;
}

async function abrir(nicho: string | undefined) {
  vi.mocked(tenantService.getById).mockResolvedValue(tenantComNicho(nicho));
  render(
    <QueryClientProvider client={queryClient}>
      <TenantDetailsPage />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(tenantService.getById).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText(/carregando/i)).toBeNull());
  return screen.getByRole('combobox', { name: 'Área de atuação' }) as HTMLSelectElement;
}

describe('Editar empresa: Área de atuação (RF-AA-04, RF-AA-06)', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: 'tenant-123' });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(tenantService.update).mockResolvedValue({ message: 'ok' });
  });

  test('nicho vazio mostra "Selecione" selecionado e as 13 áreas, na ordem', async () => {
    const combo = await abrir(undefined);

    const opcoes = within(combo).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Selecione', ...AREAS]);
    expect(combo).toHaveValue('');
  });

  test('nicho "Saúde" mostra "Saúde" selecionado e nenhuma opção extra', async () => {
    const combo = await abrir('Saúde');

    expect(combo).toHaveValue('Saúde');
    const opcoes = within(combo).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Selecione', ...AREAS]);
  });

  test('nicho "MEDICINA" aparece como "Valor antigo: MEDICINA", selecionado', async () => {
    const combo = await abrir('MEDICINA');

    const opcoes = within(combo).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Selecione', ...AREAS, 'Valor antigo: MEDICINA']);
    expect(combo).toHaveValue('MEDICINA');
    expect(screen.getByRole('option', { name: 'Valor antigo: MEDICINA', selected: true })).toBeInTheDocument();
  });

  test('salvar sem mexer na área mantém o valor antigo (não apaga nem troca)', async () => {
    const combo = await abrir('MEDICINA');

    fireEvent.change(screen.getByRole('textbox', { name: /celular/i }), { target: { value: '41999998888' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(tenantService.update).toHaveBeenCalled());
    const corpo = vi.mocked(tenantService.update).mock.calls[0][1] as { nicho?: string };
    expect(corpo.nicho === undefined || corpo.nicho === 'MEDICINA').toBe(true);
    expect(combo).toHaveValue('MEDICINA');
  });

  test('escolher "Saúde" manda nicho "Saúde"', async () => {
    const combo = await abrir('MEDICINA');

    fireEvent.change(combo, { target: { value: 'Saúde' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(tenantService.update).toHaveBeenCalledWith('tenant-123', expect.objectContaining({ nicho: 'Saúde' })),
    );
  });
});
