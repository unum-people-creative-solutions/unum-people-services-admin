import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buscarCep } from './viaCep';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('buscarCep (ViaCEP)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('retorna null se o CEP tiver menos de 8 dígitos', async () => {
    const res = await buscarCep('12345');
    expect(res).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sanitiza CEP formatado para 8 dígitos e consulta a URL correta', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        logradouro: 'Av. Pref. Erasto Gaertner',
        bairro: 'Bacacheri',
        localidade: 'Curitiba',
        uf: 'PR',
      }),
    });

    const res = await buscarCep('82.515-000');
    expect(mockFetch).toHaveBeenCalledWith('https://viacep.com.br/ws/82515000/json/');
    expect(res).toEqual({
      logradouro: 'Av. Pref. Erasto Gaertner',
      bairro: 'Bacacheri',
      cidade: 'Curitiba',
      uf: 'PR',
    });
  });

  it('retorna null se o fetch retornar status diferente de ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const res = await buscarCep('82515000');
    expect(res).toBeNull();
  });

  it('retorna null se a resposta contiver erro: true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ erro: true }),
    });

    const res = await buscarCep('99999999');
    expect(res).toBeNull();
  });

  it('retorna null se o fetch lançar exceção', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const res = await buscarCep('82515000');
    expect(res).toBeNull();
  });
});
