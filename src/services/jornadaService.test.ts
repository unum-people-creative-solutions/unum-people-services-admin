import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { jornadaService } from './jornadaService';

vi.mock('@/lib/cognito', () => ({ userPool: {} }));

// jornada-do-visitante spec-2-painel RF-2-01..03: rotas e parâmetros.
describe('jornadaService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('funil lê GET /admin/dashboard/jornada/funil com de e ate', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ etapas: [], uso: [], pagou: [] });
    await jornadaService.funil('2026-10-30', '2026-11-05');
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/funil?de=2026-10-30&ate=2026-11-05');
  });

  it('visitas lê GET /admin/dashboard/jornada/visitas com dia e teste=0', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue([]);
    await jornadaService.visitas('2026-11-05', false);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/visitas?dia=2026-11-05&teste=0');
  });

  it('visitas com teste pede teste=1', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue([]);
    await jornadaService.visitas('2026-11-05', true);
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/visitas?dia=2026-11-05&teste=1');
  });

  it('visitante lê GET /admin/dashboard/jornada/visitantes/{id}', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({});
    await jornadaService.visitante('5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6');
    expect(get).toHaveBeenCalledWith('/admin/dashboard/jornada/visitantes/5b1f8a3c-2d4e-4f6a-8b9c-0d1e2f2da0b6');
  });
});
