import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/apiError';
import type { ResumoToolsUso } from '@/types/toolsUso';
import { toolsUsoService } from './toolsUsoService';
// JSON real de GET /admin/dashboard/tools-uso (api, internal/handler/testdata/tools-uso-resposta.json),
// copiado sem edição (L-071; medicao-de-uso DT-MU-08, RF-MU-06).
import fixtureToolsUso from './__fixtures__/tools-uso-resposta.json';

vi.mock('@/lib/cognito', () => ({ userPool: {} }));

// O corpo chega como texto e passa pelo mesmo JSON.parse do lib/api.ts.
function respostaReal(status: number, corpo: string) {
  return new Response(corpo, { status, headers: { 'Content-Type': 'application/json' } });
}

describe('toolsUsoService.resumo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lê GET /admin/dashboard/tools-uso com de e ate em AAAA-MM-DD', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(fixtureToolsUso);
    await toolsUsoService.resumo('2026-11-20', '2026-11-22');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/tools-uso?de=2026-11-20&ate=2026-11-22');
  });

  it('devolve a resposta real da API sem conversão, com as chaves do contrato', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(200, JSON.stringify(fixtureToolsUso)));
    const resumo: ResumoToolsUso = await toolsUsoService.resumo('2026-11-20', '2026-11-22');
    expect(resumo).toEqual(fixtureToolsUso);
    expect(Object.keys(resumo)).toEqual(['de', 'ate', 'ferramentas', 'dias']);
    expect(Object.keys(resumo.ferramentas[0])).toEqual([
      'ferramenta', 'visita', 'comecou', 'resultado', 'convite', 'guia', 'planilha', 'baixou',
    ]);
    expect(resumo.ferramentas.map((f) => f.ferramenta)).toEqual([
      'home', 'quanto-cobrar', 'vale-anunciar', 'servicos-compensam', 'qr-code',
    ]);
    expect(Object.keys(resumo.dias[0])).toEqual(['dia', 'ferramenta', 'evento', 'n']);
  });

  it('período inválido (400) rejeita com ApiError e o código da API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(400, JSON.stringify({ error: 'periodo_invalido' })));
    const erro = await toolsUsoService.resumo('2026-01-01', '2026-11-22').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 400, message: 'periodo_invalido' });
  });

  it('outro papel (403) rejeita com ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(403, JSON.stringify({ error: 'Unauthorized' })));
    await expect(toolsUsoService.resumo('2026-11-20', '2026-11-22')).rejects.toMatchObject({ status: 403 });
  });
});
