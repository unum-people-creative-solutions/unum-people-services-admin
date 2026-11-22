'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { alertasService } from '@/services/alertasService';

// Push de alertas de ERRO só no navegador (RF-EM-20/21): sem manifest nem
// instalação. A chave pública VAPID vem de NEXT_PUBLIC_VAPID_KEY, a mesma do CRM.
type Estado = 'carregando' | 'sem-suporte' | 'negada' | 'inativo' | 'ativo';

function base64ParaUint8Array(base64Url: string): Uint8Array {
  const preenchimento = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + preenchimento).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = window.atob(base64);
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

function temSuporte(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function AlertasDeErro() {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const verificar = useCallback(async () => {
    if (!temSuporte()) {
      setEstado('sem-suporte');
      return;
    }
    if (Notification.permission === 'denied') {
      setEstado('negada');
      return;
    }
    if (Notification.permission !== 'granted') {
      setEstado('inativo');
      return;
    }
    try {
      const registro = await navigator.serviceWorker.getRegistration();
      const inscricao = await registro?.pushManager.getSubscription();
      if (!inscricao) {
        setEstado('inativo');
        return;
      }
      setEstado((await alertasService.estaInscrito(inscricao.endpoint)) ? 'ativo' : 'inativo');
    } catch {
      setEstado('inativo');
      setErro('Não foi possível consultar o estado dos alertas. Tente recarregar a página.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial vem do navegador, só existe no cliente
    void verificar();
  }, [verificar]);

  const ativar = async () => {
    setErro(null);
    setOcupado(true);
    let inscricao: PushSubscription | undefined;
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapid) throw new Error('chave');

      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'negada' : 'inativo');
        return;
      }

      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const registro = await navigator.serviceWorker.ready;
      inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ParaUint8Array(vapid) as BufferSource,
      });
      const json = inscricao.toJSON();
      await alertasService.inscrever({
        endpoint: inscricao.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
      });
      setEstado('ativo');
    } catch (e) {
      // Sem a inscrição gravada na API o aviso nunca chegaria: desfaz a do navegador.
      await inscricao?.unsubscribe().catch(() => undefined);
      setErro(
        e instanceof Error && e.message === 'chave'
          ? 'Não foi possível ativar os alertas: a chave de notificação não está configurada neste ambiente.'
          : 'Não foi possível ativar os alertas de erro. Tente de novo em instantes.',
      );
    } finally {
      setOcupado(false);
    }
  };

  const desativar = async () => {
    setErro(null);
    setOcupado(true);
    try {
      const registro = await navigator.serviceWorker.getRegistration();
      const inscricao = await registro?.pushManager.getSubscription();
      if (inscricao) {
        await alertasService.remover(inscricao.endpoint);
        await inscricao.unsubscribe();
      }
      setEstado('inativo');
    } catch {
      setErro('Não foi possível desativar os alertas de erro. Tente de novo em instantes.');
    } finally {
      setOcupado(false);
    }
  };

  if (estado === 'carregando') return null;

  return (
    <div className="flex flex-col items-end gap-1 text-sm">
      {estado === 'sem-suporte' && (
        <p className="flex items-center gap-2 text-slate-500">
          <BellOff size={16} /> Alertas de erro não funcionam neste navegador.
        </p>
      )}
      {estado === 'negada' && (
        <p className="flex max-w-sm items-start gap-2 text-slate-600">
          <BellOff size={16} className="mt-0.5 shrink-0" />
          As notificações estão bloqueadas. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço, em Notificações) e recarregue a página.
        </p>
      )}
      {estado === 'inativo' && (
        <button
          type="button"
          onClick={ativar}
          disabled={ocupado}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Bell size={18} />
          {ocupado ? 'Ativando...' : 'Ativar alertas de erro'}
        </button>
      )}
      {estado === 'ativo' && (
        <div className="flex items-center gap-3">
          <p className="flex items-center gap-2 text-emerald-700">
            <Bell size={16} /> Alertas ativos neste navegador
          </p>
          <button
            type="button"
            onClick={desativar}
            disabled={ocupado}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {ocupado ? 'Desativando...' : 'Desativar'}
          </button>
        </div>
      )}
      {erro && (
        <p role="alert" className="text-red-600">
          {erro}
        </p>
      )}
    </div>
  );
}
