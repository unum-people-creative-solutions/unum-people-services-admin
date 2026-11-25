import { describe, expect, it } from 'vitest';
import type { FunilJornada } from '@/types/jornada';
import type { ResumoToolsUso } from '@/types/toolsUso';
import fixtureToolsUso from '@/services/__fixtures__/tools-uso-resposta.json';
import { diasDoPeriodo, semUsoDoTools, visitasPelaOrigem } from './toolsUso';

describe('diasDoPeriodo', () => {
  it('converte a janela em ms nos dias de Brasília (UTC-3)', () => {
    // 2026-11-20 02:30 UTC = 2026-11-19 23:30 em Brasília; 2026-11-22 12:00 UTC = 09:00 do dia 22.
    const desde = Date.UTC(2026, 10, 20, 2, 30);
    const ate = Date.UTC(2026, 10, 22, 12, 0);
    expect(diasDoPeriodo(desde, ate)).toEqual({ de: '2026-11-19', ate: '2026-11-22' });
  });

  it('uma janela curta dentro do mesmo dia dá o mesmo dia nas duas pontas', () => {
    const ate = Date.UTC(2026, 10, 22, 15, 0);
    expect(diasDoPeriodo(ate - 3_600_000, ate)).toEqual({ de: '2026-11-22', ate: '2026-11-22' });
  });
});

describe('semUsoDoTools', () => {
  it('é falso com a resposta real (há números)', () => {
    expect(semUsoDoTools(fixtureToolsUso as ResumoToolsUso)).toBe(false);
  });

  it('é verdadeiro quando todos os números são zero, e basta um número para ser falso', () => {
    const zerado: ResumoToolsUso = {
      de: '2026-11-20',
      ate: '2026-11-22',
      ferramentas: (fixtureToolsUso as ResumoToolsUso).ferramentas.map((f) => ({
        ...f, visita: 0, comecou: 0, resultado: 0, convite: 0, guia: 0, planilha: 0, baixou: 0,
      })),
      dias: [],
    };
    expect(semUsoDoTools(zerado)).toBe(true);
    const comUm: ResumoToolsUso = {
      ...zerado,
      ferramentas: zerado.ferramentas.map((f) => (f.ferramenta === 'vale-anunciar' ? { ...f, guia: 1 } : f)),
    };
    expect(semUsoDoTools(comUm)).toBe(false);
    const soBaixou: ResumoToolsUso = {
      ...zerado,
      ferramentas: zerado.ferramentas.map((f) => (f.ferramenta === 'qr-code' ? { ...f, baixou: 1 } : f)),
    };
    expect(semUsoDoTools(soBaixou)).toBe(false);
  });
});

describe('visitasPelaOrigem', () => {
  const funil: FunilJornada = {
    etapas: [
      { etapa: 1, aparelho: 'celular', origem: 'utm:tools', visitas: 4 },
      { etapa: 1, aparelho: 'computador', origem: 'utm:tools', visitas: 3 },
      { etapa: 2, aparelho: 'celular', origem: 'utm:tools', visitas: 2 },
      { etapa: 1, aparelho: 'celular', origem: 'utm:tools-outra', visitas: 9 },
      { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 8 },
    ],
    uso: [],
    pagou: [],
    leitura: [],
  };

  it('soma só a etapa 1 (Visitou) da origem pedida, de todos os aparelhos', () => {
    expect(visitasPelaOrigem(funil, 'utm:tools')).toBe(7);
  });

  it('é 0 sem nenhuma linha da origem', () => {
    expect(visitasPelaOrigem({ ...funil, etapas: [] }, 'utm:tools')).toBe(0);
  });
});
