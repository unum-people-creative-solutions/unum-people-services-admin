import { Fragment, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { jornadaService } from '@/services/jornadaService';
import {
  formatarDuracao,
  formatarHora,
  resumirVisita,
  rotuloDaRota,
  type PaginaDaVisita,
  type ResumoDaVisita as Resumo,
} from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

export function caminhoDoVisitante(visitante: string): string {
  return `/dashboard/jornada/${encodeURIComponent(visitante)}`;
}

const TEMPO_AUSENTE = 'Tempo medido a partir da publicação desta fase';

function rotuloDaRolagem(rolagem: NonNullable<PaginaDaVisita['rolagem']>): string {
  return rolagem === 100 ? 'o fim' : `${rolagem}%`;
}

// spec-4-detalhe RF-4-25 (tela): cabeçalho com o caminho e uma linha por página.
// Também usado em cada visita da página do visitante (RF-4-27).
export function ResumoDaVisita({ resumo }: { resumo: Resumo }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="font-medium text-slate-900">
        {`${formatarHora(resumo.inicio)}–${formatarHora(resumo.fim)} · ${formatarDuracao(Math.floor(resumo.duracaoMs / 1000))} · `}
        {resumo.paginas.map((p, i) => (
          <Fragment key={p.caminho}>
            {i > 0 ? ' → ' : ''}
            {rotuloDaRota(p.caminho)}
            {p.caminho === resumo.ultimaPagina ? ' (saiu aqui)' : ''}
          </Fragment>
        ))}
      </p>
      <ul aria-label="Páginas da visita" className="flex flex-col gap-2">
        {resumo.paginas.map((p) => (
          <li key={p.caminho} className="flex flex-col gap-0.5">
            <p className="text-slate-700">
              <span className="font-medium text-slate-900">{rotuloDaRota(p.caminho)}</span>
              {p.passagens > 1 ? ` (${p.passagens} passagens)` : ''}{' '}
              {p.segundos !== null ? (
                <span className="tabular-nums">{formatarDuracao(p.segundos)}</span>
              ) : (
                <span title={TEMPO_AUSENTE}>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">{TEMPO_AUSENTE}</span>
                </span>
              )}
              {p.rolagem !== null ? ` · rolou até ${rotuloDaRolagem(p.rolagem)}` : ''}
            </p>
            {p.secoes.length > 0 ? <p className="pl-4 text-slate-600">{`Viu: ${p.secoes.join(', ')}`}</p> : null}
            {p.acoes.length > 0 ? (
              <p className="pl-4 text-slate-600">
                {p.acoes.map((a, i) => (
                  <Fragment key={i}>
                    {i > 0 ? ' · ' : ''}
                    <span>{a.vezes > 1 ? `${a.rotulo} ×${a.vezes}` : a.rotulo}</span>
                  </Fragment>
                ))}
              </p>
            ) : null}
            {p.erros.length > 0 ? <p className="pl-4 text-amber-800">{`Erro: ${p.erros.join(', ')}`}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// spec-4-detalhe RF-4-24: conteúdo da linha aberta. Cache por visitante; o Atualizar invalida.
export function DetalheDaVisita({ visitante, visita }: { visitante: string; visita: string }) {
  const consulta = useQuery({
    queryKey: ['jornada-visitante', visitante],
    queryFn: () => jornadaService.visitante(visitante),
    staleTime: Infinity,
  });

  const resumo = useMemo(
    () => (consulta.data ? resumirVisita(consulta.data.eventos, visita) : null),
    [consulta.data, visita],
  );

  const carregando = consulta.isPending || (consulta.isError && consulta.isFetching);

  return (
    <div role="group" aria-label="Resumo da visita" aria-busy={carregando} className="flex flex-col gap-3">
      {carregando ? (
        <EsqueletoDaSecao linhas={3} />
      ) : consulta.isError ? (
        <ErroDaSecao mensagem="Não foi possível carregar esta visita." onTentar={() => void consulta.refetch()} />
      ) : (
        <>
          {resumo ? (
            <ResumoDaVisita resumo={resumo} />
          ) : (
            <p className="text-sm text-slate-500">Nenhum evento registrado nesta visita.</p>
          )}
          <Link
            href={caminhoDoVisitante(visitante)}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
          >
            Ver todas as visitas deste visitante
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </>
      )}
    </div>
  );
}
