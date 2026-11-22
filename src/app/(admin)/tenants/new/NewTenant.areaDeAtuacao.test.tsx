import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import NewTenantPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useRouter } from 'next/navigation';

// O CEP digitado não consulta o ViaCEP de verdade: a resposta real chegaria num tempo que o teste não controla.
vi.mock('@/lib/viaCep', () => ({ buscarCep: vi.fn().mockResolvedValue(null) }));

vi.mock('@/services/tenantService', () => ({
  tenantService: { create: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn().mockResolvedValue({
      active: [
        { slug: 'plan_mock_1', nome: 'Mock Plan', activation_fee: 100, monthly_value: 50, included_services: ['site', 'blog'] },
      ],
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

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));

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

function preencherSemArea(container: HTMLElement) {
  fireEvent.change(screen.getByRole('combobox', { name: /plano/i }), { target: { value: 'livre' } });
  fireEvent.change(container.querySelector('[name="nome_negocio"]')!, { target: { value: 'Empresa Teste' } });
  fireEvent.change(container.querySelector('[name="documento"]')!, { target: { value: '94.586.814/0001-01' } });
  fireEvent.change(container.querySelector('[name="nome_admin"]')!, { target: { value: 'Admin Teste' } });
  fireEvent.change(container.querySelector('[name="email_contato"]')!, { target: { value: 'admin@teste.com' } });
  fireEvent.change(container.querySelector('[name="endereco.cep"]')!, { target: { value: '82515000' } });
  fireEvent.change(container.querySelector('[name="endereco.logradouro"]')!, { target: { value: 'Rua Teste' } });
  fireEvent.change(container.querySelector('[name="endereco.numero"]')!, { target: { value: '123' } });
  fireEvent.change(container.querySelector('[name="endereco.bairro"]')!, { target: { value: 'Centro' } });
}

describe('Criar empresa: Área de atuação (RF-AA-04, RF-AA-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  test('é um combobox "Área de atuação" com "Selecione" e as 13 áreas, na ordem', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>,
    );

    const combo = screen.getByRole('combobox', { name: 'Área de atuação' });
    const opcoes = within(combo).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Selecione', ...AREAS]);
    expect(combo).toHaveValue('');
  });

  test('escolher "Saúde" e salvar manda nicho "Saúde"', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>,
    );

    preencherSemArea(container);
    fireEvent.change(await screen.findByLabelText(/Termo de Contratação/i), { target: { value: 'term_mock_1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Área de atuação' }), { target: { value: 'Saúde' } });
    fireEvent.click(screen.getByRole('button', { name: /criar tenant/i }));

    await waitFor(() => expect(tenantService.create).toHaveBeenCalled());
    expect(vi.mocked(tenantService.create).mock.calls[0][0].nicho).toBe('Saúde');
  });

  test('sem escolher a área mostra "Campo obrigatório" e não chama a API', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>,
    );

    preencherSemArea(container);
    fireEvent.change(await screen.findByLabelText(/Termo de Contratação/i), { target: { value: 'term_mock_1' } });
    fireEvent.click(screen.getByRole('button', { name: /criar tenant/i }));

    const combo = screen.getByRole('combobox', { name: 'Área de atuação' });
    const bloco = combo.parentElement as HTMLElement;
    expect(await within(bloco).findByText('Campo obrigatório')).toBeInTheDocument();
    expect(tenantService.create).not.toHaveBeenCalled();
  });
});
