import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/alertasService', () => ({
  alertasService: { inscrever: vi.fn(), estaInscrito: vi.fn(), remover: vi.fn() },
}));

import { alertasService } from '@/services/alertasService';
import { AlertasDeErro } from './AlertasDeErro';

const ENDPOINT = 'https://push.example/abc';

function criarInscricao() {
  return {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'chave-p256dh', auth: 'chave-auth' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
}

let inscricaoDoNavegador: ReturnType<typeof criarInscricao> | null;
let permissao: NotificationPermission;
let requestPermission: ReturnType<typeof vi.fn>;
let subscribe: ReturnType<typeof vi.fn>;
let register: ReturnType<typeof vi.fn>;

function instalarSuporte() {
  subscribe = vi.fn().mockImplementation(async () => {
    inscricaoDoNavegador = criarInscricao();
    return inscricaoDoNavegador;
  });
  const registro = {
    pushManager: { getSubscription: vi.fn(async () => inscricaoDoNavegador), subscribe },
  };
  register = vi.fn().mockResolvedValue(registro);
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register, ready: Promise.resolve(registro), getRegistration: vi.fn(async () => registro) },
  });
  requestPermission = vi.fn(async () => {
    permissao = 'granted';
    return permissao;
  });
  class FakeNotification {
    static get permission() {
      return permissao;
    }
    static requestPermission = requestPermission;
  }
  vi.stubGlobal('Notification', FakeNotification);
  vi.stubGlobal('PushManager', class {});
}

