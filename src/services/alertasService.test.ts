import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

import { api } from '@/lib/api';
import { alertasService } from './alertasService';

const endpoint = 'https://fcm.googleapis.com/fcm/send/abc?x=1&y=2';

describe('alertasService (RF-EM-13)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inscrever manda POST /admin/alertas/inscricao com endpoint e keys', async () => {
    vi.mocked(api.post).mockResolvedValue(null);
    await alertasService.inscrever({ endpoint, keys: { p256dh: 'p', auth: 'a' } });
    expect(api.post).toHaveBeenCalledWith('/admin/alertas/inscricao', { endpoint, keys: { p256dh: 'p', auth: 'a' } });
  });

  it('estaInscrito consulta GET com o endpoint codificado na query e devolve subscribed', async () => {
    vi.mocked(api.get).mockResolvedValue({ subscribed: true });
    await expect(alertasService.estaInscrito(endpoint)).resolves.toBe(true);
    expect(api.get).toHaveBeenCalledWith(`/admin/alertas/inscricao?endpoint=${encodeURIComponent(endpoint)}`);
  });

  it('remover manda DELETE com o endpoint codificado na query', async () => {
    vi.mocked(api.delete).mockResolvedValue(null);
    await alertasService.remover(endpoint);
    expect(api.delete).toHaveBeenCalledWith(`/admin/alertas/inscricao?endpoint=${encodeURIComponent(endpoint)}`);
  });
});
