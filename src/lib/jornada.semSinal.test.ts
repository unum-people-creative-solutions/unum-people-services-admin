import { describe, expect, it } from 'vitest';
import { consolidarVisitas } from './jornada';
import type { VisitaJornada } from '@/types/jornada';

// medicao-de-mercado M3, RF-MM-38 (T28): a linha consolidada só é "sem sinal humano" se todas as aberturas
// agrupadas são (o mesmo RF-MM-31 da API); o critério em si nunca é recalculado no navegador.

const MIN = 60_000;
const BASE = 1794744000000;
const VID = '3f2b8c1e-9d4a-4b7e-8a6f-1c2d3e4f5a6b';

function abertura(visita: string, minutos: number, extra: Partial<VisitaJornada> = {}): VisitaJornada {
  return {
    visitante: VID,
    visita,
    inicio: BASE + minutos * MIN,
    fim: BASE + (minutos + 1) * MIN,
    aparelho: 'celular',
    origem: 'google_ads',
    paginas: 1,
    etapas: [1],
    usos: [],
    teste: false,
    ...extra,
  };
}

describe('consolidarVisitas e sem_sinal_humano', () => {
  it('todas as aberturas com a marca: a linha consolidada tem a marca', () => {
    const out = consolidarVisitas([abertura('a', 0, { sem_sinal_humano: true }), abertura('b', 10, { sem_sinal_humano: true })]);
    expect(out).toHaveLength(1);
    expect(out[0].visitasAgrupadas).toHaveLength(2);
    expect(out[0].sem_sinal_humano).toBe(true);
  });

  it('uma abertura sem a marca: a linha consolidada não tem a marca (a primeira com, a segunda sem)', () => {
    const out = consolidarVisitas([abertura('a', 0, { sem_sinal_humano: true }), abertura('b', 10, { etapas: [] })]);
    expect(out).toHaveLength(1);
    expect(out[0].sem_sinal_humano).toBeUndefined();
  });

  it('uma abertura sem a marca: a linha consolidada não tem a marca (a primeira sem, a segunda com)', () => {
    const out = consolidarVisitas([abertura('a', 0, { etapas: [1, 2] }), abertura('b', 10, { sem_sinal_humano: true })]);
    expect(out).toHaveLength(1);
    expect(out[0].sem_sinal_humano).toBeUndefined();
  });

  it('duas sessões separadas pelo intervalo: cada uma guarda a própria marca', () => {
    const out = consolidarVisitas([abertura('a', 0, { sem_sinal_humano: true }), abertura('b', 120, { etapas: [1, 2] })]);
    expect(out).toHaveLength(2);
    const porVisita = new Map(out.map((v) => [v.visita, v.sem_sinal_humano]));
    expect(porVisita.get('a')).toBe(true);
    expect(porVisita.get('b')).toBeUndefined();
  });

  it('uma abertura só: mantém o que a API mandou', () => {
    expect(consolidarVisitas([abertura('a', 0, { sem_sinal_humano: true })])[0].sem_sinal_humano).toBe(true);
    expect(consolidarVisitas([abertura('a', 0)])[0].sem_sinal_humano).toBeUndefined();
  });

  it('teste e real do mesmo visitante continuam separados', () => {
    const out = consolidarVisitas([abertura('a', 0, { sem_sinal_humano: true }), abertura('t', 5, { teste: true, sem_sinal_humano: true })]);
    expect(out).toHaveLength(2);
  });
});
