import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/apiError';
import type { EventoJornada, FunilJornada, LinhaLeitura, PaginaDeEntrada, VisitanteJornada } from '@/types/jornada';
import { jornadaService } from './jornadaService';
// JSON real de GET /admin/dashboard/jornada/funil (api, TASK-BE-304), copiado sem edição (L-071).
import fixtureFunilLeitura from './__fixtures__/funil-leitura.json';
// JSON real de GET /admin/dashboard/jornada/visitantes/{v} (api, TASK-BE-405), copiado sem edição (L-071).
import fixtureVisitanteComTempo from './__fixtures__/visitante-com-tempo.json';

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

// jornada-do-visitante spec-2-painel RF-2-01..03 e spec-4-detalhe RF-4-20: rotas e parâmetros.
describe('jornadaService', () => {
  afterEach(() => vi.restoreAllMocks());

  // O cartão do funil em /dashboard continua com de/ate em dias (spec-4 §Fora).
  it('funil com dias lê GET /admin/dashboard/jornada/funil com de e ate (formato antigo)', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ etapas: [], uso: [], pagou: [] });
    await jornadaService.funil('2026-10-30', '2026-11-05');
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/funil?de=2026-10-30&ate=2026-11-05');
  });

  // RF-4-20, CA-4-17: janela em milissegundos.
  it('funil(desde, ate) em ms lê GET /admin/dashboard/jornada/funil?desde=&ate=', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ etapas: [], uso: [], pagou: [], leitura: [] });
    await jornadaService.funil(1793833200000, 1793919600000);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/funil?desde=1793833200000&ate=1793919600000');
  });

  it('visitas(desde, ate) em ms lê GET /admin/dashboard/jornada/visitas?desde=&ate=', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue([]);
    await jornadaService.visitas(1793833200000, 1793919600000);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/visitas?desde=1793833200000&ate=1793919600000');
  });

  it('um erro da API rejeita funil e visitas pela janela', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      respostaReal(400, JSON.stringify({ error: 'periodo_invalido' })),
    );
    await expect(jornadaService.funil(2, 1)).rejects.toMatchObject({ status: 400 });
    await expect(jornadaService.visitas(2, 1)).rejects.toBeInstanceOf(ApiError);
  });

  it('visitante lê GET /admin/dashboard/jornada/visitantes/{id}', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({});
    await jornadaService.visitante('5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6');
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/visitantes/5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6');
  });
});

// spec-4-detalhe RF-4-20, CA-4-16: JSON real do handler da API (TASK-BE-405), copiado sem edição (L-071).
describe('jornadaService.visitante com segundos (contrato real)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('o evento de tempo traz segundos 42 e os outros não têm o campo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaReal(200, JSON.stringify(fixtureVisitanteComTempo)));
    const dados: VisitanteJornada = await jornadaService.visitante(fixtureVisitanteComTempo.visitante);
    const tempo: EventoJornada[] = dados.eventos.filter((e) => e.nome === 'lp_tempo_na_pagina');
    expect(tempo).toHaveLength(1);
    expect(tempo[0].segundos).toBe(42);
    expect(Object.keys(tempo[0])).toEqual(['em', 'nome', 'caminho', 'visita', 'segundos']);
    const outros = dados.eventos.filter((e) => e.nome !== 'lp_tempo_na_pagina');
    expect(outros).toHaveLength(3);
    for (const evento of outros) {
      expect(Object.keys(evento)).toEqual(['em', 'nome', 'caminho', 'visita']);
    }
  });
});
