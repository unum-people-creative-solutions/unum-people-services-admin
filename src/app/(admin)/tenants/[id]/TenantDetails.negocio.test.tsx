import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TenantDetailsPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useParams, useRouter } from 'next/navigation';
import { ApiError } from '@/lib/apiError';
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

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockTenantComNegocio: Tenant = {
  id: 'tenant-123',
  api_key: 'up_test_key_123',
  nome_negocio: '828 Imóveis',
  email_contato: 'contato@828imoveis.com.br',
  documento: '11222333000181',
  nicho: 'IMOBILIARIA',
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
  endereco: {
    cep: '82515000',
    logradouro: 'Av. Pref. Erasto Gaertner',
    numero: '2423',
    complemento: 'Sala 03',
    bairro: 'Bacacheri',
    cidade: 'Curitiba',
    uf: 'PR',
  },
  endereco_pendente: true,
};

describe('T20 — Dados do Negócio no Admin (RF-DNG-22, CA-DNG-20)', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: 'tenant-123' });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(tenantService.getById).mockResolvedValue(mockTenantComNegocio);
  });

  test('CPF/CNPJ aparece como texto no card (sem textbox no card), Celular e Endereço aparecem, e o selo de endereço pendente é exibido', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(tenantService.getById).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/carregando/i)).toBeNull());

    // Selo "Sem endereço: a nota fiscal não sai" visível
    expect(screen.getByText('Sem endereço: a nota fiscal não sai')).toBeInTheDocument();

    // Card Dados Institucionais
    const cardTitulo = screen.getByText(/dados institucionais/i);
    const card = cardTitulo.closest('.bg-white') as HTMLElement;
    expect(card).toBeInTheDocument();

    // Rótulo do e-mail atualizado
    expect(within(card).getByText(/e-mail de cobrança e login do primeiro administrador/i)).toBeInTheDocument();

    // CPF/CNPJ como texto formatado, sem textbox no card
    expect(within(card).getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(within(card).queryByRole('textbox', { name: /documento|cpf|cnpj/i })).toBeNull();

    // Celular como campo editável
    const celularInput = within(card).getByRole('textbox', { name: /celular/i }) as HTMLInputElement;
    expect(celularInput).toBeInTheDocument();
    expect(celularInput.value).toBe('41998785535');

    // Campos de Endereço presentes
    expect(within(card).getByRole('textbox', { name: /cep/i })).toHaveValue('82515000');
    expect(within(card).getByRole('textbox', { name: /logradouro|rua/i })).toHaveValue('Av. Pref. Erasto Gaertner');
    expect(within(card).getByRole('textbox', { name: /número/i })).toHaveValue('2423');
    expect(within(card).getByRole('textbox', { name: /bairro/i })).toHaveValue('Bacacheri');
    expect(within(card).getByRole('textbox', { name: /cidade/i })).toHaveValue('Curitiba');
    expect(within(card).getByRole('textbox', { name: /uf/i })).toHaveValue('PR');
  });

  test('erro 422 com detalhe do Asaas aparece no card em role="alert" como texto', async () => {
    vi.mocked(tenantService.update).mockRejectedValueOnce(
      new ApiError('O Asaas recusou: CEP do cliente é inválido. Confira o endereço.', 422, {
        erro: 'asaas_recusou',
        detalhe: 'CEP do cliente é inválido.',
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(tenantService.getById).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/carregando/i)).toBeNull());

    const cardTitulo = screen.getByText(/dados institucionais/i);
    const card = cardTitulo.closest('.bg-white') as HTMLElement;

    // Altera o celular para tornar o card dirty
    const celularInput = within(card).getByRole('textbox', { name: /celular/i });
    fireEvent.change(celularInput, { target: { value: '41999998888' } });

    // Clica no botão Salvar Alterações
    const salvarBtn = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(salvarBtn);

    await waitFor(() => expect(tenantService.update).toHaveBeenCalled());

    await waitFor(() => {
      const alerta = within(card).getByRole('alert');
      expect(alerta).toHaveTextContent('O Asaas recusou: CEP do cliente é inválido. Confira o endereço.');
    });
  });

  test('salva com sucesso incluindo celular e endereco alterados', async () => {
    vi.mocked(tenantService.update).mockResolvedValueOnce({
      message: 'Tenant atualizado com sucesso',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(tenantService.getById).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/carregando/i)).toBeNull());

    const cardTitulo = screen.getByText(/dados institucionais/i);
    const card = cardTitulo.closest('.bg-white') as HTMLElement;

    const celularInput = within(card).getByRole('textbox', { name: /celular/i });
    fireEvent.change(celularInput, { target: { value: '41999998888' } });

    const numeroInput = within(card).getByRole('textbox', { name: /número/i });
    fireEvent.change(numeroInput, { target: { value: '2500' } });

    const salvarBtn = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(salvarBtn);

    await waitFor(() => {
      expect(tenantService.update).toHaveBeenCalledWith('tenant-123', expect.objectContaining({
        celular: '41999998888',
        endereco: expect.objectContaining({
          numero: '2500',
        }),
      }));
    });
  });

  test('erro 503 Asaas indisponivel aparece no card em role="alert"', async () => {
    vi.mocked(tenantService.update).mockRejectedValueOnce(
      new ApiError('O sistema financeiro está temporariamente fora do ar. Tente novamente em alguns minutos.', 503, {
        erro: 'asaas_indisponivel',
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(tenantService.getById).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/carregando/i)).toBeNull());

    const cardTitulo = screen.getByText(/dados institucionais/i);
    const card = cardTitulo.closest('.bg-white') as HTMLElement;

    const celularInput = within(card).getByRole('textbox', { name: /celular/i });
    fireEvent.change(celularInput, { target: { value: '41999998888' } });

    const salvarBtn = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(salvarBtn);

    await waitFor(() => {
      const alerta = within(card).getByRole('alert');
      expect(alerta).toHaveTextContent('O sistema financeiro está temporariamente fora do ar. Tente novamente em alguns minutos.');
    });
  });
});
