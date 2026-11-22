import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi } from 'vitest';
import { jornadaService } from '@/services/jornadaService';
import { VisitasDoPeriodo } from './VisitasDoPeriodo';
import type { VisitaJornada } from '@/types/jornada';
// JSON real de GET /admin/dashboard/jornada/visitas (api, TASK-BE-106 e TASK-BE-204, L-071).
import fixtureVisitasA1 from '@/services/__fixtures__/visitas-a1.json';

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));

// O mesmo JSON.parse do lib/api.ts sobre o corpo real.
const visitas = JSON.parse(JSON.stringify(fixtureVisitasA1)) as VisitaJornada[];

function linhaDa(empresa: string) {
  const linha = screen.getAllByRole('row').find((r) => within(r).queryByRole('link', { name: empresa }) !== null);
  if (!linha) throw new Error(`sem a linha de ${empresa}`);
  return linha;
}

// medicao-e-robustez MR-24 (T25): "Pagou" pelo fato gravado na visita.
describe('VisitasDoPeriodo: selo "Pagou" pelo fato (MR-24)', () => {
  test('com pagou_em e conta cancelada, sem pagou_em e conta ativa, e sem os dois', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <VisitasDoPeriodo
          titulo="Visitas"
          textoVazio="Nada"
          comData={false}
          visitas={visitas}
          carregando={false}
          erro={false}
          onTentar={() => {}}
          mostrarTeste={false}
          onMostrarTeste={() => {}}
        />
      </QueryClientProvider>,
    );
    // Consultório Ana: pagou_em na visita, contratacao.pago falso (conta CANCELADO hoje).
    expect(visitas[0].pagou_em).toBeDefined();
    expect(visitas[0].contratacao?.pago).toBe(false);
    expect(within(linhaDa('Consultório Ana')).getByText('Pagou')).toBeInTheDocument();
    expect(within(linhaDa('Consultório Ana')).queryByText('Não pagou')).toBeNull();
    // Clínica Ana: sem pagou_em, conta ATIVO e pago.
    expect(visitas[1].pagou_em).toBeUndefined();
    expect(within(linhaDa('Clínica Ana')).getByText('Pagou')).toBeInTheDocument();
    // Espaço Leve: sem pagou_em e sem pagamento.
    expect(visitas[2].pagou_em).toBeUndefined();
    expect(visitas[2].contratacao?.pago).toBe(false);
    expect(within(linhaDa('Espaço Leve')).getByText('Não pagou')).toBeInTheDocument();
    expect(within(linhaDa('Espaço Leve')).queryByText('Pagou')).toBeNull();
  });
});

