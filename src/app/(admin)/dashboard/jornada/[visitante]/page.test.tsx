import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useParams } from 'next/navigation';
import VisitantePage from './page';
import { jornadaService } from '@/services/jornadaService';
import { ApiError } from '@/lib/apiError';
import type { EventoJornada, VisitanteJornada } from '@/types/jornada';
// JSON real de GET /admin/dashboard/jornada/visitantes/{v} com segundos (CA-4-16, L-071).
import fixtureVisitanteComTempo from '@/services/__fixtures__/visitante-com-tempo.json';
// JSON real de GET /admin/dashboard/jornada/visitantes/{v} da A1 (TASK-BE-106 e TASK-BE-204, L-071).
import fixtureVisitanteA1 from '@/services/__fixtures__/visitante-a1.json';
import { rotuloDoNo } from '@/test/trajetoria';

// spec-2-painel RF-2-08, CA-2-08, CA-2-09, CA-2-10; blueprint §4 e §5.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useParams: vi.fn(), useRouter: vi.fn(() => ({ push: vi.fn() })) }));

const ID = '5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6';
const VISITA_TARDE = '1d5c6b9f-2a3b-4c4d-8e9f-8a7b6c5d4e3f';
const VISITA_NOITE = '0c4b5a8e-1f2a-4b3c-9d8e-7f6a5b4c3d2e';

const resposta: VisitanteJornada = {
  visitante: ID,
  visitas: [
    {
      visitante: ID, visita: VISITA_TARDE, inicio: 1793909520000 /* 2026-11-05T20:12:00Z */, fim: 1793910700000 /* 2026-11-05T20:31:40Z */,
      aparelho: 'computador', origem: 'google_ads', campanha: 'vitrine-novembro', paginas: 4,
      etapas: [1, 2, 3, 4, 5, 6, 7, 8], usos: ['lp_menu_tema'], teste: false,
    },
    {
      visitante: ID, visita: VISITA_NOITE, inicio: 1793915468000 /* 2026-11-05T21:51:08Z */, fim: 1793915481000 /* 2026-11-05T21:51:21Z */,
      aparelho: 'celular', origem: 'direto', paginas: 2, etapas: [1, 2], usos: [], teste: false,
    },
  ],
  eventos: [
    { em: 1793909520000 /* 2026-11-05T20:12:00Z */, nome: 'lp_page_view', caminho: '/', visita: VISITA_TARDE },
    { em: 1793909670000 /* 2026-11-05T20:14:30Z */, nome: 'lp_menu_tema', caminho: '/configurar/editar', visita: VISITA_TARDE },
    { em: 1793910700000 /* 2026-11-05T20:31:40Z */, nome: 'lp_checkout_succeeded', caminho: '/configurar/sucesso', visita: VISITA_TARDE },
    { em: 1793915468000 /* 2026-11-05T21:51:08Z */, nome: 'lp_editor_opened', caminho: '/configurar/editar', visita: VISITA_NOITE },
    { em: 1793915479000 /* 2026-11-05T21:51:19Z */, nome: 'lp_page_view', caminho: '/', visita: VISITA_NOITE },
    { em: 1793915481000 /* 2026-11-05T21:51:21Z */, nome: 'lp_evento_novo', caminho: '/configurar', visita: VISITA_NOITE },
  ],
  contratacoes: [
    {
      tenant_id: 'a1b2c3d4-0000-4000-8000-000000000001', nome: 'Espaço Sereno', status: 'ATIVO',
      pago: true, plano: 'pagina', em: 1793910700000 /* 2026-11-05T20:31:40Z */,
    },
  ],
};

// comRetry: o QueryClient do app (Providers) tenta de novo 3 vezes por padrão.
function renderizar(comRetry = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, ...(comRetry ? {} : { retry: false }) } } });
  render(
    <QueryClientProvider client={qc}>
      <VisitantePage />
    </QueryClientProvider>,
  );
}

// jornada-trajetoria: cada nó da trajetória (filho direto do <ol>) com o rótulo e os textos dos seus eventos.
function nosDaVisita(secao: HTMLElement): Array<{ rotulo: string | null | undefined; eventos: Array<string | null> }> {
  const lista = within(secao).getByRole('list', { name: 'Trajetória da visita' });
  return within(lista)
    .getAllByRole('listitem')
    .filter((li) => li.parentElement === lista)
    .map((li) => ({
      rotulo: rotuloDoNo(li),
      eventos: within(li).queryAllByRole('listitem').map((e) => e.textContent),
    }));
}

