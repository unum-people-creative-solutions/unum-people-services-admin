import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewTenantPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useRouter } from 'next/navigation';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn().mockResolvedValue({
      active: [
        { slug: 'plan_mock_1', nome: 'Mock Plan', activation_fee: 100, monthly_value: 50, included_services: ['site', 'blog'] }
      ],
      inactive: []
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
  useRouter: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('T21 — Criar Tenant com Regras de Endereço (RF-DNG-23, CA-DNG-21)', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
  });

  const preencherDadosBasicos = (container: HTMLElement) => {
    fireEvent.change(container.querySelector('[name="nome_negocio"]')!, { target: { value: 'Empresa Teste' } });
    fireEvent.change(container.querySelector('[name="nicho"]')!, { target: { value: 'Tecnologia' } });
    fireEvent.change(container.querySelector('[name="nome_admin"]')!, { target: { value: 'Admin Responsavel' } });
    fireEvent.change(container.querySelector('[name="email_contato"]')!, { target: { value: 'admin@teste.com' } });
  };

  test('plano Pago com endereço vazio não chama tenantService.create e mostra alerta no bloco de endereço', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    preencherDadosBasicos(container);

    // Seleciona plano Pago e documento válido
    fireEvent.change(screen.getByRole('combobox', { name: /plano/i }), { target: { value: 'plan_mock_1' } });
    fireEvent.change(screen.getByLabelText(/Documento \(CPF\/CNPJ\)/i), { target: { value: '11.222.333/0001-81' } });

    // Submete sem preencher endereço
    const submitBtn = screen.getByRole('button', { name: /criar tenant/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alerta = screen.getByRole('alert');
      expect(alerta).toHaveTextContent(/endereço/i);
    });

    expect(tenantService.create).not.toHaveBeenCalled();
  });

  test('plano Personalizado com endereço vazio não chama tenantService.create e mostra alerta', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    preencherDadosBasicos(container);

    // Seleciona plano Personalizado, termo e documento válido
    fireEvent.change(screen.getByRole('combobox', { name: /plano/i }), { target: { value: 'personalizado' } });
    fireEvent.change(await screen.findByLabelText(/Termo de Contratação/i), { target: { value: 'term_mock_1' } });
    fireEvent.change(screen.getByLabelText(/Documento \(CPF\/CNPJ\)/i), { target: { value: '11.222.333/0001-81' } });

    // Submete sem preencher endereço
    const submitBtn = screen.getByRole('button', { name: /criar tenant/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alerta = screen.getByRole('alert');
      expect(alerta).toHaveTextContent(/endereço/i);
    });

    expect(tenantService.create).not.toHaveBeenCalled();
  });

  test('plano Livre sem endereço submete e chama tenantService.create normalmente', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    preencherDadosBasicos(container);

    // Seleciona plano Livre
    fireEvent.change(screen.getByRole('combobox', { name: /plano/i }), { target: { value: 'livre' } });
    fireEvent.change(await screen.findByLabelText(/Termo de Contratação/i), { target: { value: 'term_mock_1' } });

    // Submete
    const submitBtn = screen.getByRole('button', { name: /criar tenant/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(tenantService.create).toHaveBeenCalled();
    });
  });

  test('plano Pago com endereço completo envia os campos de endereço no payload', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    preencherDadosBasicos(container);

    // Seleciona plano Pago e documento válido
    fireEvent.change(screen.getByRole('combobox', { name: /plano/i }), { target: { value: 'plan_mock_1' } });
    fireEvent.change(screen.getByLabelText(/Documento \(CPF\/CNPJ\)/i), { target: { value: '11.222.333/0001-81' } });

    // Preenche campos de endereço
    fireEvent.change(screen.getByRole('textbox', { name: /cep/i }), { target: { value: '82515000' } });
    fireEvent.change(screen.getByRole('textbox', { name: /logradouro|rua/i }), { target: { value: 'Av. Pref. Erasto Gaertner' } });
    fireEvent.change(screen.getByRole('textbox', { name: /número/i }), { target: { value: '2423' } });
    fireEvent.change(screen.getByRole('textbox', { name: /bairro/i }), { target: { value: 'Bacacheri' } });
    fireEvent.change(screen.getByRole('textbox', { name: /cidade/i }), { target: { value: 'Curitiba' } });
    fireEvent.change(screen.getByRole('textbox', { name: /uf/i }), { target: { value: 'PR' } });

    // Submete
    const submitBtn = screen.getByRole('button', { name: /criar tenant/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(tenantService.create).toHaveBeenCalledWith(expect.objectContaining({
        endereco: expect.objectContaining({
          cep: '82515000',
          logradouro: 'Av. Pref. Erasto Gaertner',
          numero: '2423',
          bairro: 'Bacacheri',
          cidade: 'Curitiba',
          uf: 'PR',
        }),
      }));
    });
  });
});