// configurador-com-ia SPEC_DEVIATION ADM-1: com a A2, a visita traz as etapas 10, 11 e 12
// (D-C-01) e os usos lp_topo_comecou e lp_site_montado_* (RF-A2-03), que não são uso do editor.
describe('VisitasDoPeriodo: visitas da entrada com IA (A2)', () => {
  const base: VisitaJornada = {
    visitante: '6f1c2a9e-3b7d-4c51-9a2e-8d4f0b6c1e27',
    visita: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    inicio: 1794745800000,
    fim: 1794745860000,
    aparelho: 'celular',
    origem: 'google_ads',
    paginas: 2,
    etapas: [],
    usos: [],
    teste: false,
  };

  function renderizar(lista: VisitaJornada[]) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <VisitasDoPeriodo
          titulo="Visitas"
          textoVazio="Nada"
          comData={false}
          visitas={lista}
          carregando={false}
          erro={false}
          onTentar={() => {}}
          mostrarTeste={false}
          onMostrarTeste={() => {}}
        />
      </QueryClientProvider>,
    );
    return screen.getAllByRole('row').slice(1);
  }

  test('"Até onde foi" segue a ordem da série nova, não o maior número', () => {
    const linhas = renderizar([
      { ...base, visita: 'a', etapas: [1, 10, 11, 12], usos: ['lp_topo_comecou', 'lp_site_montado_ia'] },
      { ...base, visita: 'b', etapas: [1, 10, 11, 12, 4], usos: ['lp_site_montado_reserva'] },
      { ...base, visita: 'c', etapas: [1, 10] },
      { ...base, visita: 'd', etapas: [1, 2, 3] },
    ]);
    expect(within(linhas[0]).getByText('Viu o site montado')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('Editou')).toBeInTheDocument();
    expect(within(linhas[2]).getByText('Começou')).toBeInTheDocument();
    expect(within(linhas[3]).getByText('Escolheu modelo e tema')).toBeInTheDocument();
  });

  test('"Usou o editor" não conta o campo do topo nem o site montado', () => {
    const linhas = renderizar([
      { ...base, visita: 'a', etapas: [1, 10, 11, 12], usos: ['lp_topo_comecou', 'lp_site_montado_ia'] },
      { ...base, visita: 'b', etapas: [1, 10, 11, 12], usos: ['lp_site_montado_ia', 'lp_ia_pedido_enviado'] },
    ]);
    expect(within(linhas[0]).queryByText('Usou o editor')).toBeNull();
    expect(within(linhas[1]).getByText('Usou o editor')).toBeInTheDocument();
  });

  // D-C-37: ordem 1→2→3→10→11→12→4→…; cada caso isola um vizinho da ordem.
  test.each([
    [[1, 2, 3, 10], 'Escolheu modelo e tema'],
    [[1, 10, 11], 'Enviou os dados'],
    [[1, 10, 11, 12], 'Viu o site montado'],
    [[1, 2, 10], 'Começou'],
  ])('D-C-37 — "Até onde foi" com as etapas %j mostra "%s"', (etapas, rotulo) => {
    const linhas = renderizar([{ ...base, etapas }]);
    expect(within(linhas[0]).getByText(rotulo)).toBeInTheDocument();
  });

  // D-C-37: cada uso que não é do editor, sozinho, não acende o selo.
  test.each([
    ['lp_topo_comecou'],
    ['lp_site_montado_ia'],
    ['lp_site_montado_reserva'],
    ['lp_site_montado_s_14'],
    ['lp_site_montado_s_mais'],
  ])('D-C-37 — "Usou o editor" ignora %s sozinho', (uso) => {
    const linhas = renderizar([{ ...base, etapas: [1, 10, 11, 12], usos: [uso] }]);
    expect(within(linhas[0]).queryByText('Usou o editor')).toBeNull();
  });
});