describe('Página do visitante', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ visitante: ID });
    vi.mocked(jornadaService.visitante).mockResolvedValue(resposta);
  });

  test('cabeçalho: link de volta, 6 últimos caracteres, 1ª visita e total', async () => {
    renderizar();
    expect(screen.getByRole('link', { name: /Jornada/ })).toHaveAttribute('href', '/dashboard/jornada');
    expect(await screen.findByRole('heading', { level: 1, name: 'Visitante 2da0b6' })).toBeInTheDocument();
    expect(screen.getByText('1ª visita 5/11 17:12 · 2 visitas')).toBeInTheDocument();
    expect(jornadaService.visitante).toHaveBeenCalledWith(ID);
  });

  test('contratação com nome em link para o tenant, status, plano e data', async () => {
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Contratação' });
    expect(within(secao).getByRole('link', { name: 'Espaço Sereno' })).toHaveAttribute(
      'href', '/tenants/a1b2c3d4-0000-4000-8000-000000000001',
    );
    expect(within(secao).getByText('Pagou')).toBeInTheDocument();
    expect(within(secao).getByText('ATIVO')).toBeInTheDocument();
    expect(within(secao).getByText('Plano pagina')).toBeInTheDocument();
    expect(within(secao).getByText('5/11 17:31')).toBeInTheDocument();
  });

  test('CA-2-08 e CA-2-10: visitas da mais recente à mais antiga, eventos em ordem dentro dos nós, rótulos em português e hora de Brasília', async () => {
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(visitas.map((s) => within(s).getByRole('heading').textContent)).toEqual([
      'Visita de 5/11 · 18:51 · Celular · Direto',
      'Visita de 5/11 · 17:12 · Computador · Anúncio do Google',
    ]);
    expect(nosDaVisita(visitas[0])).toEqual([
      { rotulo: 'Visitou', eventos: ['18:51:08Carregou a tela do editor'] },
      { rotulo: 'Início', eventos: ['18:51:19Viu a página'] },
      { rotulo: 'Escolha do modelo', eventos: ['18:51:21lp_evento_novo'] },
    ]);
    expect(nosDaVisita(visitas[1])).toEqual([
      { rotulo: 'Visitou', eventos: ['17:12:00Viu a página'] },
      { rotulo: 'Editor', eventos: ['17:14:30Menu: Editar tema'] },
      { rotulo: 'Contratou', eventos: ['17:31:40Contratou'] },
    ]);
  });

  // jornada-trajetoria T08 (RF-JT-32, RF-JT-26).
  test('T08: cada visita tem id "visita-<id>" e a trajetória completa; a Linha do tempo e as Páginas da visita saíram', async () => {
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(visitas[0]).toHaveAttribute('id', `visita-${VISITA_NOITE}`);
    expect(visitas[1]).toHaveAttribute('id', `visita-${VISITA_TARDE}`);
    for (const secao of visitas) {
      expect(within(secao).getByRole('list', { name: 'Trajetória da visita' })).toBeInTheDocument();
      expect(within(secao).getByRole('list', { name: 'Legenda da trajetória' })).toBeInTheDocument();
      expect(within(secao).queryByRole('list', { name: 'Linha do tempo' })).toBeNull();
      expect(within(secao).queryByRole('list', { name: 'Páginas da visita' })).toBeNull();
      expect(within(secao).queryByRole('link', { name: /ações?$/ })).toBeNull();
    }
    // O resumo em texto do topo da trajetória (hora, duração e etapas).
    expect(within(visitas[1]).getByText('17:12–17:31 · 19 min 40 s · 3 etapas')).toBeInTheDocument();
  });

  test('T08: a contratação paga põe o selo Pagou no nó Contratou da visita que contratou', async () => {
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    const lista = (secao: HTMLElement) => within(secao).getByRole('list', { name: 'Trajetória da visita' });
    const contratou = within(lista(visitas[1]))
      .getAllByRole('listitem')
      .find((li) => rotuloDoNo(li) === 'Contratou')!;
    expect(within(contratou).getByText('Pagou')).toBeInTheDocument();
    expect(within(lista(visitas[0])).queryByText('Pagou')).toBeNull();
  });

  test('T08: sem pagamento, o nó Contratou não leva o selo', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue({
      ...resposta,
      contratacoes: [{ ...resposta.contratacoes[0], pago: false }],
    });
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(within(visitas[1]).queryByText('Pagou')).toBeNull();
  });

  test('T08: com pagou_em gravado na visita, o selo aparece mesmo sem contratação paga', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue({
      ...resposta,
      visitas: resposta.visitas.map((v) => (v.visita === VISITA_TARDE ? { ...v, pagou_em: 1793910800000 } : v)),
      contratacoes: [{ ...resposta.contratacoes[0], pago: false }],
    });
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(within(visitas[1]).getByText('Pagou')).toBeInTheDocument();
  });

  // jornada-fluxo-atual RF-JF-47: visita real de 20/11 (16:01:44 a 16:01:49), a janela e o editor em uma linha só.
  test('RF-JF-47: janela logo depois do editor vira um evento só, com o horário da janela, no nó da janela', async () => {
    const V = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';
    const em = (hms: string) => Date.parse(`2026-11-20T${hms}-03:00`);
    const caminho = '/configurar/editar';
    vi.mocked(jornadaService.visitante).mockResolvedValue({
      visitante: ID,
      visitas: [
        {
          visitante: ID, visita: V, inicio: em('16:01:44'), fim: em('16:01:49'), aparelho: 'celular',
          origem: 'direto', paginas: 1, etapas: [1], usos: [], teste: false,
        },
      ],
      eventos: [
        { em: em('16:01:44'), nome: 'lp_page_view', caminho, visita: V },
        { em: em('16:01:45'), nome: 'lp_rolagem_25', caminho, visita: V },
        { em: em('16:01:46'), nome: 'lp_rolagem_50', caminho, visita: V },
        { em: em('16:01:47'), nome: 'lp_rolagem_75', caminho, visita: V },
        { em: em('16:01:48'), nome: 'lp_rolagem_100', caminho, visita: V },
        { em: em('16:01:48'), nome: 'lp_editor_opened', caminho, visita: V },
        { em: em('16:01:49'), nome: 'lp_janela_aberta', caminho, visita: V },
        { em: em('16:01:49'), nome: 'lp_tempo_na_pagina', caminho, visita: V, segundos: 4 },
      ],
      contratacoes: [],
    });
    renderizar();
    const visita = await screen.findByRole('region', { name: /^Visita de 20\/11/ });
    expect(nosDaVisita(visita)).toEqual([
      {
        rotulo: 'Visitou',
        eventos: [
          '16:01:44Viu a página',
          '16:01:45Rolou 25%',
          '16:01:46Rolou 50%',
          '16:01:47Rolou 75%',
          '16:01:48Rolou até o fim',
        ],
      },
      {
        rotulo: 'Abriu modal de entrada',
        eventos: ["16:01:49Viu a janela 'Vamos montar seu site'", '16:01:49Ficou 4 s nesta página'],
      },
    ]);
    expect(within(visita).queryByText('Carregou a tela do editor')).not.toBeInTheDocument();
  });

  // validation-fase2 L1: JSON real da API (instantes em ms Unix), com o mesmo JSON.parse do lib/api.ts.
  test('contrato real: eventos, visitas e contratações em milissegundos', async () => {
    const real = JSON.parse(
      '{"visitante":"' + ID + '","visitas":[{"visitante":"' + ID + '","visita":"7a1b2c3d-4e5f-4a6b-9c8d-0e1f2a3b4c5d","inicio":1793880000000,"fim":1793880003000,"aparelho":"celular","origem":"google_ads","campanha":"c1","paginas":1,"etapas":[1,2,8],"usos":["lp_menu_ia"],"teste":false}],"eventos":[{"em":1793880000000,"nome":"lp_page_view","caminho":"/saude","visita":"7a1b2c3d-4e5f-4a6b-9c8d-0e1f2a3b4c5d"}],"contratacoes":[{"tenant_id":"t-1","nome":"Espaço Sereno","status":"ATIVO","pago":true,"plano":"pagina","em":1793880004000}]}',
    ) as VisitanteJornada;
    vi.mocked(jornadaService.visitante).mockResolvedValue(real);
    renderizar();
    expect(await screen.findByText('1ª visita 5/11 09:00 · 1 visita')).toBeInTheDocument();
    const contratacao = screen.getByRole('region', { name: 'Contratação' });
    expect(within(contratacao).getByText('5/11 09:00')).toBeInTheDocument();
    const visita = screen.getByRole('region', { name: 'Visita de 5/11 · 09:00 · Celular · Anúncio do Google' });
    const [evento] = within(within(visita).getByRole('list', { name: 'Ações de Visitou' })).getAllByRole('listitem');
    expect(evento.textContent).toBe('09:00:00Viu a página');
    expect(within(evento).getByText('09:00:00')).toHaveAttribute('datetime', '2026-11-05T12:00:00.000Z');
  });

  // validation-fase2 L2: tenant removido chega com nome vazio.
  test('contratação de tenant removido mostra Empresa removida, sem link', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue({
      ...resposta,
      contratacoes: [{ ...resposta.contratacoes[0], tenant_id: 't-sumiu', nome: '' }],
    });
    renderizar();
    const secao = await screen.findByRole('region', { name: 'Contratação' });
    expect(within(secao).getByText('Empresa removida')).toBeInTheDocument();
    expect(within(secao).getByText('t-sumiu')).toBeInTheDocument();
    expect(within(secao).queryByRole('link')).not.toBeInTheDocument();
  });

  test('CA-2-08: 404 mostra Visitante não encontrado e o link de volta', async () => {
    vi.mocked(jornadaService.visitante).mockRejectedValue(new ApiError('visitante_nao_encontrado', 404));
    renderizar(true);
    expect(await screen.findByText('Visitante não encontrado.')).toBeInTheDocument();
    expect(jornadaService.visitante).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /Jornada/ })).toHaveAttribute('href', '/dashboard/jornada');
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
  });

  test('CA-2-09: outro erro mostra a mensagem e Tentar de novo refaz a chamada', async () => {
    vi.mocked(jornadaService.visitante).mockRejectedValue(new ApiError('internal', 500));
    renderizar();
    expect(await screen.findByText('Não foi possível carregar.')).toBeInTheDocument();
    // 5xx ainda tenta de novo 3 vezes antes de mostrar o erro.
    expect(jornadaService.visitante).toHaveBeenCalledTimes(4);
    vi.mocked(jornadaService.visitante).mockResolvedValue(resposta);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Visitante 2da0b6' })).toBeInTheDocument();
    expect(jornadaService.visitante).toHaveBeenCalledTimes(5);
  });

  test('carregando marca a página com aria-busy', () => {
    vi.mocked(jornadaService.visitante).mockReturnValue(new Promise(() => {}));
    renderizar();
    expect(screen.getByRole('region', { name: 'Caminho do visitante' })).toHaveAttribute('aria-busy', 'true');
  });
});

