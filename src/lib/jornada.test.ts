import { describe, expect, it } from 'vitest';
import type { FunilJornada } from '@/types/jornada';
import {
  ROTULOS_ETAPAS,
  rotuloDoEvento,
  rotuloDoAparelho,
  grupoDaOrigem,
  ROTULOS_ORIGEM,
  calcularFunil,
  calcularUso,
  taxa,
  periodoUtc,
  diaUtc,
  somarDias,
  formatarHora,
  formatarHoraComSegundos,
  formatarDiaMes,
  formatarDia,
  maiorEtapa,
} from './jornada';

// spec-2-painel CA-2-07 e CA-2-10; rótulos do blueprint §5.

const funil: FunilJornada = {
  etapas: [
    { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 50 },
    { etapa: 1, aparelho: 'computador', origem: 'google_ads', visitas: 20 },
    { etapa: 1, aparelho: 'celular', origem: 'utm:instagram', visitas: 10 },
    { etapa: 1, aparelho: 'computador', origem: 'ref:www.bing.com', visitas: 15 },
    { etapa: 1, aparelho: 'celular', origem: 'direto', visitas: 25 },
    { etapa: 2, aparelho: 'celular', origem: 'google_ads', visitas: 20 },
    { etapa: 2, aparelho: 'computador', origem: 'direto', visitas: 8 },
    { etapa: 2, aparelho: 'celular', origem: 'utm:facebook', visitas: 4 },
    { etapa: 8, aparelho: 'computador', origem: 'google_ads', visitas: 3 },
  ],
  uso: [
    { evento: 'lp_menu_tema', aparelho: 'celular', origem: 'google_ads', visitas: 5 },
    { evento: 'lp_menu_tema', aparelho: 'computador', origem: 'direto', visitas: 2 },
    { evento: 'lp_ia_copiou', aparelho: 'computador', origem: 'google_ads', visitas: 4 },
  ],
  pagou: [
    { aparelho: 'computador', origem: 'google_ads', visitas: 2 },
    { aparelho: 'celular', origem: 'direto', visitas: 1 },
  ],
  leitura: [],
};

describe('rótulos', () => {
  it('as 9 etapas na ordem do blueprint', () => {
    expect(ROTULOS_ETAPAS).toEqual([
      'Visitou',
      'Abriu o configurador',
      'Escolheu modelo e tema',
      'Editou',
      'Viu a página final',
      'Abriu a contratação',
      'Enviou a contratação',
      'Contratou',
      'Pagou',
    ]);
  });

  it('eventos da linha do tempo pela tabela do §5', () => {
    const tabela: Record<string, string> = {
      lp_page_view: 'Viu a página',
      lp_config_started: 'Abriu o configurador',
      lp_selection_completed: 'Escolheu modelo e tema',
      lp_editor_opened: 'Abriu o editor',
      lp_first_edit: 'Editou pela primeira vez',
      lp_preview_opened: 'Viu a página final',
      lp_checkout_opened: 'Abriu a contratação',
      lp_checkout_submitted: 'Enviou a contratação',
      lp_checkout_succeeded: 'Contratou',
      lp_menu_tema: 'Menu: Editar tema',
      lp_menu_layout: 'Menu: Editar layout',
      lp_menu_dados: 'Menu: Dados da página',
      lp_menu_buscas: 'Menu: Buscas',
      lp_menu_ia: 'Menu: Editar com sua IA',
      lp_menu_guia: 'Menu: Como editar',
      lp_ia_copiou: 'IA: copiou as instruções',
      lp_ia_viu_mudancas: 'IA: viu as mudanças',
      lp_ia_resposta_invalida: 'IA: resposta não lida',
      lp_ia_aplicou: 'IA: aplicou as mudanças',
    };
    for (const [evento, rotulo] of Object.entries(tabela)) {
      expect(rotuloDoEvento(evento)).toBe(rotulo);
    }
    expect(rotuloDoEvento('lp_desconhecido')).toBeNull();
  });

  it('aparelho', () => {
    expect(rotuloDoAparelho('celular')).toBe('Celular');
    expect(rotuloDoAparelho('computador')).toBe('Computador');
  });
});

