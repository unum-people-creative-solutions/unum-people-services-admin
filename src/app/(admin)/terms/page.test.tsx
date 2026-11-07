import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TermsPage from './page';
import { ApiError } from '@/lib/apiError';
import { comoMock, OpcoesDeMutation } from '@/test/mocks';
import type { Term } from '@/types/term';
// JSON real de GET /admin/terms com bloqueio_exclusao (L-071).
import fixtureTermos from '@/services/__fixtures__/terms-lista.json';
// JSON real de GET /admin/terms com os três tipos e um termo antigo sem tipo (L-071).
import fixtureTipos from '@/services/__fixtures__/terms-tipos.json';

vi.mock('@/services/termService', () => ({
  termService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listVersions: vi.fn(),
    publishVersion: vi.fn(),
    deleteVersion: vi.fn(),
  }
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useQuery: vi.fn(),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

describe('TermsPage', () => {
  it('renderiza seções de Termos Ativos e Desativados', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({
      data: [
        { id: 't1', name: 'Termo Site', description: 'Escopo do pacote site', is_active: true, current_version: 1 },
        { id: 't2', name: 'Termo Antigo', description: 'Descontinuado', is_active: false, current_version: 3 },
      ],
      isLoading: false,
    });

    render(<TermsPage />);

    expect(screen.getByRole('heading', { name: /Termos Ativos/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Termos Desativados/i })).toBeInTheDocument();
    expect(screen.getByText('Termo Site')).toBeInTheDocument();
    expect(screen.getByText('Termo Antigo')).toBeInTheDocument();
  });

  it('abre o drawer de criação ao clicar em Novo Termo', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({ data: [], isLoading: false });

    render(<TermsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Termo/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Criar Novo Termo/i })).toBeInTheDocument();
  });

  it('submeter o formulário de criação chama termService.create e navega para a tela de edição do termo criado', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({ data: [], isLoading: false });

    comoMock(useMutation).mockImplementation(({ mutationFn, onSuccess }: OpcoesDeMutation) => ({
      mutate: async (variables: unknown) => {
        const result = await mutationFn(variables);
        onSuccess?.(result);
      },
      isPending: false,
    }));

    const { termService } = await import('@/services/termService');
    vi.mocked(termService.create).mockResolvedValue({ id: 'new-term-id', name: 'Termo Pacote Site', description: 'Escopo do pacote de site', type: 'contratacao_servico', is_active: true, current_version: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' });

    render(<TermsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Termo/i }));
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Termo Pacote Site' } });
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: 'Escopo do pacote de site' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Termo/i }));

    await waitFor(() => {
      expect(termService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Termo Pacote Site', description: 'Escopo do pacote de site' })
      );
    });
    // Depois de criar, o próximo passo natural é publicar a primeira versão
    // de conteúdo — leva direto para a tela de edição do termo criado.
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/terms/new-term-id');
    });
  });

  it('erro de API ao criar termo é exibido, nunca engolido silenciosamente', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({ data: [], isLoading: false });

    // Cada chamada a useMutation captura o SEU PRÓPRIO onError (não uma
    // variável compartilhada) — com 2 mutações no componente (criar/
    // excluir), um "último a registrar vence" faria o clique em "Salvar"
    // disparar o onError errado (ex: o de excluir).
    comoMock(useMutation).mockImplementation(({ onError }: OpcoesDeMutation) => ({
      mutate: () => onError && onError(new Error('Falha ao criar')),
      isPending: false,
    }));

    render(<TermsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Termo/i }));
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Termo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Falha ao criar/i);
  });

  // A edição de metadados, publicação de conteúdo e histórico de versões
  // saíram dos drawers/expansões da listagem e viraram uma tela dedicada
  // (/terms/[id]) — a área confinada de um drawer lateral não era adequada
  // para ler/editar um texto jurídico longo (achado de UX do usuário).
  it('card do termo linka para a tela de edição dedicada', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({
      data: [{ id: 't1', name: 'Termo Site', description: '', is_active: true, current_version: 1 }],
      isLoading: false,
    });

    render(<TermsPage />);

    const openLink = screen.getByRole('link', { name: /Abrir Termo Site/i });
    expect(openLink).toHaveAttribute('href', '/terms/t1');
  });

  it('clicar em "Excluir" chama termService.remove com o id do termo', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({
      data: [{ id: 't1', name: 'Termo Site', description: '', is_active: true, current_version: 1 }],
      isLoading: false,
    });

    const mutateSpy = vi.fn();
    comoMock(useMutation).mockImplementation(({ mutationFn }: OpcoesDeMutation) => ({
      mutate: (variables: unknown) => {
        mutationFn(variables);
        mutateSpy(variables);
      },
      isPending: false,
    }));

    const { termService } = await import('@/services/termService');

    render(<TermsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Excluir Termo Site/i }));

    await waitFor(() => {
      expect(termService.remove).toHaveBeenCalledWith('t1');
    });
  });

  // Pedido de 06/11/2026: Excluir inativo quando o termo não pode ser excluído,
  // com o motivo; os botões mostram só "Abrir" e "Excluir".
  it('termo com aceites ou em uso por plano ativo: Excluir inativo com o motivo; os botões mostram só Abrir e Excluir', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    const termos = JSON.parse(JSON.stringify(fixtureTermos)) as Term[];
    comoMock(useQuery).mockReturnValue({ data: termos, isLoading: false });
    const mutateSpy = vi.fn();
    comoMock(useMutation).mockImplementation(() => ({ mutate: mutateSpy, isPending: false }));

    render(<TermsPage />);

    const antigo = screen.getByRole('button', { name: 'Excluir Termo de Contratação antigo' });
    expect(antigo).toHaveTextContent(/^Excluir$/);
    expect(antigo).toBeDisabled();
    expect(antigo).toHaveAccessibleDescription('Tem aceites registrados');
    fireEvent.click(antigo);

    const vigente = screen.getByRole('button', { name: 'Excluir Termo de Contratação' });
    expect(vigente).toBeDisabled();
    expect(vigente).toHaveAccessibleDescription('Em uso por um plano ativo');
    fireEvent.click(vigente);
    expect(mutateSpy).not.toHaveBeenCalled();

    const livre = screen.getByRole('button', { name: 'Excluir Rascunho sem uso' });
    expect(livre).toBeEnabled();
    expect(livre).toHaveAccessibleDescription('');
    fireEvent.click(livre);
    expect(mutateSpy).toHaveBeenCalledWith('c0ffee00-0000-4000-8000-000000000001');

    for (const nome of ['Termo de Contratação antigo', 'Termo de Contratação', 'Rascunho sem uso']) {
      const abrir = screen.getByRole('link', { name: `Abrir ${nome}` });
      expect(abrir).toHaveTextContent(/^Abrir$/);
    }
    expect(screen.queryByText(/^Abrir .+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Excluir .+/)).not.toBeInTheDocument();
  });

  // Pedido de 07/11/2026: escolher o tipo ao criar o termo.
  it('criação: Tipo do termo com os três tipos, "Termo de contratação" por padrão, e o tipo escolhido vai para a API', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({ data: [], isLoading: false });
    comoMock(useMutation).mockImplementation(({ mutationFn }: OpcoesDeMutation) => ({
      mutate: (variables: unknown) => mutationFn(variables),
      isPending: false,
    }));
    const { termService } = await import('@/services/termService');
    vi.mocked(termService.create).mockResolvedValue(JSON.parse(JSON.stringify(fixtureTipos))[0] as Term);

    render(<TermsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Novo Termo/i }));

    const tipo = screen.getByRole('combobox', { name: 'Tipo do termo' });
    expect(Array.from((tipo as HTMLSelectElement).options).map((o) => [o.value, o.textContent])).toEqual([
      ['contratacao_servico', 'Termo de contratação'],
      ['termos_uso', 'Termos de uso'],
      ['politica_privacidade', 'Política de privacidade'],
    ]);
    expect(tipo).toHaveDisplayValue('Termo de contratação');

    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Política v11' } });
    fireEvent.change(tipo, { target: { value: 'politica_privacidade' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Termo/i }));
    await waitFor(() => {
      expect(termService.create).toHaveBeenCalledWith({ name: 'Política v11', description: '', type: 'politica_privacidade' });
    });
  });

  it('criação: termos de uso e política avisam que, ao publicar, o termo ativo do mesmo tipo é desativado', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({ data: [], isLoading: false });
    comoMock(useMutation).mockImplementation(() => ({ mutate: vi.fn(), isPending: false }));

    render(<TermsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Novo Termo/i }));
    const tipo = screen.getByRole('combobox', { name: 'Tipo do termo' });
    const aviso = 'Só um termo deste tipo fica ativo: ao publicar a primeira versão, o atual é desativado.';

    expect(screen.queryByText(aviso)).not.toBeInTheDocument();
    fireEvent.change(tipo, { target: { value: 'termos_uso' } });
    expect(await screen.findByText(aviso)).toBeInTheDocument();
    expect(tipo).toHaveAccessibleDescription(aviso);
    fireEvent.change(tipo, { target: { value: 'politica_privacidade' } });
    expect(screen.getByText(aviso)).toBeInTheDocument();
    fireEvent.change(tipo, { target: { value: 'contratacao_servico' } });
    await waitFor(() => expect(screen.queryByText(aviso)).not.toBeInTheDocument());
  });

  it('o card mostra o tipo; termo antigo sem tipo conta como termo de contratação', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({ data: JSON.parse(JSON.stringify(fixtureTipos)) as Term[], isLoading: false });
    comoMock(useMutation).mockImplementation(() => ({ mutate: vi.fn(), isPending: false }));

    render(<TermsPage />);

    const tipoDoCard = (nome: string) =>
      within(screen.getByRole('heading', { level: 3, name: nome }).closest('div.border') as HTMLElement).getByText(/^Tipo:/).textContent;
    expect(tipoDoCard('Termo de Contratação')).toBe('Tipo: Termo de contratação');
    expect(tipoDoCard('Termo antigo sem tipo')).toBe('Tipo: Termo de contratação');
    expect(tipoDoCard('Termos de Uso')).toBe('Tipo: Termos de uso');
    expect(tipoDoCard('Política de Privacidade')).toBe('Tipo: Política de privacidade');
  });

  // WARN-5 (/local-review): DeleteTerm no backend responde 409 quando o termo
  // tem aceites registrados ou está em uso por um plano ativo — a UI precisa
  // exibir esse conflito, nunca engolir o erro silenciosamente.
  it('erro 409 ao excluir termo exibe mensagem de conflito', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    comoMock(useQuery).mockReturnValue({
      data: [{ id: 't1', name: 'Termo Site', description: '', is_active: true, current_version: 1 }],
      isLoading: false,
    });

    comoMock(useMutation).mockImplementation(({ onError }: OpcoesDeMutation) => ({
      // O cliente real (apiFetch) lança ApiError com o status HTTP.
      mutate: () => onError && onError(new ApiError('term in use', 409)),
      isPending: false,
    }));

    render(<TermsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Excluir Termo Site/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/em uso por um plano ativo/i);
  });
});
