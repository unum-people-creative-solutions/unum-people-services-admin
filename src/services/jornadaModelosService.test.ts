import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/apiError';
import type { ResumoDeModelos } from '@/types/jornadaModelos';
import { jornadaModelosService } from './jornadaModelosService';
// JSON real de GET /admin/dashboard/jornada/modelos (api, internal/handler/testdata/jornada-modelos-resposta.json),
// copiado sem edição (L-071; opiniao-e-modelos RF-OM-09, DT-OM-06).
import fixtureModelos from './__fixtures__/jornada-modelos-resposta.json';

vi.mock('@/lib/cognito', () => ({ userPool: {} }));

function respostaReal(status: number, corpo: string) {
  return new Response(corpo, { status, headers: { 'Content-Type': 'application/json' } });
}

describe('jornadaModelosService.resumo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lê GET /admin/dashboard/jornada/modelos com de e ate em AAAA-MM-DD', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(fixtureModelos);
    await jornadaModelosService.resumo('2026-11-01', '2026-11-02');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/modelos?de=2026-11-01&ate=2026-11-02');
  });

  it('devolve a resposta real da API sem conversão, com as chaves do contrato', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(200, JSON.stringify(fixtureModelos)));
    const resumo: ResumoDeModelos = await jornadaModelosService.resumo('2026-11-01', '2026-11-02');
    expect(resumo).toEqual(fixtureModelos);
    expect(Object.keys(resumo)).toEqual(['de', 'ate', 'modelos', 'temas']);
    expect(Object.keys(resumo.modelos[0])).toEqual([
      'id', 'rotulo', 'ia', 'pessoa', 'reserva', 'saiu', 'entrou', 'contratados',
    ]);
    expect(Object.keys(resumo.temas[0])).toEqual([
      'id', 'rotulo', 'ia', 'pessoa', 'reserva', 'saiu', 'entrou', 'contratados',
    ]);
    expect(resumo.modelos).toHaveLength(11);
    expect(resumo.temas).toHaveLength(39);
  });

  it('período inválido (400) rejeita com ApiError e o código da API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(400, JSON.stringify({ error: 'periodo_invalido' })));
    const erro = await jornadaModelosService.resumo('2026-01-01', '2026-11-22').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 400, message: 'periodo_invalido' });
  });

  it('outro papel (403) rejeita com ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(403, JSON.stringify({ error: 'Unauthorized' })));
    await expect(jornadaModelosService.resumo('2026-11-01', '2026-11-02')).rejects.toMatchObject({ status: 403 });
  });
});
