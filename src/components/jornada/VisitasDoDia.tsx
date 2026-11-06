import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import type { VisitaJornada } from '@/types/jornada';
import {
  ROTULOS_ETAPAS,
  formatarHora,
  maiorEtapa,
  rotuloDaOrigem,
  rotuloDoAparelho,
} from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';
import { SeloPagamento, SeloTeste, SeloUsouEditor } from './Selos';
import { EmpresaContratante } from './EmpresaContratante';

interface VisitasDoDiaProps {
  visitas: VisitaJornada[] | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
  mostrarTeste: boolean;
  onMostrarTeste: (valor: boolean) => void;
}

export function caminhoDoVisitante(visitante: string): string {
  return `/dashboard/jornada/${encodeURIComponent(visitante)}`;
}

// Visitas do dia (blueprint §3.4).
export function VisitasDoDia({
  visitas,
  carregando,
  erro,
  onTentar,
  mostrarTeste,
  onMostrarTeste,
}: VisitasDoDiaProps) {
  const router = useRouter();

  // A linha inteira é clicável; o link em "Hora" é o alvo acessível.
  function abrirLinha(evento: MouseEvent<HTMLTableRowElement>, visitante: string) {
    if ((evento.target as HTMLElement).closest('a')) return;
    router.push(caminhoDoVisitante(visitante));
  }

  return (
    <section
      aria-labelledby="titulo-visitas"
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 id="titulo-visitas" className="font-bold text-slate-900">
          Visitas
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
          <p className="py-6 text-center text-sm text-slate-500">Nenhuma visita neste dia.</p>
        ) : (
          // contain: inline-size: a largura da tabela não empurra o <main> do layout (flex-1 sem min-w-0);
          // assim o overflow-x-auto rola só a tabela no celular.
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
                {visitas.map((v) => {
                  const etapa = maiorEtapa(v.etapas);
                  return (
                    <tr
                      key={v.visita}
                      onClick={(e) => abrirLinha(e, v.visitante)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={caminhoDoVisitante(v.visitante)}
                            className="font-medium text-primary-700 tabular-nums hover:underline"
                          >
                            {formatarHora(v.inicio)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
