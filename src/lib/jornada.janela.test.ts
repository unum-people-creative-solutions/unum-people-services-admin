import { describe, expect, it } from 'vitest';
import type { EventoJornada, FunilJornada } from '@/types/jornada';
import { ROTULOS_CLIQUE_CONFIGURADOR, calcularJanela, rotuloDoEvento, usouOEditor } from './jornada';

// medicao-de-mercado M4 (RF-MM-47, RF-MM-2b, RF-MM-48; T36, T37): o campo a campo da janela.

const ev = (nome: string, extra: Partial<EventoJornada> = {}): EventoJornada => ({
  em: 1, nome, caminho: '/configurar/editar', visita: 'v', ...extra,
});

describe('rótulos do campo a campo da janela (T36)', () => {
  it('"Ficou N s no campo <Nome> e saiu preenchido|vazio" para os seis nomes', () => {
    expect(rotuloDoEvento(ev('lp_campo_janela_nome_preenchido', { segundos: 12 }))).toBe(
      'Ficou 12 s no campo Nome do negócio e saiu preenchido',
    );
    expect(rotuloDoEvento(ev('lp_campo_janela_nome_vazio', { segundos: 3 }))).toBe(
      'Ficou 3 s no campo Nome do negócio e saiu vazio',
    );
    expect(rotuloDoEvento(ev('lp_campo_janela_descricao_preenchido', { segundos: 75 }))).toBe(
      'Ficou 1 min 15 s no campo O que o negócio faz e saiu preenchido',
    );
    expect(rotuloDoEvento(ev('lp_campo_janela_descricao_vazio', { segundos: 8 }))).toBe(
      'Ficou 8 s no campo O que o negócio faz e saiu vazio',
    );
    expect(rotuloDoEvento(ev('lp_campo_janela_cidade_preenchido', { segundos: 2 }))).toBe(
      'Ficou 2 s no campo Cidade e saiu preenchido',
    );
    expect(rotuloDoEvento(ev('lp_campo_janela_cidade_vazio', { segundos: 1 }))).toBe(
      'Ficou 1 s no campo Cidade e saiu vazio',
    );
  });

  it('sem segundos, null (nome cru), como os outros campos', () => {
    expect(rotuloDoEvento(ev('lp_campo_janela_nome_vazio'))).toBeNull();
    expect(rotuloDoEvento(ev('lp_campo_janela_cidade_preenchido'))).toBeNull();
  });

  it('campo ou estado desconhecido não ganha rótulo', () => {
    expect(rotuloDoEvento(ev('lp_campo_janela_telefone_vazio', { segundos: 3 }))).toBeNull();
    expect(rotuloDoEvento(ev('lp_campo_janela_nome_talvez', { segundos: 3 }))).toBeNull();
  });

  it('o clique no exemplo', () => {
    expect(ROTULOS_CLIQUE_CONFIGURADOR.janela_exemplo).toBe('Clicou em "Usar este exemplo"');
    expect(rotuloDoEvento(ev('lp_clique_janela_exemplo'))).toBe('Clicou em "Usar este exemplo"');
  });
});

describe('usouOEditor ignora os usos da janela (RF-MM-2b)', () => {
  it('só com o campo a campo e o clique do exemplo, não acende', () => {
    expect(usouOEditor(['lp_campo_janela_nome_preenchido', 'lp_campo_janela_cidade_vazio', 'lp_clique_janela_exemplo'])).toBe(
      false,
    );
    expect(usouOEditor(['lp_campo_janela_nome_preenchido', 'lp_menu_ia'])).toBe(true);
  });
});

describe('calcularJanela (RF-MM-48, T37)', () => {
  const funil: FunilJornada = {
    etapas: [
      { etapa: 10, aparelho: 'celular', origem: 'google_ads', visitas: 8 },
      { etapa: 10, aparelho: 'computador', origem: 'direto', visitas: 2 },
      { etapa: 11, aparelho: 'celular', origem: 'google_ads', visitas: 5 },
      { etapa: 11, aparelho: 'computador', origem: 'direto', visitas: 1 },
      { etapa: 1, aparelho: 'celular', origem: 'google_ads', visitas: 40 },
    ],
    uso: [
      { evento: 'lp_campo_janela_nome_preenchido', aparelho: 'celular', origem: 'google_ads', visitas: 4 },
      { evento: 'lp_campo_janela_nome_preenchido', aparelho: 'computador', origem: 'direto', visitas: 1 },
      { evento: 'lp_campo_janela_nome_vazio', aparelho: 'celular', origem: 'google_ads', visitas: 2 },
      { evento: 'lp_campo_janela_descricao_vazio', aparelho: 'celular', origem: 'google_ads', visitas: 6 },
      { evento: 'lp_campo_janela_cidade_preenchido', aparelho: 'computador', origem: 'direto', visitas: 1 },
      { evento: 'lp_clique_janela_exemplo', aparelho: 'celular', origem: 'google_ads', visitas: 3 },
      { evento: 'lp_menu_ia', aparelho: 'celular', origem: 'google_ads', visitas: 9 },
    ],
    pagou: [],
    leitura: [],
  };

  it('soma por campo e estado, a base (etapa 10), os envios (etapa 11) e o exemplo', () => {
    expect(calcularJanela(funil, { aparelho: 'todos', origem: 'todas' })).toEqual({
      viram: 10,
      enviaram: 6,
      exemplo: 3,
      campos: [
        { campo: 'nome', rotulo: 'Nome do negócio', preenchido: 5, vazio: 2 },
        { campo: 'descricao', rotulo: 'O que o negócio faz', preenchido: 0, vazio: 6 },
        { campo: 'cidade', rotulo: 'Cidade', preenchido: 1, vazio: 0 },
      ],
    });
  });

  it('obedece os filtros de aparelho e origem', () => {
    const j = calcularJanela(funil, { aparelho: 'computador', origem: 'todas' });
    expect(j.viram).toBe(2);
    expect(j.enviaram).toBe(1);
    expect(j.exemplo).toBe(0);
    expect(j.campos.map((c) => [c.campo, c.preenchido, c.vazio])).toEqual([
      ['nome', 1, 0],
      ['descricao', 0, 0],
      ['cidade', 1, 0],
    ]);
  });
});
