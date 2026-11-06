import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import { ApiError } from '@/lib/apiError';
import type { FunilJornada, VisitaJornada } from '@/types/jornada';

// spec-2-painel RF-2-07, CA-2-07, CA-2-09, CA-2-10; blueprint §3.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => '/dashboard/jornada') }));

const funil: FunilJornada = {
  etapas: [
    { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 60 },
    { etapa: 1, aparelho: 'computador', origem: 'google_ads', visitas: 20 },
    { etapa: 1, aparelho: 'celular', origem: 'direto', visitas: 40 },
    { etapa: 2, aparelho: 'celular', origem: 'google_ads', visitas: 30 },
    { etapa: 2, aparelho: 'celular', origem: 'direto', visitas: 18 },
    { etapa: 3, aparelho: 'computador', origem: 'google_ads', visitas: 10 },
    { etapa: 8, aparelho: 'computador', origem: 'google_ads', visitas: 2 },
  ],
  uso: [
    { evento: 'lp_menu_tema', aparelho: 'celular', origem: 'google_ads', visitas: 8 },
    { evento: 'lp_menu_tema', aparelho: 'computador', origem: 'direto', visitas: 4 },
    { evento: 'lp_menu_layout', aparelho: 'celular', origem: 'direto', visitas: 7 },
    { evento: 'lp_menu_dados', aparelho: 'celular', origem: 'direto', visitas: 4 },
    { evento: 'lp_menu_buscas', aparelho: 'celular', origem: 'direto', visitas: 2 },
    { evento: 'lp_menu_ia', aparelho: 'celular', origem: 'google_ads', visitas: 9 },
    { evento: 'lp_menu_guia', aparelho: 'celular', origem: 'direto', visitas: 3 },
    { evento: 'lp_ia_copiou', aparelho: 'celular', origem: 'google_ads', visitas: 9 },
    { evento: 'lp_ia_viu_mudancas', aparelho: 'celular', origem: 'google_ads', visitas: 5 },
    { evento: 'lp_ia_aplicou', aparelho: 'celular', origem: 'google_ads', visitas: 3 },
    { evento: 'lp_ia_resposta_invalida', aparelho: 'celular', origem: 'google_ads', visitas: 2 },
  ],
  pagou: [{ aparelho: 'computador', origem: 'google_ads', visitas: 1 }],
  leitura: [],
};

const visitaDireta: VisitaJornada = {
  visitante: '5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6',
  visita: '0c4b5a8e-1f2a-4b3c-9d8e-7f6a5b4c3d2e',
  inicio: 1793915468000 /* 2026-11-05T21:51:08Z */,
  fim: 1793915580000 /* 2026-11-05T21:53:00Z */,
  aparelho: 'celular',
  origem: 'direto',
  paginas: 3,
  etapas: [1, 2],
  usos: [],
  teste: false,
};

const visitaContratou: VisitaJornada = {
  visitante: '7c2e9b4d-3e5f-4a7b-9c0d-1e2f3a4b5c6d',
  visita: '1d5c6b9f-2a3b-4c4d-8e9f-8a7b6c5d4e3f',
  inicio: 1793909520000 /* 2026-11-05T20:12:00Z */,
  fim: 1793910660000 /* 2026-11-05T20:31:00Z */,
  aparelho: 'computador',
  origem: 'google_ads',
  campanha: 'vitrine-novembro',
  paginas: 4,
  etapas: [1, 2, 3, 4, 5, 6],
  usos: ['lp_menu_tema'],
  teste: false,
  contratacao: {
    tenant_id: 'a1b2c3d4-0000-4000-8000-000000000001',
    nome: 'Espaço Sereno',
    status: 'ATIVO',
    pago: true,
    plano: 'pagina',
    em: 1793910660000 /* 2026-11-05T20:31:00Z */,
  },
};

const visitaNaoPagou: VisitaJornada = {
  ...visitaContratou,
  visitante: '8d3f0c5e-4f6a-4b8c-8d1e-2f3a4b5c6d7e',
  visita: '2e6d7c0a-3b4c-4d5e-9f0a-9b8c7d6e5f4a',
  inicio: 1793883900000 /* 2026-11-05T13:05:00Z */,
  usos: [],
  contratacao: { ...visitaContratou.contratacao!, tenant_id: 'a1b2c3d4-0000-4000-8000-000000000002', nome: 'Clínica Aurora', status: 'PENDENTE', pago: false },
};

