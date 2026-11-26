import { describe, expect, it } from 'vitest';
import type { MontagensDoModelo } from '@/types/jornadaModelos';
import { principaisDoPeriodo } from './jornadaModelos';

// top5-modelos-e-cores RF-01 a RF-03.

const linha = (id: string, extra: Partial<MontagensDoModelo> = {}): MontagensDoModelo => ({
  id, rotulo: id, ia: 0, pessoa: 0, reserva: 0, saiu: 0, entrou: 0, contratados: 0, ...extra,
});

const ids = (ls: MontagensDoModelo[]) => ls.map((l) => l.id);

describe('principaisDoPeriodo', () => {
  it('ordena do maior movimento para o menor (soma das 6 colunas)', () => {
    const r = principaisDoPeriodo([
      linha('a', { ia: 1 }),
      linha('b', { pessoa: 2, reserva: 1, saiu: 1, entrou: 1, contratados: 1, ia: 1 }),
      linha('c', { contratados: 3 }),
    ]);
    expect(ids(r)).toEqual(['b', 'c', 'a']);
  });

  it('corta em 5 por padrão e no limite informado', () => {
    const entrada = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) => linha(id, { ia: 10 - i }));
    expect(ids(principaisDoPeriodo(entrada))).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ids(principaisDoPeriodo(entrada, 2))).toEqual(['a', 'b']);
  });

  it('empate mantém a ordem de entrada', () => {
    const entrada = [linha('a', { ia: 2 }), linha('b', { pessoa: 5 }), linha('c', { saiu: 2 }), linha('d', { entrou: 5 })];
    expect(ids(principaisDoPeriodo(entrada))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('empate mantém a ordem de entrada também quando o corte cai no meio do empate', () => {
    const entrada = Array.from({ length: 8 }, (_, i) => linha(`x${i}`, { ia: 1 }));
    expect(ids(principaisDoPeriodo(entrada))).toEqual(['x0', 'x1', 'x2', 'x3', 'x4']);
  });

  it('empate segue a posição na entrada, não a ordem do id (l2 antes de l11, como no catálogo)', () => {
    const entrada = [linha('l2', { ia: 3 }), linha('l11', { pessoa: 3 }), linha('l1', { entrou: 3 })];
    expect(ids(principaisDoPeriodo(entrada))).toEqual(['l2', 'l11', 'l1']);
  });

  it('descarta movimento 0; uma única coluna diferente de 0 conta', () => {
    const entrada = [linha('a'), linha('b', { entrou: 1 }), linha('c'), linha('d', { reserva: 1 })];
    expect(ids(principaisDoPeriodo(entrada))).toEqual(['b', 'd']);
  });

  it('tudo zerado ou lista vazia devolve lista vazia', () => {
    expect(principaisDoPeriodo([linha('a'), linha('b')])).toEqual([]);
    expect(principaisDoPeriodo([])).toEqual([]);
  });

  it('não muda o array de entrada nem as linhas', () => {
    const entrada = [linha('a', { ia: 1 }), linha('b', { ia: 3 }), linha('c')];
    const copia = structuredClone(entrada);
    const r = principaisDoPeriodo(entrada);
    expect(entrada).toEqual(copia);
    expect(r).not.toBe(entrada);
  });
});
