import { api } from '@/lib/api';

// Inscrições de push de alertas de ERRO da plataforma (RF-EM-13 da feature
// erros-montagem-e-push-admin): rotas da Lambda admin, uma inscrição por
// navegador do operador. O GET e o DELETE levam o endpoint na query string
// (api.delete não tem corpo); a resposta do GET é { subscribed: boolean }.
const ROTA = '/admin/alertas/inscricao';

export interface InscricaoPush {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const alertasService = {
  inscrever: async (inscricao: InscricaoPush): Promise<void> => {
    await api.post(ROTA, inscricao);
  },

  estaInscrito: async (endpoint: string): Promise<boolean> => {
    const resposta = await api.get<{ subscribed: boolean }>(`${ROTA}?endpoint=${encodeURIComponent(endpoint)}`);
    return resposta.subscribed === true;
  },

  remover: async (endpoint: string): Promise<void> => {
    await api.delete(`${ROTA}?endpoint=${encodeURIComponent(endpoint)}`);
  },
};