const visitaTeste: VisitaJornada = {
  ...visitaDireta,
  visitante: '9e4a1d6f-5a7b-4c9d-9e2f-3a4b5c6d7e8f',
  visita: '3f7e8d1b-4c5d-4e6f-8a1b-0c9d8e7f6a5b',
  inicio: 1793917800000 /* 2026-11-05T22:30:00Z */,
  teste: true,
};

const push = vi.fn();

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <JornadaPage />
    </QueryClientProvider>,
  );
}

function valoresDoFunil(secao: HTMLElement) {
  return within(secao).getAllByRole('listitem').map((li) => li.textContent);
}

describe('Página Jornada do visitante', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T23:00:00Z'));
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
    vi.mocked(jornadaService.visitas).mockResolvedValue([visitaDireta, visitaContratou, visitaNaoPagou]);
  });

  afterEach(() => vi.useRealTimers());

  test('cabeçalho do blueprint', () => {
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Jornada do visitante' })).toBeInTheDocument();
    expect(
      screen.getByText('De onde vêm, onde param e o que usam no configurador. Visitas de teste ficam fora dos números.'),
    ).toBeInTheDocument();
  });

  test('período: 7 dias por padrão, e mudar o período faz nova chamada', async () => {
    renderizar();
    const grupo = screen.getByRole('group', { name: 'Período' });
    expect(within(grupo).getByRole('button', { name: '7 dias' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(grupo).getByRole('button', { name: 'Hoje' })).toHaveAttribute('aria-pressed', 'false');
    await screen.findByRole('region', { name: 'Funil · 7 dias' });
    expect(jornadaService.funil).toHaveBeenLastCalledWith('2026-10-30', '2026-11-05');

    fireEvent.click(within(grupo).getByRole('button', { name: 'Hoje' }));
    await waitFor(() => expect(jornadaService.funil).toHaveBeenLastCalledWith('2026-11-05', '2026-11-05'));
    expect(within(grupo).getByRole('button', { name: 'Hoje' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(grupo).getByRole('button', { name: '30 dias' }));
    await waitFor(() => expect(jornadaService.funil).toHaveBeenLastCalledWith('2026-10-07', '2026-11-05'));
    expect(await screen.findByRole('region', { name: 'Funil · 30 dias' })).toBeInTheDocument();
  });

  test('CA-2-07: funil sem filtro, com a taxa sobre a etapa anterior', async () => {
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Funil · 7 dias' });
    await within(secao).findAllByRole('listitem');
    expect(valoresDoFunil(secao)).toEqual([
      'Visitou120',
      'Abriu o configurador4840% · 40% da anterior',
      'Escolheu modelo e tema108% · 21% da anterior',
      'Editou00% · 0% da anterior',
      'Viu a página final00%',
      'Abriu a contratação00%',
      'Enviou a contratação00%',
      'Contratou22%',
      'Pagou11% · 50% da anterior',
    ]);
  });

  test('CA-2-07: filtros de origem e aparelho recalculam funil e uso sem nova chamada', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Funil · 7 dias' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'google' } });
    const secaoGoogle = screen.getByRole('region', { name: 'Funil · 7 dias · Anúncio do Google' });
    expect(valoresDoFunil(secaoGoogle)).toEqual([
      'Visitou80',
      'Abriu o configurador3038% · 38% da anterior',
      'Escolheu modelo e tema1013% · 33% da anterior',
      'Editou00% · 0% da anterior',
      'Viu a página final00%',
      'Abriu a contratação00%',
      'Enviou a contratação00%',
      'Contratou23%',
      'Pagou11% · 50% da anterior',
    ]);

    fireEvent.change(screen.getByRole('combobox', { name: 'Aparelho' }), { target: { value: 'celular' } });
    const secao = screen.getByRole('region', { name: 'Funil · 7 dias · Anúncio do Google · Celular' });
    expect(valoresDoFunil(secao)).toEqual([
      'Visitou60',
      'Abriu o configurador3050% · 50% da anterior',
      'Escolheu modelo e tema00% · 0% da anterior',
      'Editou00%',
      'Viu a página final00%',
      'Abriu a contratação00%',
      'Enviou a contratação00%',
      'Contratou00%',
      'Pagou00%',
    ]);

    const menu = within(screen.getByRole('region', { name: 'Uso do editor' })).getByRole('list', { name: 'Menu "Editar"' });
    expect(within(menu).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Editar tema8',
      'Editar layout0',
      'Dados da página0',
      'Buscas0',
      'Editar com sua IA9',
      'Como editar0',
    ]);
    expect(jornadaService.funil).toHaveBeenCalledTimes(1);
  });

  test('origem oferece os grupos do blueprint e aparelho as três opções', () => {
    renderizar();
    const origem = screen.getByRole('combobox', { name: 'Origem' });
    expect(within(origem).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todas', 'Anúncio do Google', 'Outra campanha', 'Outro site', 'Direto',
    ]);
    const aparelho = screen.getByRole('combobox', { name: 'Aparelho' });
    expect(within(aparelho).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todos', 'Celular', 'Computador']);
  });

  test('CA-2-07: Uso do editor mostra as seis opções e o funil da IA', async () => {
    renderizar();
    const uso = await screen.findByRole('region', { name: 'Uso do editor' });
    const menu = await within(uso).findByRole('list', { name: 'Menu "Editar"' });
    expect(within(menu).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Editar tema12',
      'Editar layout7',
      'Dados da página4',
      'Buscas2',
      'Editar com sua IA9',
      'Como editar3',
    ]);
    const ia = within(uso).getByRole('list', { name: 'Editar com sua IA' });
    expect(within(ia).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Copiou as instruções9',
      'Viu as mudanças556%',
      'Aplicou333%',
      'Resposta não lida2',
    ]);
  });

  test('visitas do dia: hora em Brasília, origem agrupada, até onde foi e o contratante com link', async () => {
    renderizar();
    const visitas = await screen.findByRole('region', { name: 'Visitas' });
    expect(within(visitas).getByText('5 de nov. de 2026')).toBeInTheDocument();
    expect(jornadaService.visitas).toHaveBeenCalledWith('2026-11-05', false);
    const tabela = await within(visitas).findByRole('table');
    expect(within(tabela).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Hora', 'Aparelho', 'Origem', 'Páginas', 'Até onde foi', 'Contratou',
    ]);
    const [, linhaDireta, linhaContratou, linhaNaoPagou] = within(tabela).getAllByRole('row');

    expect(within(linhaDireta).getAllByRole('cell').map((td) => td.textContent)).toEqual([
      '18:51', 'Celular', 'Direto', '3', 'Abriu o configurador', '—',
    ]);
    expect(within(linhaDireta).getByRole('link', { name: '18:51' })).toHaveAttribute(
      'href', '/dashboard/jornada/5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6',
    );

    expect(within(linhaContratou).getAllByRole('cell').map((td) => td.textContent)).toEqual([
      '17:12', 'Computador', 'Anúncio do Google', '4', 'Abriu a contrataçãoUsou o editor', 'Espaço SerenoPagou',
    ]);
    expect(within(linhaContratou).getByRole('link', { name: 'Espaço Sereno' })).toHaveAttribute(
      'href', '/tenants/a1b2c3d4-0000-4000-8000-000000000001',
    );
    expect(within(linhaNaoPagou).getByText('Não pagou')).toBeInTheDocument();
    expect(within(linhaNaoPagou).getByRole('link', { name: 'Clínica Aurora' })).toHaveAttribute(
      'href', '/tenants/a1b2c3d4-0000-4000-8000-000000000002',
    );
  });

  // validation-fase2 L1: JSON real da API (instantes em ms Unix), com o mesmo JSON.parse do lib/api.ts.
  test('contrato real: visita com inicio e em em milissegundos', async () => {
    const real = JSON.parse(
      '[{"visitante":"3f2b8c1e-9d4a-4b7e-8a6f-1c2d3e4f5a6b","visita":"7a1b2c3d-4e5f-4a6b-9c8d-0e1f2a3b4c5d","inicio":1793880000000,"fim":1793880003000,"aparelho":"celular","origem":"google_ads","campanha":"c1","paginas":1,"etapas":[1,2,8],"usos":["lp_menu_ia"],"teste":false,"contratacao":{"tenant_id":"t-1","nome":"Espaço Sereno","status":"ATIVO","pago":true,"plano":"pagina","em":1793880004000}}]',
    ) as VisitaJornada[];
    vi.mocked(jornadaService.visitas).mockResolvedValue(real);
    renderizar();
    const tabela = await screen.findByRole('table');
    const [, linha] = within(tabela).getAllByRole('row');
    expect(within(linha).getAllByRole('cell').map((td) => td.textContent)).toEqual([
      '09:00', 'Celular', 'Anúncio do Google', '1', 'ContratouUsou o editor', 'Espaço SerenoPagou',
    ]);
  });

  // validation-fase2 L2: tenant removido chega com nome vazio.
  test('contratação de tenant removido mostra Empresa removida, sem link', async () => {
    vi.mocked(jornadaService.visitas).mockResolvedValue([
      { ...visitaContratou, contratacao: { ...visitaContratou.contratacao!, tenant_id: 't-sumiu', nome: '' } },
    ]);
    renderizar();
    const tabela = await screen.findByRole('table');
    const [, linha] = within(tabela).getAllByRole('row');
    const celula = within(linha).getAllByRole('cell')[5];
    expect(within(celula).getByText('Empresa removida')).toBeInTheDocument();
    expect(within(celula).getByText('t-sumiu')).toBeInTheDocument();
    expect(within(celula).queryByRole('link')).not.toBeInTheDocument();
  });

  test('a linha inteira leva ao caminho do visitante', async () => {
    renderizar();
    const tabela = await screen.findByRole('table');
    const [, linha] = within(tabela).getAllByRole('row');
    fireEvent.click(within(linha).getByText('Celular'));
    expect(push).toHaveBeenCalledWith('/dashboard/jornada/5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6');
  });

  test('CA-2-07: Mostrar visitas de teste refaz a chamada com teste=1 e mostra o selo Teste', async () => {
    renderizar();
    await screen.findByRole('table');
    vi.mocked(jornadaService.visitas).mockResolvedValue([visitaTeste, visitaDireta]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar visitas de teste' }));
    await waitFor(() => expect(jornadaService.visitas).toHaveBeenLastCalledWith('2026-11-05', true));
    const tabela = await screen.findByRole('table');
    await waitFor(() => expect(within(tabela).getAllByRole('row')).toHaveLength(3));
    const [, linhaTeste] = within(tabela).getAllByRole('row');
    expect(within(linhaTeste).getByText('Teste')).toBeInTheDocument();
  });

  test('navegação por dia: › desabilitado hoje, ‹ volta um dia', async () => {
    renderizar();
    const visitas = await screen.findByRole('region', { name: 'Visitas' });
    expect(within(visitas).getByRole('button', { name: 'Próximo dia' })).toBeDisabled();
    fireEvent.click(within(visitas).getByRole('button', { name: 'Dia anterior' }));
    await waitFor(() => expect(jornadaService.visitas).toHaveBeenLastCalledWith('2026-11-04', false));
    expect(within(visitas).getByText('4 de nov. de 2026')).toBeInTheDocument();
    expect(within(visitas).getByRole('button', { name: 'Próximo dia' })).toBeEnabled();
  });

  test('dia sem visitas', async () => {
    vi.mocked(jornadaService.visitas).mockResolvedValue([]);
    renderizar();
    const visitas = await screen.findByRole('region', { name: 'Visitas' });
    expect(await within(visitas).findByText('Nenhuma visita neste dia.')).toBeInTheDocument();
    expect(within(visitas).queryByRole('table')).not.toBeInTheDocument();
  });

  test('CA-2-09: erro do funil mostra Tentar de novo no funil e no uso; as visitas seguem', async () => {
    vi.mocked(jornadaService.funil).mockRejectedValue(new ApiError('internal', 500));
    renderizar();
    const funilSecao = await screen.findByRole('region', { name: 'Funil · 7 dias' });
    expect(await within(funilSecao).findByText('Não foi possível carregar.')).toBeInTheDocument();
    const uso = screen.getByRole('region', { name: 'Uso do editor' });
    expect(within(uso).getByText('Não foi possível carregar.')).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();

    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
    fireEvent.click(within(uso).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(uso).findByRole('list', { name: 'Menu "Editar"' })).toBeInTheDocument();
  });

  test('CA-2-09: erro das visitas mostra Tentar de novo na seção de visitas', async () => {
    vi.mocked(jornadaService.visitas).mockRejectedValueOnce(new ApiError('internal', 500));
    renderizar();
    const visitas = await screen.findByRole('region', { name: 'Visitas' });
    expect(await within(visitas).findByText('Não foi possível carregar.')).toBeInTheDocument();
    fireEvent.click(within(visitas).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(visitas).findByRole('table')).toBeInTheDocument();
  });

  test('carregando: as seções ficam com aria-busy', () => {
    vi.mocked(jornadaService.funil).mockReturnValue(new Promise(() => {}));
    vi.mocked(jornadaService.visitas).mockReturnValue(new Promise(() => {}));
    renderizar();
    expect(screen.getByRole('region', { name: 'Funil · 7 dias' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('region', { name: 'Uso do editor' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('region', { name: 'Visitas' })).toHaveAttribute('aria-busy', 'true');
  });
});