describe('grupoDaOrigem', () => {
  it('agrupa a origem crua (blueprint §3.1)', () => {
    expect(grupoDaOrigem('google_ads')).toBe('google');
    expect(grupoDaOrigem('utm:instagram')).toBe('campanha');
    expect(grupoDaOrigem('ref:www.bing.com')).toBe('site');
    expect(grupoDaOrigem('direto')).toBe('direto');
    expect(grupoDaOrigem('outra')).toBeNull();
    expect(ROTULOS_ORIGEM).toEqual({
      google: 'Anúncio do Google',
      campanha: 'Outra campanha',
      site: 'Outro site',
      direto: 'Direto',
    });
  });
});

describe('calcularFunil', () => {
  it('sem filtro soma tudo, com Pagou na 9ª posição', () => {
    expect(calcularFunil(funil, { origem: 'todas', aparelho: 'todos' })).toEqual([120, 32, 0, 0, 0, 0, 0, 3, 3]);
  });

  it('filtra por origem', () => {
    expect(calcularFunil(funil, { origem: 'google', aparelho: 'todos' })).toEqual([70, 20, 0, 0, 0, 0, 0, 3, 2]);
    expect(calcularFunil(funil, { origem: 'campanha', aparelho: 'todos' })).toEqual([10, 4, 0, 0, 0, 0, 0, 0, 0]);
    expect(calcularFunil(funil, { origem: 'site', aparelho: 'todos' })).toEqual([15, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(calcularFunil(funil, { origem: 'direto', aparelho: 'todos' })).toEqual([25, 8, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('filtra por aparelho e combina os dois', () => {
    expect(calcularFunil(funil, { origem: 'todas', aparelho: 'celular' })).toEqual([85, 24, 0, 0, 0, 0, 0, 0, 1]);
    expect(calcularFunil(funil, { origem: 'google', aparelho: 'computador' })).toEqual([20, 0, 0, 0, 0, 0, 0, 3, 2]);
  });
});

describe('calcularUso', () => {
  it('soma por evento com os filtros', () => {
    expect(calcularUso(funil, { origem: 'todas', aparelho: 'todos' })).toEqual({ lp_menu_tema: 7, lp_ia_copiou: 4 });
    expect(calcularUso(funil, { origem: 'google', aparelho: 'todos' })).toEqual({ lp_menu_tema: 5, lp_ia_copiou: 4 });
    expect(calcularUso(funil, { origem: 'todas', aparelho: 'celular' })).toEqual({ lp_menu_tema: 5 });
  });
});

describe('taxa', () => {
  it('porcentagem arredondada, sem base devolve null', () => {
    expect(taxa(48, 120)).toBe(40);
    expect(taxa(2, 120)).toBe(2);
    expect(taxa(5, 0)).toBeNull();
  });
});

describe('datas', () => {
  it('periodoUtc: hoje e os n-1 dias anteriores, em UTC', () => {
    const agora = new Date('2026-11-05T02:00:00Z'); // 4/11 23h em Brasília
    expect(periodoUtc(7, agora)).toEqual({ de: '2026-10-30', ate: '2026-11-05' });
    expect(periodoUtc(1, agora)).toEqual({ de: '2026-11-05', ate: '2026-11-05' });
    expect(periodoUtc(30, agora)).toEqual({ de: '2026-10-07', ate: '2026-11-05' });
  });

  it('diaUtc e somarDias', () => {
    expect(diaUtc(new Date('2026-11-05T23:59:59Z'))).toBe('2026-11-05');
    expect(somarDias('2026-11-01', -1)).toBe('2026-10-31');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('CA-2-10: horários em Brasília', () => {
    // A API manda os instantes em milissegundos Unix (número), não ISO.
    expect(formatarHora(Date.UTC(2026, 10, 5, 21, 51, 8))).toBe('18:51');
    expect(formatarHoraComSegundos(Date.UTC(2026, 10, 5, 21, 51, 8))).toBe('18:51:08');
    expect(formatarDiaMes(Date.UTC(2026, 10, 6, 1, 30, 0))).toBe('5/11');
  });

  it('formatarDia mostra o dia UTC por extenso', () => {
    expect(formatarDia('2026-11-05')).toBe('5 de nov. de 2026');
  });
});

describe('maiorEtapa', () => {
  it('a maior etapa alcançada, ou null', () => {
    expect(maiorEtapa([1, 2, 6, 3])).toBe(6);
    expect(maiorEtapa([])).toBeNull();
  });
});
