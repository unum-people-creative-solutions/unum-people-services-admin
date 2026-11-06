import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import JornadaPage from './page';
import { jornadaService } from '@/services/jornadaService';
import { ApiError } from '@/lib/apiError';
import type { FunilJornada, VisitaJornada } from '@/types/jornada';
// JSON real de GET /admin/dashboard/jornada/funil (L-071).
import fixtureFunilLeitura from '@/services/__fixtures__/funil-leitura.json';

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

// Relógio fixo dos testes: 2026-11-05T23:00:00Z (20:00 em Brasília).
const T = Date.UTC(2026, 10, 5, 23, 0, 0);
const DIA = 86_400_000;

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

  // spec-4-detalhe RF-4-21, CA-4-17.
  test('períodos: os nove na ordem, 7 dias por padrão, sem "Hoje", e a janela de 7 dias até agora', async () => {
    renderizar();
    const grupo = screen.getByRole('group', { name: 'Período' });
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual([
      '1 h', '3 h', '6 h', '12 h', '24 horas', '3 dias', '7 dias', '15 dias', '30 dias',
    ]);
    expect(
      within(grupo).getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent),
    ).toEqual(['7 dias']);
    expect(within(grupo).getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'false')).toHaveLength(8);
    expect(within(grupo).queryByRole('button', { name: 'Hoje' })).not.toBeInTheDocument();
    await screen.findByRole('region', { name: 'Funil · 7 dias' });
    expect(jornadaService.funil).toHaveBeenLastCalledWith(T - 7 * DIA, T);
    expect(jornadaService.visitas).toHaveBeenLastCalledWith(T - 7 * DIA, T);
  });

  test('CA-4-17: "24 horas" pede funil e visitas com a janela de 24 h, e o título usa o rótulo', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Funil · 7 dias' });
    fireEvent.click(within(screen.getByRole('group', { name: 'Período' })).getByRole('button', { name: '24 horas' }));
    await waitFor(() => expect(jornadaService.funil).toHaveBeenLastCalledWith(T - DIA, T));
    expect(jornadaService.visitas).toHaveBeenLastCalledWith(T - DIA, T);
    expect(screen.getByRole('button', { name: '24 horas' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('region', { name: 'Funil · 24 horas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Páginas de entrada · 24 horas' })).toBeInTheDocument();
  });

  test('RF-4-22: trocar o período recalcula a janela até agora', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Funil · 7 dias' });
    vi.setSystemTime(T + 60_000);
    fireEvent.click(screen.getByRole('button', { name: '1 h' }));
    await waitFor(() => expect(jornadaService.funil).toHaveBeenLastCalledWith(T + 60_000 - 3_600_000, T + 60_000));
    expect(jornadaService.visitas).toHaveBeenLastCalledWith(T + 60_000 - 3_600_000, T + 60_000);
  });

  // spec-4-detalhe RF-4-22, CA-4-18. Rode também com TZ=Asia/Tokyo (L-054).
  test('CA-4-18: Atualizar busca de novo até agora e mostra "Atualizado às HH:MM" em Brasília', async () => {
    renderizar();
    const aviso = await screen.findByText('Atualizado às 20:00');
    expect(aviso.textContent).toBe('Atualizado às 20:00');
    expect(aviso).toHaveAttribute('aria-live', 'polite');
    expect(jornadaService.funil).toHaveBeenCalledTimes(1);
    expect(jornadaService.visitas).toHaveBeenCalledTimes(1);

    // Relógio parado em T: o clique busca de novo, com ate = T.
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(jornadaService.funil).toHaveBeenCalledTimes(2));
    expect(jornadaService.funil).toHaveBeenLastCalledWith(T - 7 * DIA, T);
    await waitFor(() => expect(jornadaService.visitas).toHaveBeenCalledTimes(2));
    expect(jornadaService.visitas).toHaveBeenLastCalledWith(T - 7 * DIA, T);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled());

    vi.setSystemTime(T + 60_000);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(jornadaService.funil).toHaveBeenLastCalledWith(T + 60_000 - 7 * DIA, T + 60_000));
    expect(jornadaService.visitas).toHaveBeenLastCalledWith(T + 60_000 - 7 * DIA, T + 60_000);
    expect((await screen.findByText('Atualizado às 20:01')).textContent).toBe('Atualizado às 20:01');
    expect(screen.queryByText('Atualizado às 20:00')).not.toBeInTheDocument();
  });

  test('CA-4-18: durante a busca o Atualizar fica desabilitado, com aria-busy', async () => {
    renderizar();
    await screen.findByText('Atualizado às 20:00');
    const botao = screen.getByRole('button', { name: 'Atualizar' });
    expect(botao).toBeEnabled();
    expect(botao).toHaveAttribute('aria-busy', 'false');

    let responder: (f: FunilJornada) => void = () => {};
    vi.mocked(jornadaService.funil).mockReturnValueOnce(new Promise((r) => { responder = r; }));
    fireEvent.click(botao);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Atualizar' })).toHaveAttribute('aria-busy', 'true');

    responder(funil);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Atualizar' })).toHaveAttribute('aria-busy', 'false');
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
    expect(jornadaService.visitas).toHaveBeenCalledWith(T - 7 * DIA, T);
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

  // RF-4-19/RF-4-23: a API devolve as de teste sempre; a tela filtra sem nova chamada.
  test('Mostrar visitas de teste mostra a visita de teste com o selo, sem nova chamada', async () => {
    vi.mocked(jornadaService.visitas).mockResolvedValue([visitaTeste, visitaDireta]);
    renderizar();
    const tabela = await screen.findByRole('table');
    expect(within(tabela).getAllByRole('row')).toHaveLength(2);
    expect(within(tabela).queryByText('Teste')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar visitas de teste' }));
    expect(within(tabela).getAllByRole('row')).toHaveLength(3);
    const [, linhaTeste] = within(tabela).getAllByRole('row');
    expect(within(linhaTeste).getByText('Teste')).toBeInTheDocument();
    expect(jornadaService.visitas).toHaveBeenCalledTimes(1);
  });

  // CA-4-19: a lista segue o período.
  test('a navegação por dia não existe', async () => {
    renderizar();
    const visitas = await screen.findByRole('region', { name: 'Visitas' });
    await within(visitas).findByRole('table');
    expect(within(visitas).queryByRole('button', { name: 'Dia anterior' })).not.toBeInTheDocument();
    expect(within(visitas).queryByRole('button', { name: 'Próximo dia' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('region', { name: 'Páginas de entrada · 7 dias' })).toHaveAttribute('aria-busy', 'true');
  });
});

// spec-3-leitura RF-3-13, CA-3-14: seção "Páginas de entrada" com o JSON real da API (L-071).
describe('Página Jornada: Páginas de entrada', () => {
  // O mesmo JSON.parse do lib/api.ts sobre o corpo real de GET /admin/dashboard/jornada/funil.
  const funilReal = JSON.parse(JSON.stringify(fixtureFunilLeitura)) as FunilJornada;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T23:00:00Z'));
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(jornadaService.funil).mockResolvedValue(funilReal);
    vi.mocked(jornadaService.visitas).mockResolvedValue([visitaDireta]);
  });

  afterEach(() => vi.useRealTimers());

  async function secaoCarregada(nome = 'Páginas de entrada · 7 dias') {
    const secao = await screen.findByRole('region', { name: nome });
    await within(secao).findByRole('group', { name: 'Página de entrada' });
    return secao;
  }

  function linhas(secao: HTMLElement, bloco: string) {
    return within(within(secao).getByRole('list', { name: bloco }))
      .getAllByRole('listitem')
      .map((li) => li.textContent);
  }

  function abaPressionada(secao: HTMLElement) {
    return within(within(secao).getByRole('group', { name: 'Página de entrada' }))
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent);
  }

  test('fica entre "Uso do editor" e "Visitas"', async () => {
    renderizar();
    await secaoCarregada();
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby'))).toEqual([
      'titulo-funil-jornada',
      'titulo-uso-editor',
      'titulo-paginas-entrada',
      'titulo-visitas',
    ]);
  });

  test('abas com aria-pressed; a inicial é a de mais visitas (Saúde, 12)', async () => {
    renderizar();
    const secao = await secaoCarregada();
    const abas = within(within(secao).getByRole('group', { name: 'Página de entrada' })).getAllByRole('button');
    expect(abas.map((b) => b.textContent)).toEqual(['Início', 'Saúde', 'CRM', 'Blog']);
    expect(abaPressionada(secao)).toEqual(['Saúde']);
    expect(within(secao).getByText('12 visitas viram esta página')).toBeInTheDocument();
  });

  test('números de cada bloco e porcentagens sobre as visitas da página, como taxa()', async () => {
    renderizar();
    const secao = await secaoCarregada();
    expect(linhas(secao, 'Rolagem')).toEqual(['25%758%', '50%433%', '75%217%', 'Até o fim18%']);
    expect(linhas(secao, 'Tempo na página (aba visível)')).toEqual(['10 s650%', '30 s325%', '1 min00%', '3 min00%']);
    expect(linhas(secao, 'Seções vistas')).toEqual([
      'Caminho650%',
      'Funções00%',
      'Junto00%',
      'Planos18%',
      'Perguntas frequentes00%',
      'Fechamento00%',
    ]);
  });

  test('cliques: só os botões da página de produto, do mais clicado ao menos, empate na ordem da tabela', async () => {
    renderizar();
    const secao = await secaoCarregada();
    expect(linhas(secao, 'Cliques')).toEqual([
      'Topo: botão principal2',
      'Topo: ver planos1',
      'Planos: escolheu um plano0',
      'Abriu uma pergunta0',
      'Fechamento: botão principal0',
      'Plano: ver todos os planos0',
      'Plano: conhecer o CRM0',
      'Logo0',
      'Minha conta0',
      'Rodapé: e-mail0',
      'Rodapé: termos0',
      'Rodapé: privacidade0',
      'Rodapé: ajuda0',
    ]);
  });

  test('trocar de aba mostra a outra página', async () => {
    renderizar();
    const secao = await secaoCarregada();
    fireEvent.click(within(secao).getByRole('button', { name: 'CRM' }));
    expect(abaPressionada(secao)).toEqual(['CRM']);
    expect(within(secao).getByText('3 visitas viram esta página')).toBeInTheDocument();
    expect(linhas(secao, 'Rolagem')).toEqual(['25%00%', '50%133%', '75%00%', 'Até o fim00%']);
    expect(linhas(secao, 'Seções vistas')[0]).toBe('Caminho267%');
    expect(linhas(secao, 'Cliques').slice(0, 3)).toEqual([
      'Plano: conhecer o CRM1',
      'Topo: botão principal0',
      'Topo: ver planos0',
    ]);

    fireEvent.click(within(secao).getByRole('button', { name: 'Início' }));
    expect(abaPressionada(secao)).toEqual(['Início']);
    expect(within(secao).getByText('5 visitas viram esta página')).toBeInTheDocument();
    expect(linhas(secao, 'Seções vistas')).toEqual([
      'Modelos360%',
      'Vantagens00%',
      'Como funciona00%',
      'Planos00%',
      'Blog00%',
      'CRM00%',
      'Perguntas frequentes00%',
      'Fechamento00%',
    ]);
    const cliques = linhas(secao, 'Cliques');
    expect(cliques).toHaveLength(18);
    expect(cliques.slice(0, 3)).toEqual(['Galeria: escolheu um modelo1', 'Topo: botão principal0', 'Topo: ver planos0']);
    expect(cliques).not.toContain('Logo0');
    expect(cliques).not.toContain('Plano: ver todos os planos0');
  });

  test('filtros de origem e aparelho recalculam os números sem nova chamada', async () => {
    renderizar();
    await secaoCarregada();
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'google' } });
    const google = screen.getByRole('region', { name: 'Páginas de entrada · 7 dias · Anúncio do Google' });
    expect(abaPressionada(google)).toEqual(['Saúde']);
    expect(within(google).getByText('10 visitas viram esta página')).toBeInTheDocument();
    expect(linhas(google, 'Rolagem')).toEqual(['25%770%', '50%440%', '75%220%', 'Até o fim110%']);

    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'todas' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Aparelho' }), { target: { value: 'computador' } });
    const computador = screen.getByRole('region', { name: 'Páginas de entrada · 7 dias · Computador' });
    // CRM tem 3 visitas no computador, Saúde tem 2: a aba inicial acompanha o filtro.
    expect(abaPressionada(computador)).toEqual(['CRM']);
    expect(within(computador).getByText('3 visitas viram esta página')).toBeInTheDocument();
    fireEvent.click(within(computador).getByRole('button', { name: 'Saúde' }));
    expect(within(computador).getByText('2 visitas viram esta página')).toBeInTheDocument();
    expect(linhas(computador, 'Rolagem')).toEqual(['25%00%', '50%00%', '75%00%', 'Até o fim00%']);
    expect(jornadaService.funil).toHaveBeenCalledTimes(1);
  });

  test('base no singular com 1 visita e no plural com 2 ou mais', async () => {
    renderizar();
    const secao = await secaoCarregada();
    expect(within(secao).getByText('12 visitas viram esta página')).toBeInTheDocument();
    fireEvent.click(within(secao).getByRole('button', { name: 'Blog' }));
    expect(within(secao).getByText('1 visita viu esta página')).toBeInTheDocument();
    expect(within(secao).queryByText('1 visitas viram esta página')).not.toBeInTheDocument();
    fireEvent.click(within(secao).getByRole('button', { name: 'CRM' }));
    expect(within(secao).getByText('3 visitas viram esta página')).toBeInTheDocument();
  });

  test('empate de visitas: vale a ordem das abas', async () => {
    vi.mocked(jornadaService.funil).mockResolvedValue({
      ...funilReal,
      leitura: [
        { pagina: 'blog', evento: 'visita', aparelho: 'celular', origem: 'direto', visitas: 4 },
        { pagina: 'crm', evento: 'visita', aparelho: 'celular', origem: 'direto', visitas: 4 },
        { pagina: 'inicio', evento: 'visita', aparelho: 'celular', origem: 'direto', visitas: 1 },
      ],
    });
    renderizar();
    const secao = await secaoCarregada();
    expect(abaPressionada(secao)).toEqual(['CRM']);
  });

  test('n = 0: a frase de vazio no lugar dos blocos', async () => {
    renderizar();
    await secaoCarregada();
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem' }), { target: { value: 'campanha' } });
    const secao = screen.getByRole('region', { name: 'Páginas de entrada · 7 dias · Outra campanha' });
    expect(abaPressionada(secao)).toEqual(['Início']);
    expect(within(secao).getByText('Nenhuma visita entrou por esta página no período.')).toBeInTheDocument();
    expect(within(secao).queryByRole('list')).not.toBeInTheDocument();
  });

  test('leitura vazia da API ([]): a frase de vazio', async () => {
    vi.mocked(jornadaService.funil).mockResolvedValue(funil);
    renderizar();
    const secao = await secaoCarregada();
    expect(within(secao).getByText('Nenhuma visita entrou por esta página no período.')).toBeInTheDocument();
  });

  test('erro: "Tentar de novo" na seção, as visitas seguem, e tentar de novo carrega', async () => {
    vi.mocked(jornadaService.funil).mockRejectedValue(new ApiError('internal', 500));
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Páginas de entrada · 7 dias' });
    expect(await within(secao).findByText('Não foi possível carregar.')).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();

    vi.mocked(jornadaService.funil).mockResolvedValue(funilReal);
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(secao).findByText('12 visitas viram esta página')).toBeInTheDocument();
  });
});
