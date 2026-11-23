import { describe, expect, it } from 'vitest';
import type { EventoJornada } from '@/types/jornada';
import { trajetoriaDaVisita } from './trajetoria';

// medicao-de-mercado M4 (RF-MM-47, T36): lp_campo_janela_* é medição passiva e de saída: não abre nó, chega
// atrasada e volta ao nó de onde veio.
const T0 = Date.parse('2026-11-23T14:31:00-03:00');
const V = 'visita-1';
const EDITAR = '/configurar/editar';
const PREVIA = '/configurar/preview';

function ev(seg: number, nome: string, caminho: string, extra: Partial<EventoJornada> = {}): EventoJornada {
  return { em: T0 + seg * 1000, nome, caminho, visita: V, ...extra };
}

const CAMPOS = ['lp_campo_janela_nome_preenchido', 'lp_campo_janela_descricao_vazio', 'lp_campo_janela_cidade_vazio'];

describe('trajetoriaDaVisita: campo a campo da janela (RF-MM-47)', () => {
  const base = [
    ev(0, 'lp_page_view', '/'),
    ev(10, 'lp_janela_aberta', EDITAR),
    ev(20, 'lp_clique_previa_botao', PREVIA),
    ev(30, 'lp_janela_aberta', EDITAR),
    ev(40, 'lp_clique_previa_botao', PREVIA),
  ];

  it.each(CAMPOS)('%s em outro caminho não abre nó e volta ao nó mais recente do caminho', (nome) => {
    const t = trajetoriaDaVisita([...base, ev(50, nome, EDITAR, { segundos: 6 })], V)!;
    expect(t.nos.map((n) => n.rotulo)).toEqual([
      'Visitou',
      'Abriu modal de entrada',
      'Prévia',
      'Abriu modal de entrada',
      'Prévia',
    ]);
    expect(t.nos[3].eventos.map((e) => e.nome)).toEqual(['lp_janela_aberta', nome]);
    expect(t.nos[3].eventos[1].tipo).toBe('leitura');
  });

  it('dentro da janela, o campo fica no nó e leva o rótulo com o tempo', () => {
    const t = trajetoriaDaVisita(
      [
        ev(0, 'lp_page_view', '/'),
        ev(10, 'lp_janela_aberta', EDITAR),
        ev(25, 'lp_campo_janela_nome_preenchido', EDITAR, { segundos: 14 }),
        ev(30, 'lp_janela_enviada', EDITAR),
      ],
      V,
    )!;
    const no = t.nos.find((n) => n.eventos.some((e) => e.nome === 'lp_campo_janela_nome_preenchido'))!;
    expect(no.rotulo).toBe('Abriu modal de entrada');
    const campo = no.eventos.find((e) => e.nome === 'lp_campo_janela_nome_preenchido')!;
    expect(campo.rotulo).toBe('Ficou 14 s no campo Nome do negócio e saiu preenchido');
    expect(campo.tipo).toBe('leitura');
  });
});
