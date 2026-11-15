import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DadosDaVisita } from './DadosDaVisita';
import { VisitasDoPeriodo } from './VisitasDoPeriodo';
import { jornadaService } from '@/services/jornadaService';
import type { VisitaJornada, VisitanteJornada } from '@/types/jornada';
// JSON real de GET /admin/dashboard/jornada/visitas e /visitantes/{v} (api, TASK-BE-106 e TASK-BE-204, L-071).
import fixtureVisitasA1 from '@/services/__fixtures__/visitas-a1.json';
import fixtureVisitanteA1 from '@/services/__fixtures__/visitante-a1.json';

// medicao-e-robustez MR-23 (T24): dados do anúncio, do navegador e do pagamento da visita.

vi.mock('@/services/jornadaService', () => ({
  jornadaService: { funil: vi.fn(), visitas: vi.fn(), visitante: vi.fn() },
}));

// O mesmo JSON.parse do lib/api.ts sobre o corpo real.
const visitas = JSON.parse(JSON.stringify(fixtureVisitasA1)) as VisitaJornada[];
const visitante = JSON.parse(JSON.stringify(fixtureVisitanteA1)) as VisitanteJornada;
const [comAnuncio, assinatura, semTermo, semNada] = visitas;

function itens() {
  const lista = screen.getByRole('list', { name: 'Dados da visita' });
  return within(lista).getAllByRole('listitem').map((li) => li.textContent);
}

describe('DadosDaVisita (MR-23)', () => {
  test('visita do anúncio: campanha, grupo, palavra-chave com a correspondência, navegador e pagamento', () => {
    render(<DadosDaVisita visita={comAnuncio} />);
    // pagou_em 1794745920000 = 2026-11-15T12:32:00Z = 15/11 09:32 em Brasília.
    expect(itens()).toEqual([
      'Campanha: pagina',
      'Grupo de anúncio: 187654321098',
      'Palavra-chave: criar site para psicólogo (de frase)',
      'Navegador: Chrome no Android',
      'Pagou em 15/11 às 09:32',
    ]);
  });

  test('sem termo e com grupo: "Palavra-chave: sem termo"', () => {
    render(<DadosDaVisita visita={semTermo} />);
    expect(itens()).toEqual([
      'Campanha: saude',
      'Grupo de anúncio: 187654321099',
      'Palavra-chave: sem termo',
      'Navegador: Safari no iOS',
    ]);
  });

  test('só campanha e navegador: nada de grupo nem palavra-chave', () => {
    render(<DadosDaVisita visita={assinatura} />);
    expect(itens()).toEqual(['Campanha: clinica-ana', 'Navegador: Edge no Windows']);
  });

  test('visita sem nenhum dos campos não renderiza a lista', () => {
    render(<DadosDaVisita visita={semNada} />);
    expect(screen.queryByRole('list', { name: 'Dados da visita' })).toBeNull();
  });

  test('correspondência exata, ampla e "a"; navegador e sistema fora das listas saem crus', () => {
    const { rerender } = render(<DadosDaVisita visita={{ ...semNada, termo: 'site', correspondencia: 'e' }} />);
    expect(itens()).toEqual(['Palavra-chave: site (exata)']);
    rerender(<DadosDaVisita visita={{ ...semNada, termo: 'site', correspondencia: 'b' }} />);
    expect(itens()).toEqual(['Palavra-chave: site (ampla)']);
    rerender(<DadosDaVisita visita={{ ...semNada, termo: 'site', correspondencia: 'a' }} />);
    expect(itens()).toEqual(['Palavra-chave: site (a)']);
    rerender(<DadosDaVisita visita={{ ...semNada, correspondencia: 'p' }} />);
    expect(itens()).toEqual(['Palavra-chave: sem termo']);
    rerender(<DadosDaVisita visita={{ ...semNada, navegador: 'samsung-outro' }} />);
    expect(itens()).toEqual(['Navegador: Samsung Internet no outro sistema']);
    rerender(<DadosDaVisita visita={{ ...semNada, navegador: 'outro-chromeos' }} />);
    expect(itens()).toEqual(['Navegador: outro navegador no ChromeOS']);
    rerender(<DadosDaVisita visita={{ ...semNada, navegador: 'brave-haiku' }} />);
    expect(itens()).toEqual(['Navegador: brave no haiku']);
  });

  test('o termo é texto, nunca HTML', () => {
    render(<DadosDaVisita visita={{ ...semNada, termo: '<b>site</b>' }} />);
    expect(itens()).toEqual(['Palavra-chave: <b>site</b>']);
    expect(screen.getByRole('list', { name: 'Dados da visita' }).querySelector('b')).toBeNull();
  });
});

describe('VisitasDoPeriodo mostra os dados da visita na linha aberta (MR-23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(jornadaService.visitante).mockResolvedValue(visitante);
  });

  test('abrir a linha mostra a lista; fechada, não', async () => {
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
    expect(screen.queryByRole('list', { name: 'Dados da visita' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir a visita das 09:30' }));
    expect(itens()).toEqual([
      'Campanha: pagina',
      'Grupo de anúncio: 187654321098',
      'Palavra-chave: criar site para psicólogo (de frase)',
      'Navegador: Chrome no Android',
      'Pagou em 15/11 às 09:32',
    ]);
  });
});