// spec-4-detalhe RF-4-27 e RF-4-28 (linha do tempo), CA-4-23.
describe('Página do visitante: tempo por página e resumo por visita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ visitante: ID });
  });

  // Duas visitas: editor 8 s + 12 s na da tarde e 30 s na da noite; a escolha só na da noite.
  const tempo = (em: number, caminho: string, visita: string, segundos: number): EventoJornada => ({
    em, nome: 'lp_tempo_na_pagina', caminho, visita, segundos,
  });
  const comTempo: VisitanteJornada = {
    ...resposta,
    eventos: [
      ...resposta.eventos,
      tempo(1793909600000, '/configurar/editar', VISITA_TARDE, 8),
      tempo(1793909700000, '/configurar/editar', VISITA_TARDE, 12),
      tempo(1793915470000, '/configurar', VISITA_NOITE, 40),
      tempo(1793915475000, '/configurar/editar', VISITA_NOITE, 30),
    ],
  };

  test('CA-4-23: "Tempo por página" soma todas as visitas, com "1 visita" e "2 visitas"', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue(comTempo);
    renderizar();
    const bloco = await screen.findByRole('region', { name: 'Tempo por página' });
    expect(within(bloco).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Editor · 50 s · 2 visitas',
      'Escolha do modelo · 40 s · 1 visita',
    ]);
    // Acima das visitas.
    const regioes = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label') ?? r.getAttribute('aria-labelledby'));
    expect(regioes.indexOf('titulo-tempo-por-pagina')).toBeLessThan(regioes.findIndex((r) => r?.startsWith('titulo-visita-')));
  });

  test('CA-4-23: cada visita mostra a trajetória com o tempo de cada nó, depois dos dados da visita', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue(comTempo);
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(visitas).toHaveLength(2);
    const [noite, tarde] = visitas;
    const listas = (secao: HTMLElement) => within(secao).getAllByRole('list').map((l) => l.getAttribute('aria-label'));
    expect(listas(noite)[0]).toBe('Trajetória da visita');
    // medicao-e-robustez MR-23: a visita da tarde tem campanha, então "Dados da visita" vem antes da trajetória.
    expect(listas(tarde).slice(0, 2)).toEqual(['Dados da visita', 'Trajetória da visita']);
    expect(nosDaVisita(tarde).map((n) => n.rotulo)).toEqual(['Visitou', 'Editor', 'Contratou']);
    expect(within(tarde).getByText('17:12:00 · Início · 2 min 30 s')).toBeInTheDocument();
    expect(within(tarde).getByText('17:14:30 · 17 min 10 s')).toBeInTheDocument();
    expect(nosDaVisita(noite).map((n) => n.rotulo)).toEqual(['Visitou', 'Início', 'Escolha do modelo']);
  });

  test('CA-4-23: com o JSON real, a trajetória mostra "Ficou 42 s nesta página"', async () => {
    const dados = JSON.parse(JSON.stringify(fixtureVisitanteComTempo)) as VisitanteJornada;
    vi.mocked(useParams).mockReturnValue({ visitante: dados.visitante });
    vi.mocked(jornadaService.visitante).mockResolvedValue(dados);
    renderizar();
    const [visita] = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(nosDaVisita(visita)).toEqual([
      {
        rotulo: 'Visitou',
        eventos: ['09:00:00Viu a página', '09:00:05Pôs ou trocou imagem', '09:00:42Ficou 42 s nesta página'],
      },
      { rotulo: 'Prévia', eventos: ['09:00:43Viu a página'] },
    ]);
    const bloco = screen.getByRole('region', { name: 'Tempo por página' });
    expect(within(bloco).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Editor · 42 s · 1 visita']);
  });
});

