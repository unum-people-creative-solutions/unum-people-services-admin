import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BillingCard } from './BillingCard';
import { Tenant, Contract } from '@/types/tenant';
import { tenantService } from '@/services/tenantService';
import { ApiError } from '@/lib/apiError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const renderWithQuery = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
};

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getById: vi.fn(),
    retryBilling: vi.fn(),
    retryActivation: vi.fn(),
    reactivateTenant: vi.fn(),
    cancelTenant: vi.fn(),
  },
}));

describe('BillingCard Component', () => {
  const baseTenant: Tenant = {
    id: 't-123',
    api_key: 'key',
    nome_negocio: 'Test',
    email_contato: 'test@test.com',
    documento: '123',
    nicho: 'Test',
    use_mcc_auth: false,
    status: 'pendente_asaas',
    plan_id: 'p-1',
    plan_value: 100,
    plan_cycle: 'mensal',
    activated_at: '',
    next_billing_at: '',
    renewal_at: '',
    is_blocked: false,
    created_at: '',
  };

  const createContract = (state: Contract['subscription_url_state']): Contract => ({
    plan_id: 'p-1',
    plan_type: 'pago',
    activation_fee: 0,
    monthly_value: 100,
    subscription_url_state: state,
    subscription_invoice_url: state === 'disponivel' ? 'https://asaas.com/link' : undefined,
    created_at: '',
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('T16 - deve exibir estado "aguardando_ativacao"', () => {
    renderWithQuery(<BillingCard tenant={baseTenant} contract={createContract('aguardando_ativacao')} />);
    expect(screen.getByText(/aguardando ativação|pendente/i)).toBeInTheDocument();
  });

  it('acompanha o contrato novo quando a prop muda (refetch do tenant)', () => {
    const client = createTestQueryClient();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <BillingCard tenant={baseTenant} contract={createContract('gerando')} />
      </QueryClientProvider>
    );
    expect(screen.getByText(/gerando/i)).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={client}>
        <BillingCard tenant={baseTenant} contract={createContract('erro')} />
      </QueryClientProvider>
    );
    expect(screen.getByText(/erro ao gerar/i)).toBeInTheDocument();
  });

  it('T16 - deve exibir estado "gerando"', () => {
    renderWithQuery(<BillingCard tenant={baseTenant} contract={createContract('gerando')} />);
    expect(screen.getByText(/gerando/i)).toBeInTheDocument();
  });

  it('T16 - deve exibir estado "disponivel" com botão de copiar', () => {
    renderWithQuery(<BillingCard tenant={baseTenant} contract={createContract('disponivel')} />);
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument();
    expect(screen.getByText(/link de pagamento/i)).toBeInTheDocument();
  });

  it('T16 - deve exibir estado "erro"', () => {
    renderWithQuery(<BillingCard tenant={baseTenant} contract={createContract('erro')} />);
    expect(screen.getByText(/erro ao gerar/i)).toBeInTheDocument();
  });

  it('T18 - deve fazer polling (refetch) se o estado for "gerando"', async () => {
    vi.mocked(tenantService.getById).mockResolvedValue({
      ...baseTenant,
      contract: createContract('disponivel'),
    });

    renderWithQuery(<BillingCard tenant={baseTenant} contract={createContract('gerando')} />);
    
    expect(tenantService.getById).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(tenantService.getById).toHaveBeenCalledWith('t-123');
  });

  it('T17 - deve exibir botão de tentar novamente e disparar retryBilling se erro', async () => {
    renderWithQuery(<BillingCard tenant={baseTenant} contract={createContract('erro')} />);
    
    const retryBtn = screen.getByRole('button', { name: /tentar novamente/i });
    expect(retryBtn).toBeInTheDocument();

    vi.mocked(tenantService.retryBilling).mockResolvedValue({ message: 'ok' });
    
    await act(async () => {
      fireEvent.click(retryBtn);
    });
    
    expect(tenantService.retryBilling).toHaveBeenCalledWith('t-123');
  });

  it('T21 - deve disparar toast/alerta de erro se retryBilling falhar', async () => {
    renderWithQuery(<BillingCard tenant={baseTenant} contract={createContract('erro')} />);

    const retryBtn = screen.getByRole('button', { name: /tentar novamente/i });

    vi.mocked(tenantService.retryBilling).mockRejectedValue(new Error('Network Error'));

    await act(async () => {
      fireEvent.click(retryBtn);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('UI-01 - deve exibir o link de ativação copiável quando presente', () => {
    const contract = createContract('aguardando_ativacao');
    contract.activation_invoice_url = 'https://asaas.com/activation-link';
    const awaitingTenant: Tenant = { ...baseTenant, status: 'aguardando_ativacao' };
    renderWithQuery(<BillingCard tenant={awaitingTenant} contract={contract} />);
    expect(screen.getByRole('link', { name: /link de ativação/i })).toHaveAttribute(
      'href',
      'https://asaas.com/activation-link'
    );
  });

  it('UI-06 - tenant PENDENTE_ASAAS exibe aviso e botão "Tentar ativação"', async () => {
    const pendingTenant: Tenant = { ...baseTenant, status: 'pendente_asaas' };
    renderWithQuery(<BillingCard tenant={pendingTenant} contract={undefined} />);

    const retryBtn = screen.getByRole('button', { name: /tentar ativação/i });
    expect(retryBtn).toBeInTheDocument();

    vi.mocked(tenantService.retryActivation).mockResolvedValue({ message: 'ok' });

    await act(async () => {
      fireEvent.click(retryBtn);
    });

    expect(tenantService.retryActivation).toHaveBeenCalledWith('t-123');
  });

  it('UI-07 - botão "Reativar assinatura" NÃO deve aparecer se status não for "pausado"', () => {
    const activeTenant: Tenant = { ...baseTenant, status: 'ativo' };
    renderWithQuery(<BillingCard tenant={activeTenant} contract={undefined} />);
    
    expect(screen.queryByRole('button', { name: /reativar/i })).not.toBeInTheDocument();
  });

  it('UI-08 - botão "Reativar assinatura" DEVE aparecer e acionar reactivate se status for "pausado"', async () => {
    const pausedTenant: Tenant = { ...baseTenant, status: 'pausado' };
    renderWithQuery(<BillingCard tenant={pausedTenant} contract={undefined} />);
    
    const reactivateBtn = screen.getByRole('button', { name: /reativar/i });
    expect(reactivateBtn).toBeInTheDocument();

    vi.mocked(tenantService.reactivateTenant).mockResolvedValue({ message: 'ok' });

    await act(async () => {
      fireEvent.click(reactivateBtn);
    });

    expect(tenantService.reactivateTenant).toHaveBeenCalledWith('t-123');
  });

  it('T10 - não deve exibir o botão de cancelar contrato no BillingCard', () => {
    const activeTenant: Tenant = { ...baseTenant, status: 'ativo' };
    renderWithQuery(<BillingCard tenant={activeTenant} contract={createContract('disponivel')} />);

    expect(screen.queryByRole('button', { name: /cancelar contrato/i })).not.toBeInTheDocument();
  });

  describe('[Bug reportado] tenant.status vem em MAIÚSCULAS do backend (enum TenantStatus)', () => {
    it('com status real "PAUSADO", exibe e aciona o botão "Reativar assinatura"', async () => {
      const pausedTenant: Tenant = { ...baseTenant, status: 'PAUSADO' as unknown as Tenant['status'] };
      renderWithQuery(<BillingCard tenant={pausedTenant} contract={undefined} />);

      const reactivateBtn = screen.getByRole('button', { name: /reativar/i });
      expect(reactivateBtn).toBeInTheDocument();

      vi.mocked(tenantService.reactivateTenant).mockResolvedValue({ message: 'ok' });
      await act(async () => {
        fireEvent.click(reactivateBtn);
      });
      expect(tenantService.reactivateTenant).toHaveBeenCalledWith('t-123');
    });

    it('com status real "PENDENTE_ASAAS", exibe o aviso e o botão "Tentar Ativação"', async () => {
      const pendingTenant: Tenant = { ...baseTenant, status: 'PENDENTE_ASAAS' as unknown as Tenant['status'] };
      renderWithQuery(<BillingCard tenant={pendingTenant} contract={undefined} />);

      expect(screen.getByRole('button', { name: /tentar ativação/i })).toBeInTheDocument();
    });

    it('com status real "AGUARDANDO_ATIVACAO", exibe "Aguardando confirmação" em vez de "Ativação paga"', () => {
      const contract = createContract('aguardando_ativacao');
      const awaitingTenant: Tenant = { ...baseTenant, status: 'AGUARDANDO_ATIVACAO' as unknown as Tenant['status'] };
      renderWithQuery(<BillingCard tenant={awaitingTenant} contract={{ ...contract, activation_invoice_url: 'https://asaas.com/ativacao' }} />);

      expect(screen.getByText(/aguardando confirmação do pagamento da ativação/i)).toBeInTheDocument();
      expect(screen.queryByText(/ativação paga/i)).not.toBeInTheDocument();
    });
  });

  // O cartão fica dentro do <form> do detalhe do tenant (tenants/[id]/page.tsx):
  // os botões dele não podem enviar o formulário (PATCH do tenant).
  describe('dentro do formulário do tenant', () => {
    const renderNoFormulario = (ui: React.ReactElement) => {
      const enviar = vi.fn((e: React.FormEvent) => e.preventDefault());
      renderWithQuery(<form onSubmit={enviar}>{ui}</form>);
      return enviar;
    };

    it.each([
      ['Reativar assinatura', { ...baseTenant, status: 'SUSPENSO' as unknown as Tenant['status'] }, undefined],
      ['Tentar Novamente', baseTenant, createContract('erro')],
      ['Copiar Link', baseTenant, createContract('disponivel')],
      ['Tentar Ativação', baseTenant, undefined],
    ] as const)('clicar em "%s" não envia o formulário', async (nome, tenant, contract) => {
      Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
      vi.mocked(tenantService.reactivateTenant).mockResolvedValue({ message: 'ok' });
      vi.mocked(tenantService.retryBilling).mockResolvedValue({ message: 'ok' });
      vi.mocked(tenantService.retryActivation).mockResolvedValue({ message: 'ok' });
      const enviar = renderNoFormulario(<BillingCard tenant={tenant} contract={contract} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: nome }));
      });

      expect(enviar).not.toHaveBeenCalled();
    });
  });

  // cobranca-f7 (TECH-DESIGN §11 T18): o operador também reativa conta
  // INADIMPLENTE ou SUSPENSO sem fatura vencida e sem assinatura ativa no Asaas.
  // Fora disso a API responde 409 {"error":"conta_nao_pausada"}.
  describe('cobranca-f7 — reativar conta em atraso', () => {
    // O resultado da mutação chega por setTimeout do react-query; com relógio
    // real o waitFor enxerga o alerta.
    beforeEach(() => {
      vi.useRealTimers();
    });

    const comStatus = (status: string): Tenant =>
      ({ ...baseTenant, status: status as unknown as Tenant['status'] });

    const AVISO_CONDICAO = 'Só funciona quando a conta não tem fatura vencida nem assinatura ativa no Asaas.';
    const ALERTA_409 = 'Não dá para reativar: a conta tem fatura para pagar ou assinatura ativa no Asaas.';

    it.each(['INADIMPLENTE', 'SUSPENSO'])(
      'com status real "%s", mostra "Conta em atraso.", o botão e a condição',
      async (status) => {
        renderWithQuery(<BillingCard tenant={comStatus(status)} contract={undefined} />);

        expect(screen.getByText('Conta em atraso.')).toBeInTheDocument();
        expect(screen.getByText(AVISO_CONDICAO)).toBeInTheDocument();
        expect(screen.queryByText('Assinatura pausada.')).not.toBeInTheDocument();

        const botao = screen.getByRole('button', { name: 'Reativar assinatura' });
        vi.mocked(tenantService.reactivateTenant).mockResolvedValue({ message: 'ok' });
        await act(async () => {
          fireEvent.click(botao);
        });
        expect(tenantService.reactivateTenant).toHaveBeenCalledWith('t-123');
      },
    );

    it('com status real "PAUSADO", continua "Assinatura pausada." sem a linha da condição', () => {
      renderWithQuery(<BillingCard tenant={comStatus('PAUSADO')} contract={undefined} />);

      expect(screen.getByText('Assinatura pausada.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reativar assinatura' })).toBeInTheDocument();
      expect(screen.queryByText('Conta em atraso.')).not.toBeInTheDocument();
      expect(screen.queryByText(AVISO_CONDICAO)).not.toBeInTheDocument();
    });

    it.each(['ATIVO', 'CANCELADO'])('com status real "%s", não mostra o botão', (status) => {
      renderWithQuery(<BillingCard tenant={comStatus(status)} contract={undefined} />);

      expect(screen.queryByRole('button', { name: /reativar/i })).not.toBeInTheDocument();
      expect(screen.queryByText('Conta em atraso.')).not.toBeInTheDocument();
    });

    it.each(['INADIMPLENTE', 'SUSPENSO', 'PAUSADO'])(
      'em "%s", 409 conta_nao_pausada mostra o alerta específico',
      async (status) => {
        renderWithQuery(<BillingCard tenant={comStatus(status)} contract={undefined} />);
        vi.mocked(tenantService.reactivateTenant).mockRejectedValue(
          new ApiError('conta_nao_pausada', 409, { error: 'conta_nao_pausada' }),
        );

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: 'Reativar assinatura' }));
        });

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(ALERTA_409));
        expect(screen.queryByText('Falha ao reativar assinatura.')).not.toBeInTheDocument();
      },
    );

    it.each([
      ['500', new ApiError('Failed to reactivate tenant', 500, { error: 'Failed to reactivate tenant' })],
      ['409 de outro motivo', new ApiError('cancellation_requested', 409, { error: 'cancellation_requested' })],
      ['falha de rede', new Error('Network Error')],
    ])('outro erro (%s) mostra o alerta genérico', async (_nome, erro) => {
      renderWithQuery(<BillingCard tenant={comStatus('SUSPENSO')} contract={undefined} />);
      vi.mocked(tenantService.reactivateTenant).mockRejectedValue(erro);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Reativar assinatura' }));
      });

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falha ao reativar assinatura.'));
      expect(screen.queryByText(ALERTA_409)).not.toBeInTheDocument();
    });
  });
});