// jornada-fluxo-atual RF-JF-44 (pedido do dono, 20/11): na série nova, "Até onde foi" segue a sequência do funil.
describe('VisitasDoPeriodo: "Até onde foi" na série nova (RF-JF-44)', () => {
  // 20/11/2026 10:00 em Brasília: depois de DESDE_ENTRADA_COM_IA (17/11 16h28).
  const NOVA = Date.parse('2026-11-20T10:00:00-03:00');
  const base: VisitaJornada = {
    visitante: '6f1c2a9e-3b7d-4c51-9a2e-8d4f0b6c1e27',
    visita: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    inicio: NOVA,
    fim: NOVA + 60_000,
    aparelho: 'celular',
    origem: 'google_ads',
    paginas: 2,
    etapas: [],
    usos: [],
    teste: false,
  };

  function renderizar(lista: VisitaJornada[]) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <VisitasDoPeriodo
          titulo="Visitas"
          textoVazio="Nada"
          comData={false}
          visitas={lista}
          carregando={false}
          erro={false}
          onTentar={() => {}}
          mostrarTeste={false}
          onMostrarTeste={() => {}}
        />
      </QueryClientProvider>,
    );
    return screen.getAllByRole('row').slice(1);
  }

  test.each([
    [[1, 10, 11, 12, 5], 'Viu o site montado'],
    [[1, 10, 11, 12, 6], 'Abriu a contratação'],
    [[1, 10, 5], 'Abriu a prévia'],
  ])('visita da série nova com as etapas %j mostra "%s"', (etapas, rotulo) => {
    const linhas = renderizar([{ ...base, etapas }]);
    expect(within(linhas[0]).getByText(rotulo)).toBeInTheDocument();
  });

  test('a mesma visita, começada antes do corte, segue a ordem antiga', () => {
    const antes = Date.parse('2026-11-15T10:00:00-03:00');
    const linhas = renderizar([{ ...base, inicio: antes, fim: antes + 60_000, etapas: [1, 10, 11, 12, 5] }]);
    expect(within(linhas[0]).getByText('Viu a página final')).toBeInTheDocument();
  });

  // jornada-fluxo-atual RF-JF-45: a etapa 10 muda de nome só na série nova.
  test('etapa 10: "Abriu modal de entrada" na série nova e "Começou" antes do corte', () => {
    const antes = Date.parse('2026-11-15T10:00:00-03:00');
    const linhas = renderizar([
      { ...base, visita: 'nova', etapas: [1, 10], paginas: 3 },
      { ...base, visita: 'antiga', inicio: antes, fim: antes + 60_000, etapas: [1, 10], paginas: 3 },
    ]);
    expect(within(linhas[0]).getByText('Abriu modal de entrada')).toBeInTheDocument();
    expect(within(linhas[0]).queryByText('Começou')).toBeNull();
    expect(within(linhas[1]).getByText('Começou')).toBeInTheDocument();
  });

  // jornada-trajetoria T12 (RF-JT-41): os 8 pontinhos antes do nome do "Até onde foi".
  test('T12: série nova com [1, 10, 11] mostra "3 de 8 etapas"', () => {
    const linhas = renderizar([{ ...base, etapas: [1, 10, 11] }]);
    expect(within(linhas[0]).getByRole('img', { name: '3 de 8 etapas' })).toBeInTheDocument();
  });

  test('T12: "Editou" conta como "Enviou os dados" (3 de 8)', () => {
    const linhas = renderizar([{ ...base, etapas: [1, 10, 11, 4] }]);
    expect(within(linhas[0]).getByRole('img', { name: '3 de 8 etapas' })).toBeInTheDocument();
  });

  test('T12: contratou e pagou (pagou_em) mostra "8 de 8 etapas"; contratou sem pagar, 7', () => {
    const contratacao = { tenant_id: 't1', nome: 'Ana', status: 'ATIVO', pago: false, plano: 'pagina', em: NOVA + 20_000 };
    const linhas = renderizar([
      { ...base, visita: 'pagou', etapas: [1, 10, 11, 12, 6, 7, 8], contratacao, pagou_em: NOVA + 30_000 },
      { ...base, visita: 'nao-pagou', etapas: [1, 10, 11, 12, 6, 7, 8], contratacao },
      { ...base, visita: 'conta-paga', etapas: [1, 10, 11, 12, 6, 7, 8], contratacao: { ...contratacao, pago: true } },
    ]);
    expect(within(linhas[0]).getByRole('img', { name: '8 de 8 etapas' })).toBeInTheDocument();
    expect(within(linhas[1]).getByRole('img', { name: '7 de 8 etapas' })).toBeInTheDocument();
    expect(within(linhas[2]).getByRole('img', { name: '8 de 8 etapas' })).toBeInTheDocument();
  });

  test('T12: série antiga e visita sem etapa não têm pontinhos', () => {
    const antes = Date.parse('2026-11-15T10:00:00-03:00');
    const linhas = renderizar([
      { ...base, visita: 'antiga', inicio: antes, fim: antes + 60_000, etapas: [1, 2, 3] },
      { ...base, visita: 'sem-etapa', etapas: [] },
    ]);
    expect(within(linhas[0]).queryByRole('img', { name: /de 8 etapas/ })).toBeNull();
    expect(within(linhas[1]).queryByRole('img', { name: /de 8 etapas/ })).toBeNull();
  });

  // jornada-higiene-e-qualidade (RF-JH-21, RF-JH-23, RF-JH-24; CA-JH-21).
  test('CA-JH-21 — selos de montagem (IA, Reserva, Modelo pronto), Editou sem duplicar e N aberturas', () => {
    const antes = Date.parse('2026-11-15T10:00:00-03:00');
    const linhas = renderizar([
      {
        ...base,
        visita: 'reserva-3',
        visitasAgrupadas: ['reserva-3', 'r2', 'r3'],
        etapas: [1, 10, 11, 12],
        usos: ['lp_site_montado_reserva'],
      } as VisitaJornada,
      {
        ...base,
        visita: 'ia-editou',
        etapas: [1, 10, 11, 12, 4],
        usos: ['lp_site_montado_ia'],
      },
      {
        ...base,
        visita: 'modelo-pronto',
        etapas: [1, 10, 11, 12],
        usos: ['lp_site_montado_modelo_pronto'],
      },
      {
        ...base,
        visita: 'serie-antiga-editou',
        inicio: antes,
        fim: antes + 60_000,
        etapas: [1, 2, 3, 4],
        usos: [],
      },
    ]);

    expect(within(linhas[0]).getByText('3 aberturas')).toBeInTheDocument();
    expect(within(linhas[0]).getByText('Reserva (falha IA)')).toBeInTheDocument();
    expect(within(linhas[0]).queryByText('Editou')).toBeNull();

    expect(within(linhas[1]).getByText('Viu o site montado')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('IA')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('Editou')).toBeInTheDocument();
    expect(within(linhas[1]).queryByText(/aberturas/)).toBeNull();

    expect(within(linhas[2]).getByText('Modelo pronto')).toBeInTheDocument();

    // Na série antiga o texto principal já é "Editou": o selo "Editou" não duplica.
    expect(within(linhas[3]).getAllByText('Editou')).toHaveLength(1);
  });
});