// medicao-e-robustez MR-23 (T24): cada visita mostra os dados da visita, com o JSON real da API.
describe('Página do visitante: dados da visita (MR-23)', () => {
  const dados = JSON.parse(JSON.stringify(fixtureVisitanteA1)) as VisitanteJornada;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ visitante: dados.visitante });
    vi.mocked(jornadaService.visitante).mockResolvedValue(dados);
  });

  test('a visita mostra campanha, grupo, palavra-chave, navegador e pagamento, e a trajetória traz os nomes da A1', async () => {
    renderizar();
    const [visita] = await screen.findAllByRole('region', { name: /^Visita de/ });
    const lista = within(visita).getByRole('list', { name: 'Dados da visita' });
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Campanha: pagina',
      'Grupo de anúncio: 187654321098',
      'Palavra-chave: criar site para psicólogo (de frase)',
      'Navegador: Chrome no Android',
      'Pagou em 15/11 às 09:32',
    ]);
    const trajetoria = within(visita).getByRole('list', { name: 'Trajetória da visita' });
    expect(within(trajetoria).getByText('Ficou 12 s no campo E-mail')).toBeInTheDocument();
  });

  test('visita sem nenhum dos campos não mostra a lista', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue(resposta);
    vi.mocked(useParams).mockReturnValue({ visitante: ID });
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    // A visita da noite (direto) não tem nenhum campo; a da tarde tem campanha.
    expect(within(visitas[0]).queryByRole('list', { name: 'Dados da visita' })).toBeNull();
    expect(within(within(visitas[1]).getByRole('list', { name: 'Dados da visita' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Campanha: vitrine-novembro',
    ]);
  });
});
