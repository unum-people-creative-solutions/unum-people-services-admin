import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import type { FunilJornada, LinhaSemSinal } from '@/types/jornada';
import { jornadaService } from './jornadaService';
// Resposta real de GET /admin/dashboard/jornada/funil?desde=&ate= com a exclusão padrão
// (medicao-de-mercado M3, RF-MM-35), copiada byte a byte de internal/handler/testdata/ da API.
import fixtureFunilSemSinal from './__fixtures__/funil-sem-sinal.json';

vi.mock('@/lib/cognito', () => ({ userPool: {} }));

// medicao-de-mercado M3, RF-MM-36 (T26): o funil por janela aceita incluir as sessões sem sinal humano.
describe('jornadaService.funil e as sessões sem sinal humano', () => {
  afterEach(() => vi.restoreAllMocks());

  it('com incluirSemSinal true acrescenta &sem_sinal=incluir', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ etapas: [], uso: [], pagou: [], leitura: [] });
    await jornadaService.funil(1793833200000, 1793919600000, { incluirSemSinal: true });
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/funil?desde=1793833200000&ate=1793919600000&sem_sinal=incluir');
  });

  it('sem a opção ou com false a URL é a de hoje', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ etapas: [], uso: [], pagou: [], leitura: [] });
    await jornadaService.funil(1, 2);
    await jornadaService.funil(1, 2, { incluirSemSinal: false });
    await jornadaService.funil(1, 2, {});
    expect(get).toHaveBeenNthCalledWith(1, '/admin/dashboard/jornada/funil?desde=1&ate=2');
    expect(get).toHaveBeenNthCalledWith(2, '/admin/dashboard/jornada/funil?desde=1&ate=2');
    expect(get).toHaveBeenNthCalledWith(3, '/admin/dashboard/jornada/funil?desde=1&ate=2');
  });

  it('o formato antigo por dia não muda', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ etapas: [], uso: [], pagou: [], leitura: [] });
    await jornadaService.funil('2026-10-30', '2026-11-05');
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/funil?de=2026-10-30&ate=2026-11-05');
  });

  it('a resposta real traz sem_sinal_humano tipado, com aparelho, origem e visitas', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(fixtureFunilSemSinal);
    const funil: FunilJornada = await jornadaService.funil(1794830400000, 1794834000000);
    const linhas: LinhaSemSinal[] = funil.sem_sinal_humano ?? [];
    expect(linhas).toEqual(fixtureFunilSemSinal.sem_sinal_humano);
    expect(linhas.length).toBeGreaterThan(0);
    expect(Object.keys(linhas[0])).toEqual(['aparelho', 'origem', 'visitas']);
  });

  const pastaDaApi =
    process.env.JORNADA_API_TESTDATA ?? resolve(process.cwd(), '../unum-people-services-api/internal/handler/testdata');
  const copiaDaApi = resolve(pastaDaApi, 'jornada-funil-sem-sinal.json');
  it.skipIf(!existsSync(copiaDaApi))('funil-sem-sinal.json é cópia byte a byte de jornada-funil-sem-sinal.json da API', () => {
    const local = readFileSync(resolve(process.cwd(), 'src/services/__fixtures__/funil-sem-sinal.json'));
    expect(local.equals(readFileSync(copiaDaApi))).toBe(true);
  });
});
