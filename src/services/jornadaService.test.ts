import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/apiError';
import type { FunilJornada, LinhaLeitura, PaginaDeEntrada } from '@/types/jornada';
import { jornadaService } from './jornadaService';
// JSON real de GET /admin/dashboard/jornada/funil (api, TASK-BE-304), copiado sem edição (L-071).
import fixtureFunilLeitura from './__fixtures__/funil-leitura.json';

vi.mock('@/lib/cognito', () => ({ userPool: {} }));

// O corpo chega como texto e passa pelo mesmo JSON.parse do lib/api.ts.
function respostaReal(status: number, corpo: string) {
  return new Response(corpo, { status, headers: { 'Content-Type': 'application/json' } });
}

// spec-3-leitura RF-3-12, CA-3-16: o campo leitura, tipado campo a campo.
describe('jornadaService.funil com leitura (contrato real)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('devolve leitura como LinhaLeitura[], sem conversão', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(200, JSON.stringify(fixtureFunilLeitura)));
    const funil: FunilJornada = await jornadaService.funil('2026-10-30', '2026-11-05');
    const leitura: LinhaLeitura[] = funil.leitura;
    expect(leitura).toEqual(fixtureFunilLeitura.leitura);
    expect(Object.keys(leitura[0])).toEqual(['pagina', 'evento', 'aparelho', 'origem', 'visitas']);
    expect(funil.etapas).toEqual(fixtureFunilLeitura.etapas);
    expect(funil.uso).toEqual(fixtureFunilLeitura.uso);
    expect(funil.pagou).toEqual(fixtureFunilLeitura.pagou);
  });

  it('a fixture tem as quatro páginas e os quatro grupos, com evento sem lp_', () => {
    const paginas: PaginaDeEntrada[] = ['inicio', 'saude', 'crm', 'blog'];
    const linhas = fixtureFunilLeitura.leitura;
    expect([...new Set(linhas.map((l) => l.pagina))].sort()).toEqual([...paginas].sort());
    for (const grupo of ['visita', 'rolagem_', 'tempo_', 'secao_', 'clique_']) {
      expect(linhas.some((l) => l.evento.startsWith(grupo))).toBe(true);
    }
    expect(linhas.some((l) => l.evento.startsWith('lp_'))).toBe(false);
  });

  it('um erro da API rejeita a chamada', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(500, JSON.stringify({ error: 'internal' })));
    await expect(jornadaService.funil('2026-10-30', '2026-11-05')).rejects.toBeInstanceOf(ApiError);
  });
});

// jornada-do-visitante spec-2-painel RF-2-01..03: rotas e parâmetros.
describe('jornadaService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('funil lê GET /admin/dashboard/jornada/funil com de e ate', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ etapas: [], uso: [], pagou: [] });
    await jornadaService.funil('2026-10-30', '2026-11-05');
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/funil?de=2026-10-30&ate=2026-11-05');
  });

  it('visitas lê GET /admin/dashboard/jornada/visitas com dia e teste=0', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue([]);
    await jornadaService.visitas('2026-11-05', false);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/visitas?dia=2026-11-05&teste=0');
  });

  it('visitas com teste pede teste=1', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue([]);
    await jornadaService.visitas('2026-11-05', true);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/visitas?dia=2026-11-05&teste=1');
  });

  it('visitante lê GET /admin/dashboard/jornada/visitantes/{id}', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({});
    await jornadaService.visitante('5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6');
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/visitantes/5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6');
  });
});