// jornada-trajetoria T07 (RF-JT-30, RF-JT-31): a coluna "Páginas" vira "Tempo" (duração total da visita).
describe('VisitasDoPeriodo: coluna Tempo (RF-JT-30)', () => {
  const INICIO = Date.parse('2026-11-20T10:00:00-03:00');
  const base: VisitaJornada = {
    visitante: '6f1c2a9e-3b7d-4c51-9a2e-8d4f0b6c1e27',
    visita: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    inicio: INICIO,
    fim: INICIO + 682_000,
    aparelho: 'celular',
    origem: 'google_ads',
    paginas: 7,
    etapas: [1, 10],
    usos: [],
    teste: false,
  };

  function renderizar(lista: Array<VisitaJornada & { visitasAgrupadas?: readonly string[] }>) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <VisitasDoPeriodo
          titulo="Visitas"
          textoVazio="Nada"
          comData={false}
          visitas={lista}
          carregando={false}
          erro={false}
          onTentar={() => {}}
          mostrarTeste={false}
          onMostrarTeste={() => {}}
        />
      </QueryClientProvider>,
    );
    return screen.getAllByRole('row').slice(1);
  }

  test('o cabeçalho tem "Tempo" e não tem "Páginas"; a linha mostra a duração e não o número de páginas', () => {
    const linhas = renderizar([base]);
    expect(screen.getByRole('columnheader', { name: 'Tempo' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Páginas' })).toBeNull();
    expect(within(linhas[0]).getByText('11 min 22 s')).toBeInTheDocument();
    expect(within(linhas[0]).queryByText('7')).toBeNull();
  });

  test('a linha consolidada usa o fim consolidado', () => {
    const linhas = renderizar([{ ...base, fim: INICIO + 3_725_000, visitasAgrupadas: [base.visita, 'outra'] }]);
    expect(within(linhas[0]).getByText('1 h 02 min')).toBeInTheDocument();
  });

  test('visita sem duração mostra 0 s', () => {
    const linhas = renderizar([{ ...base, fim: INICIO }]);
    expect(within(linhas[0]).getByText('0 s')).toBeInTheDocument();
  });

  test('ao abrir a linha, aparece a trajetória com os eventos das visitas agrupadas e o link da âncora', async () => {
    vi.mocked(jornadaService.visitante).mockResolvedValue({
      visitante: base.visitante,
      visitas: [],
      contratacoes: [],
      eventos: [
        { em: INICIO, nome: 'lp_page_view', caminho: '/', visita: base.visita },
        { em: INICIO + 20_000, nome: 'lp_janela_aberta', caminho: '/configurar/editar', visita: base.visita },
        { em: INICIO + 600_000, nome: 'lp_page_view', caminho: '/', visita: 'outra' },
      ],
    });
    const linhas = renderizar([{ ...base, visitasAgrupadas: [base.visita, 'outra'] }]);
    fireEvent.click(within(linhas[0]).getByRole('button', { name: /Abrir a visita das/ }));
    const lista = await screen.findByRole('list', { name: 'Trajetória da visita' });
    expect(
      within(lista)
        .getAllByRole('listitem')
        .filter((li) => li.parentElement === lista),
    ).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Ver todas as ações desta visita' })).toHaveAttribute(
      'href',
      `/dashboard/jornada/${base.visitante}#visita-${base.visita}`,
    );
    expect(screen.queryByText(/\(saiu aqui\)/)).toBeNull();
  });
});
