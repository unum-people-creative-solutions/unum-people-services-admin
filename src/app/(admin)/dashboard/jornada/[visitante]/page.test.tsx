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

  test('CA-2-08 e CA-2-10: visitas da mais recente à mais antiga, eventos em ordem, rótulos em português e hora de Brasília', async () => {
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(visitas.map((s) => within(s).getByRole('heading').textContent)).toEqual([
      'Visita de 5/11 · 18:51 · Celular · Direto',
      'Visita de 5/11 · 17:12 · Computador · Anúncio do Google',
    ]);
    const linhas = (secao: HTMLElement) =>
      within(within(secao).getByRole('list', { name: 'Linha do tempo' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent);
    expect(linhas(visitas[0])).toEqual([
      '18:51:08Abriu o editor/configurar/editar',
      '18:51:19Viu a página/',
      '18:51:21lp_evento_novo/configurar',
    ]);
    expect(linhas(visitas[1])).toEqual([
      '17:12:00Viu a página/',
      '17:14:30Menu: Editar tema/configurar/editar',
      '17:31:40Contratou/configurar/sucesso',
    ]);
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
    const [evento] = within(within(visita).getByRole('list', { name: 'Linha do tempo' })).getAllByRole('listitem');
    expect(evento.textContent).toBe('09:00:00Viu a página/saude');
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

  test('CA-4-23: cada visita mostra o resumo acima da linha do tempo', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue(comTempo);
    renderizar();
    const visitas = await screen.findAllByRole('region', { name: /^Visita de/ });
    expect(visitas).toHaveLength(2);
    for (const visita of visitas) {
      const listas = within(visita).getAllByRole('list').map((l) => l.getAttribute('aria-label'));
      expect(listas).toEqual(['Páginas da visita', 'Linha do tempo']);
    }
    const [noite, tarde] = visitas;
    const linhasDasPaginas = (secao: HTMLElement) =>
      within(within(secao).getByRole('list', { name: 'Páginas da visita' }))
        .getAllByRole('listitem')
        .map((li) => within(li).getAllByRole('paragraph')[0].textContent);
    expect(linhasDasPaginas(tarde)).toEqual([
      'Início —Tempo medido a partir da publicação desta fase',
      'Editor 20 s',
      'Sucesso —Tempo medido a partir da publicação desta fase',
    ]);
    expect(linhasDasPaginas(noite)).toEqual([
      'Editor 30 s',
      'Escolha do modelo 40 s',
      'Início —Tempo medido a partir da publicação desta fase',
    ]);
  });

  test('CA-4-23: com o JSON real, a linha do tempo mostra "Ficou 42 s nesta página"', async () => {
    const dados = JSON.parse(JSON.stringify(fixtureVisitanteComTempo)) as VisitanteJornada;
    vi.mocked(useParams).mockReturnValue({ visitante: dados.visitante });
    vi.mocked(jornadaService.visitante).mockResolvedValue(dados);
    renderizar();
    const [visita] = await screen.findAllByRole('region', { name: /^Visita de/ });
    const linhaDoTempo = within(visita).getByRole('list', { name: 'Linha do tempo' });
    expect(within(linhaDoTempo).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '09:00:00Viu a página/configurar/editar',
      '09:00:05Clicou: Pôs ou trocou imagem/configurar/editar',
      '09:00:42Ficou 42 s nesta página/configurar/editar',
      '09:00:43Viu a página/configurar/preview',
    ]);
    expect(within(linhaDoTempo).getByText('Ficou 42 s nesta página').textContent).toBe('Ficou 42 s nesta página');
    const bloco = screen.getByRole('region', { name: 'Tempo por página' });
    expect(within(bloco).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Editor · 42 s · 1 visita']);
  });
});
