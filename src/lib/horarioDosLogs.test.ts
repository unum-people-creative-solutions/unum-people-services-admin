import { describe, expect, it } from 'vitest';
import { formatarHorarioDoLog, instanteDoLog } from './horarioDosLogs';

// O CloudWatch Logs Insights devolve @timestamp em UTC sem fuso (formato real
// lido em 06/11/2026: "2026-11-07 00:44:35.142" = 21:44:35 em Brasília).
// Rode também com TZ=Asia/Tokyo (L-054): o resultado não pode depender do fuso.
describe('horário dos logs', () => {
  it('lê o @timestamp do CloudWatch (sem fuso) como UTC', () => {
    expect(instanteDoLog('2026-11-07 00:44:35.142')).toBe(Date.UTC(2026, 10, 7, 0, 44, 35, 142));
    expect(instanteDoLog('2026-11-07 00:44:35')).toBe(Date.UTC(2026, 10, 7, 0, 44, 35));
  });

  it('respeita o fuso de quem já manda (auditoria em ISO)', () => {
    expect(instanteDoLog('2026-11-07T00:44:35Z')).toBe(Date.UTC(2026, 10, 7, 0, 44, 35));
    expect(instanteDoLog('2026-11-06T21:44:35-03:00')).toBe(Date.UTC(2026, 10, 7, 0, 44, 35));
  });

  it('vazio ou ilegível: null', () => {
    expect(instanteDoLog('')).toBeNull();
    expect(instanteDoLog(undefined)).toBeNull();
    expect(instanteDoLog('ontem')).toBeNull();
  });

  it('mostra sempre no horário de Brasília', () => {
    expect(formatarHorarioDoLog('2026-11-07 00:44:35.142')).toBe('06/11/2026, 21:44:35');
    expect(formatarHorarioDoLog('2026-03-01T12:00:00Z')).toBe('01/03/2026, 09:00:00');
    expect(formatarHorarioDoLog('ontem')).toBe('—');
  });
});