describe('AlertasDeErro (RF-EM-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inscricaoDoNavegador = null;
    permissao = 'default';
    vi.stubEnv('NEXT_PUBLIC_VAPID_KEY', 'BPrnIujTd0vTHx7WWIuHDJIomg3q8ZBR-ANgWPkWFTb7jOdghW9rF4vBEZ77L-gdvSMFALZOTZR5zP2v6Bz6ZqE');
    vi.mocked(alertasService.estaInscrito).mockResolvedValue(false);
    vi.mocked(alertasService.inscrever).mockResolvedValue(undefined);
    vi.mocked(alertasService.remover).mockResolvedValue(undefined);
    instalarSuporte();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    // @ts-expect-error limpeza do mock de navigator
    delete navigator.serviceWorker;
  });

  it('navegador sem suporte: diz que não funciona aqui e não oferece o botão', async () => {
    // @ts-expect-error simula navegador sem Service Worker
    delete navigator.serviceWorker;
    render(<AlertasDeErro />);
    expect(await screen.findByText(/não funcionam neste navegador/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ativar alertas$/i })).not.toBeInTheDocument();
  });

  it('sem inscrição: mostra "Ativar alertas" e o que eles avisam', async () => {
    render(<AlertasDeErro />);
    expect(await screen.findByRole('button', { name: /ativar alertas$/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /alertas de erro/i })).not.toBeInTheDocument();
    expect(screen.getByText(/erros do sistema e recusas da IA/i)).toBeInTheDocument();
  });

  it('ao clicar: pede permissão, registra o SW, inscreve com a VAPID pública e manda endpoint e keys à API', async () => {
    render(<AlertasDeErro />);
    fireEvent.click(await screen.findByRole('button', { name: /ativar alertas$/i }));

    expect(await screen.findByText(/alertas ativos neste navegador/i)).toBeInTheDocument();
    expect(requestPermission).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    const opcoes = subscribe.mock.calls[0][0];
    expect(opcoes.userVisibleOnly).toBe(true);
    expect(opcoes.applicationServerKey).toBeInstanceOf(Uint8Array);
    expect(alertasService.inscrever).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      keys: { p256dh: 'chave-p256dh', auth: 'chave-auth' },
    });
    expect(screen.getByRole('button', { name: /desativar/i })).toBeEnabled();
  });

  it('ao abrir com o endpoint já inscrito na API: mostra "Alertas ativos" e "Desativar"', async () => {
    permissao = 'granted';
    inscricaoDoNavegador = criarInscricao();
    vi.mocked(alertasService.estaInscrito).mockResolvedValue(true);
    render(<AlertasDeErro />);
    expect(await screen.findByText(/alertas ativos neste navegador/i)).toBeInTheDocument();
    expect(alertasService.estaInscrito).toHaveBeenCalledWith(ENDPOINT);
  });

  it('permissão concedida mas endpoint desconhecido pela API: continua oferecendo ativar', async () => {
    permissao = 'granted';
    inscricaoDoNavegador = criarInscricao();
    vi.mocked(alertasService.estaInscrito).mockResolvedValue(false);
    render(<AlertasDeErro />);
    expect(await screen.findByRole('button', { name: /ativar alertas$/i })).toBeInTheDocument();
  });

  it('Desativar: DELETE na API com o endpoint e unsubscribe no navegador', async () => {
    permissao = 'granted';
    const inscricao = criarInscricao();
    inscricaoDoNavegador = inscricao;
    vi.mocked(alertasService.estaInscrito).mockResolvedValue(true);
    render(<AlertasDeErro />);
    fireEvent.click(await screen.findByRole('button', { name: /desativar/i }));

    expect(await screen.findByRole('button', { name: /ativar alertas$/i })).toBeInTheDocument();
    expect(alertasService.remover).toHaveBeenCalledWith(ENDPOINT);
    expect(inscricao.unsubscribe).toHaveBeenCalled();
  });

  it('permissão negada ao clicar: explica como liberar nas configurações do navegador e não inscreve', async () => {
    requestPermission.mockImplementation(async () => {
      permissao = 'denied';
      return permissao;
    });
    render(<AlertasDeErro />);
    fireEvent.click(await screen.findByRole('button', { name: /ativar alertas$/i }));

    expect(await screen.findByText(/configurações do navegador/i)).toBeInTheDocument();
    expect(subscribe).not.toHaveBeenCalled();
    expect(alertasService.inscrever).not.toHaveBeenCalled();
  });

  it('permissão já negada ao abrir: mostra a explicação sem botão de ativar', async () => {
    permissao = 'denied';
    render(<AlertasDeErro />);
    expect(await screen.findByText(/configurações do navegador/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ativar alertas$/i })).not.toBeInTheDocument();
  });

  it('falha ao gravar a inscrição na API: avisa o operador e desfaz a inscrição do navegador', async () => {
    vi.mocked(alertasService.inscrever).mockRejectedValue(new Error('API fora do ar'));
    render(<AlertasDeErro />);
    fireEvent.click(await screen.findByRole('button', { name: /ativar alertas$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível ativar/i);
    expect(inscricaoDoNavegador?.unsubscribe).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /ativar alertas$/i })).toBeEnabled();
    expect(screen.queryByText(/alertas ativos neste navegador/i)).not.toBeInTheDocument();
  });

  it('falha ao desativar: avisa e mantém o estado ativo', async () => {
    permissao = 'granted';
    inscricaoDoNavegador = criarInscricao();
    vi.mocked(alertasService.estaInscrito).mockResolvedValue(true);
    vi.mocked(alertasService.remover).mockRejectedValue(new Error('boom'));
    render(<AlertasDeErro />);
    fireEvent.click(await screen.findByRole('button', { name: /desativar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível desativar/i);
    expect(screen.getByText(/alertas ativos neste navegador/i)).toBeInTheDocument();
  });

  it('sem NEXT_PUBLIC_VAPID_KEY: mostra erro e não tenta inscrever', async () => {
    vi.stubEnv('NEXT_PUBLIC_VAPID_KEY', '');
    render(<AlertasDeErro />);
    fireEvent.click(await screen.findByRole('button', { name: /ativar alertas$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/chave de notificação/i);
    expect(subscribe).not.toHaveBeenCalled();
  });
});
