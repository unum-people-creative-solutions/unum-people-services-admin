'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { tenantService } from '@/services/tenantService';
import type { SitePrevia } from '@/types/tenant';

// Protocolo do /visor-operador do lp-builder (RF-AP-54 e RF-AP-62).
const TIPO_PRONTO = 'lp-visor-operador-pronto';
const TIPO_CONFIG = 'lp-visor-operador';

const LARGURAS = { celular: 390, computador: 1280 } as const;
type Aparelho = keyof typeof LARGURAS;
type Versao = 'publicada' | 'rascunho';

const ALTURA_DO_VISOR = 720;

// Mesma variável de ModoTesteSecao.tsx.
function visorDoLpBuilder(): { src: string; origem: string } {
  const base = process.env.NEXT_PUBLIC_CONFIGURADOR_URL || 'https://unumpeople.app';
  return {
    src: base.replace(/\/+$/, '') + '/visor-operador',
    origem: new URL(base).origin,
  };
}

interface SitePreviaDialogProps {
  tenantId: string;
  siteId: string | null;
  // Status da linha da tabela; vale até a resposta da API trazer o oficial.
  status: string;
  onClose: () => void;
}

export function SitePreviaDialog({ tenantId, siteId, status, onClose }: SitePreviaDialogProps) {
  const { data } = useQuery<SitePrevia>({
    queryKey: ['tenant-site-previa', tenantId, siteId],
    queryFn: () => tenantService.getSitePrevia(tenantId, siteId as string),
    enabled: !!siteId,
    retry: false,
    gcTime: 0,
  });

  return (
    <Dialog.Root open={!!siteId} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[90]" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-[100] w-full max-w-5xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] bg-white rounded-2xl shadow-lg flex flex-col outline-none"
          aria-describedby={undefined}
        >
          <CorpoDaPrevia data={data} status={status} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CorpoDaPrevia({ data, status }: { data: SitePrevia | undefined; status: string }) {
  const [aparelho, setAparelho] = useState<Aparelho>('celular');
  const [versao, setVersao] = useState<Versao>('publicada');
  const [pronto, setPronto] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const visor = visorDoLpBuilder();

  const statusEfetivo = data?.status ?? status;
  const titulo =
    'Prévia da página · só a equipe Unum vê' +
    (statusEfetivo === 'aguardando_ativacao' ? ' · ainda não está no ar' : '');

  const aoReceber = useCallback(
    (evento: MessageEvent) => {
      if (evento.origin !== visor.origem) return;
      const dado = evento.data as { tipo?: unknown } | null;
      if (!dado || typeof dado !== 'object' || dado.tipo !== TIPO_PRONTO) return;
      setPronto(true);
    },
    [visor.origem]
  );

  useEffect(() => {
    window.addEventListener('message', aoReceber);
    return () => window.removeEventListener('message', aoReceber);
  }, [aoReceber]);

  const temRascunho = !!data?.rascunho;
  const config = data ? (versao === 'rascunho' && data.rascunho ? data.rascunho : data.publicada) : null;

  useEffect(() => {
    if (!pronto || !config) return;
    iframeRef.current?.contentWindow?.postMessage({ tipo: TIPO_CONFIG, config }, visor.origem);
  }, [pronto, config, visor.origem]);

  return (
    <>
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
        <Dialog.Title className="font-bold text-slate-900">{titulo}</Dialog.Title>
        <Dialog.Close asChild>
          <button type="button" aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </Dialog.Close>
      </div>

      <div className="px-6 py-3 flex flex-wrap gap-4 border-b border-slate-100">
        <div className="flex gap-2">
          {(['celular', 'computador'] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={aparelho === a}
              onClick={() => setAparelho(a)}
              className={`px-3 py-1 rounded-lg text-sm border ${aparelho === a ? 'bg-primary-600 text-white border-primary-600' : 'text-slate-600 border-slate-200'}`}
            >
              {a === 'celular' ? 'Celular' : 'Computador'}
            </button>
          ))}
        </div>
        {temRascunho && (
          <div className="flex gap-2">
            {(['publicada', 'rascunho'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={versao === v}
                onClick={() => setVersao(v)}
                className={`px-3 py-1 rounded-lg text-sm border ${versao === v ? 'bg-primary-600 text-white border-primary-600' : 'text-slate-600 border-slate-200'}`}
              >
                {v === 'publicada' ? 'Publicada' : 'Rascunho'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 overflow-auto bg-slate-100 flex justify-center">
        <iframe
          ref={iframeRef}
          title="Visor da prévia"
          src={visor.src}
          width={LARGURAS[aparelho]}
          height={ALTURA_DO_VISOR}
          className="bg-white border border-slate-200 shrink-0"
        />
      </div>
    </>
  );
}
