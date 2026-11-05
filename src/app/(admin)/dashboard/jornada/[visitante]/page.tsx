'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { jornadaService } from '@/services/jornadaService';
import { ApiError } from '@/lib/apiError';
import {
  formatarDiaMes,
  formatarHora,
  formatarHoraComSegundos,
  rotuloDaOrigem,
  rotuloDoAparelho,
  rotuloDoEvento,
} from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from '@/components/jornada/EstadoDaSecao';
import { SeloPagamento, SeloTeste } from '@/components/jornada/Selos';
import { EmpresaContratante } from '@/components/jornada/EmpresaContratante';
import type { EventoJornada, VisitaJornada, VisitanteJornada } from '@/types/jornada';

// spec-2-painel RF-2-08; blueprint §4.

interface GrupoDaVisita {
  visita: string;
  resumo: VisitaJornada | undefined;
  eventos: EventoJornada[];
}

const porData = (a: number, b: number) => a - b;

// Visitas da mais recente para a mais antiga; eventos de cada uma em ordem cronológica.
function agruparPorVisita(dados: VisitanteJornada): GrupoDaVisita[] {
  const grupos = new Map<string, GrupoDaVisita>();
  const resumos = [...dados.visitas].sort((a, b) => porData(b.inicio, a.inicio));
  for (const resumo of resumos) {
    grupos.set(resumo.visita, { visita: resumo.visita, resumo, eventos: [] });
  }
  for (const evento of [...dados.eventos].sort((a, b) => porData(a.em, b.em))) {
    let grupo = grupos.get(evento.visita);
    if (!grupo) {
      // Evento de uma visita cujo resumo não veio: entra no fim, sem cabeçalho de resumo.
      grupo = { visita: evento.visita, resumo: undefined, eventos: [] };
      grupos.set(evento.visita, grupo);
    }
    grupo.eventos.push(evento);
  }
  return [...grupos.values()];
}

function tituloDaVisita(grupo: GrupoDaVisita): string {
  const inicio = grupo.resumo?.inicio ?? grupo.eventos[0]?.em;
  const partes = inicio ? [`Visita de ${formatarDiaMes(inicio)}`, formatarHora(inicio)] : ['Visita'];
  if (grupo.resumo) {
    partes.push(rotuloDoAparelho(grupo.resumo.aparelho), rotuloDaOrigem(grupo.resumo.origem));
  }
  return partes.join(' · ');
}

export default function VisitantePage() {
  const { visitante } = useParams() as { visitante: string };

  const consulta = useQuery({
    queryKey: ['jornada-visitante', visitante],
    queryFn: () => jornadaService.visitante(visitante),
    // 400/404 não melhoram com nova tentativa: o "não encontrado" aparece na hora.
    retry: (tentativas, erro) => !(erro instanceof ApiError && erro.status < 500) && tentativas < 3,
  });

  const grupos = useMemo(() => (consulta.data ? agruparPorVisita(consulta.data) : []), [consulta.data]);
  const naoEncontrado = consulta.error instanceof ApiError && consulta.error.status === 404;
  const carregando = consulta.isPending || (consulta.isError && consulta.isFetching);

  const dados = consulta.data;
  const primeiraVisita = dados?.visitas.map((v) => v.inicio).sort(porData)[0];
  const totalVisitas = dados?.visitas.length ?? 0;

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <Link
          href="/dashboard/jornada"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Jornada
        </Link>

        <section aria-label="Caminho do visitante" aria-busy={carregando} className="flex flex-col gap-6">
          {carregando ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <EsqueletoDaSecao linhas={6} />
            </div>
          ) : naoEncontrado ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-slate-700">
              Visitante não encontrado.
            </div>
          ) : consulta.isError || !dados ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <ErroDaSecao onTentar={() => void consulta.refetch()} />
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-900">
                  Visitante <span className="font-mono">{dados.visitante.slice(-6)}</span>
                </h1>
                <p className="text-slate-500">
                  {[
                    primeiraVisita ? `1ª visita ${formatarDiaMes(primeiraVisita)} ${formatarHora(primeiraVisita)}` : null,
                    `${totalVisitas} ${totalVisitas === 1 ? 'visita' : 'visitas'}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              {dados.contratacoes.length > 0 ? (
                <section
                  aria-labelledby="titulo-contratacao"
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 id="titulo-contratacao" className="font-bold text-slate-900">
                      Contratação
                    </h2>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {dados.contratacoes.map((c) => (
                      <li key={c.tenant_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm">
                        <EmpresaContratante
                          tenantId={c.tenant_id}
                          nome={c.nome}
                          className="font-semibold text-primary-700 hover:underline"
                        />
                        <SeloPagamento pago={c.pago} />
                        <span className="text-xs font-medium text-slate-500">{c.status}</span>
                        <span className="text-slate-600">Plano {c.plano}</span>
                        <span className="text-slate-500 tabular-nums">
                          {`${formatarDiaMes(c.em)} ${formatarHora(c.em)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {grupos.map((grupo) => {
                const idTitulo = `titulo-visita-${grupo.visita}`;
                return (
                  <section
                    key={grupo.visita}
                    aria-labelledby={idTitulo}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2">
                      <h2 id={idTitulo} className="font-semibold text-slate-900">
                        {tituloDaVisita(grupo)}
                      </h2>
                      {grupo.resumo?.teste ? <SeloTeste /> : null}
                    </div>
                    {grupo.eventos.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">Nenhum evento registrado nesta visita.</p>
                    ) : (
                      <ol className="divide-y divide-slate-50">
                        {grupo.eventos.map((evento, i) => {
                          const rotulo = rotuloDoEvento(evento.nome);
                          return (
                            <li
                              key={`${evento.em}-${i}`}
                              className="grid grid-cols-[5rem_minmax(10rem,16rem)_1fr] items-center gap-3 px-4 py-2 text-sm"
                            >
                              <time dateTime={new Date(evento.em).toISOString()} className="text-slate-500 tabular-nums">
                                {formatarHoraComSegundos(evento.em)}
                              </time>
                              {rotulo !== null ? (
                                <span className="text-slate-900">{rotulo}</span>
                              ) : (
                                <span className="font-mono text-slate-700">{evento.nome}</span>
                              )}
                              <span className="font-mono text-xs text-slate-500 truncate">{evento.caminho}</span>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>
                );
              })}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
