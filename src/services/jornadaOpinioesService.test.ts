import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/apiError';
import type { ResumoDeOpinioes } from '@/types/jornadaOpinioes';
import { jornadaOpinioesService } from './jornadaOpinioesService';
// JSON real de GET /admin/dashboard/jornada/opinioes (api, internal/handler/testdata/jornada-opinioes-resposta.json),
// copiado sem edição (L-071; opiniao-e-modelos RF-OM-15, DT-OM-17).
import fixtureOpinioes from './__fixtures__/jornada-opinioes-resposta.json';

vi.mock('@/lib/cognito', () => ({ userPool: {} }));

function respostaReal(status: number, corpo: string) {
  return new Response(corpo, { status, headers: { 'Content-Type': 'application/json' } });
}

describe('jornadaOpinioesService.resumo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lê GET /admin/dashboard/jornada/opinioes com de e ate em AAAA-MM-DD', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(fixtureOpinioes);
    await jornadaOpinioesService.resumo('2026-11-01', '2026-11-02');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/opinioes?de=2026-11-01&ate=2026-11-02');
  });

  it('devolve a resposta real da API sem conversão, com as chaves do contrato', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(200, JSON.stringify(fixtureOpinioes)));
    const resumo: ResumoDeOpinioes = await jornadaOpinioesService.resumo('2026-11-23', '2026-11-24');
    expect(resumo).toEqual(fixtureOpinioes);
    expect(Object.keys(resumo)).toEqual(['de', 'ate', 'media', 'total', 'por_nota', 'opinioes']);
    expect(Object.keys(resumo.por_nota)).toEqual(['1', '2', '3', '4', '5']);
    expect(Object.keys(resumo.opinioes[0])).toEqual([
      'em', 'nota', 'texto', 'modelo', 'tema', 'porta', 'visitante', 'visita',
    ]);
  });

  it('período inválido (400) rejeita com ApiError e o código da API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(400, JSON.stringify({ error: 'periodo_invalido' })));
    const erro = await jornadaOpinioesService.resumo('2026-01-01', '2026-11-22').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 400, message: 'periodo_invalido' });
  });

  it('outro papel (403) rejeita com ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(403, JSON.stringify({ error: 'Unauthorized' })));
    await expect(jornadaOpinioesService.resumo('2026-11-01', '2026-11-02')).rejects.toMatchObject({ status: 403 });
  });
});
