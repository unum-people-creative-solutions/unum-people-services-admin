import { Fragment, useState } from 'react';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { VisitaJornada } from '@/types/jornada';
import {
  ROTULOS_ETAPAS,
  formatarDiaMes,
  formatarHora,
  maiorEtapa,
  rotuloDaOrigem,
  rotuloDoAparelho,
} from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';
import { SeloPagamento, SeloTeste, SeloUsouEditor } from './Selos';
import { EmpresaContratante } from './EmpresaContratante';
import { DetalheDaVisita, caminhoDoVisitante } from './DetalheDaVisita';

const POR_PAGINA = 100;
const COLUNAS = 6;

interface VisitasDoPeriodoProps {
  rotuloPeriodo: string;
  // Períodos acima de 24 horas mostram a data junto da hora.
  comData: boolean;
  visitas: VisitaJornada[] | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
  mostrarTeste: boolean;
  onMostrarTeste: (valor: boolean) => void;
}

// Visitas do período (blueprint §3.4; spec-4-detalhe RF-4-23 e RF-4-24).
export function VisitasDoPeriodo({
  rotuloPeriodo,
  comData,
  visitas,
  carregando,
  erro,
  onTentar,
  mostrarTeste,
  onMostrarTeste,
}: VisitasDoPeriodoProps) {
  // Várias linhas podem ficar abertas: um conjunto por visita (L-045).
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(() => new Set());
  const [limite, setLimite] = useState(POR_PAGINA);

  function alternar(visita: string) {
    setAbertas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(visita)) proximo.delete(visita);
      else proximo.add(visita);
      return proximo;
    });
  }

  // O clique na linha faz o mesmo que o botão; links e o próprio botão seguem o seu caminho.
  function clicarLinha(evento: MouseEvent<HTMLTableRowElement>, visita: string) {
    if ((evento.target as HTMLElement).closest('a, button')) return;
    alternar(visita);
  }

  return (
    <section
      aria-labelledby="titulo-visitas"
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 id="titulo-visitas" className="font-bold text-slate-900">
          {`Visitas · ${rotuloPeriodo}`}
        </h2>
        <label className="flex items-center gap-2 text-sm text-slate-600 sm:ml-auto">
          <input
            type="checkbox"
            checked={mostrarTeste}
            onChange={(e) => onMostrarTeste(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600"
          />
          Mostrar visitas de teste
        </label>
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={4} />
        ) : erro || visitas === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : visitas.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhuma visita neste período.</p>
        ) : (
          <>
            {/* contain: inline-size: a largura da tabela não empurra o <main> do layout (flex-1 sem min-w-0);
                assim o overflow-x-auto rola só a tabela no celular. */}
            <div className="overflow-x-auto [contain:inline-size]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th scope="col" className="px-3 py-2">Hora</th>
                    <th scope="col" className="px-3 py-2">Aparelho</th>
                    <th scope="col" className="px-3 py-2">Origem</th>
                    <th scope="col" className="px-3 py-2 text-right">Páginas</th>
                    <th scope="col" className="px-3 py-2">Até onde foi</th>
                    <th scope="col" className="px-3 py-2">Contratou</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visitas.slice(0, limite).map((v) => {
                    const etapa = maiorEtapa(v.etapas);
                    const aberta = abertas.has(v.visita);
                    const hora = formatarHora(v.inicio);
                    const idArea = `visita-aberta-${v.visita}`;
                    return (
                      <Fragment key={v.visita}>
                        <tr
                          onClick={(e) => clicarLinha(e, v.visita)}
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-expanded={aberta}
                                aria-controls={idArea}
                                aria-label={`${aberta ? 'Fechar' : 'Abrir'} a visita das ${hora}`}
                                onClick={() => alternar(v.visita)}
                                className="-ml-1 p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                {aberta ? (
                                  <ChevronDown size={16} aria-hidden="true" />
                                ) : (
                                  <ChevronRight size={16} aria-hidden="true" />
                                )}
                              </button>
                              <Link
                                href={caminhoDoVisitante(v.visitante)}
                                className="font-medium text-primary-700 tabular-nums hover:underline"
                              >
                                {comData ? `${formatarDiaMes(v.inicio)} ${hora}` : hora}
                              </Link>
                              {v.teste ? <SeloTeste /> : null}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{rotuloDoAparelho(v.aparelho)}</td>
                          <td className="px-3 py-2.5 text-slate-700" title={v.campanha}>
                            {rotuloDaOrigem(v.origem)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">{v.paginas}</td>
                          <td className="px-3 py-2.5 text-slate-700">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{etapa !== null ? ROTULOS_ETAPAS[etapa - 1] : '—'}</span>
                              {v.usos.length > 0 ? <SeloUsouEditor /> : null}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            {v.contratacao ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <EmpresaContratante
                                  tenantId={v.contratacao.tenant_id}
                                  nome={v.contratacao.nome}
                                  className="font-medium text-primary-700 hover:underline"
                                />
                                <SeloPagamento pago={v.contratacao.pago} />
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                        {aberta ? (
                          <tr id={idArea}>
                            <td colSpan={COLUNAS} className="bg-slate-50/60 px-4 py-4 whitespace-normal">
                              <DetalheDaVisita visitante={v.visitante} visita={v.visita} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visitas.length > limite ? (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setLimite((l) => l + POR_PAGINA)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mostrar mais 100
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
