import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi } from 'vitest';
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
