import type { ReactNode } from 'react';
import { ROTULOS_ETAPAS, taxa } from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface FunilVitrineProps {
  idTitulo: string;
  titulo: ReactNode;
  // Os 9 valores na ordem de ROTULOS_ETAPAS; undefined enquanto carrega ou no erro.
  valores: number[] | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
  textoVazio: string;
  // Na página da jornada, cada etapa mostra também a taxa sobre a anterior (blueprint §3.2).
  comAnterior?: boolean;
  acao?: ReactNode;
}

// Funil da vitrine (blueprint §2): barras proporcionais a "Visitou", sem biblioteca de gráfico.
export function FunilVitrine({
  idTitulo,
  titulo,
  valores,
  carregando,
  erro,
  onTentar,
  textoVazio,
  comAnterior = false,
  acao,
}: FunilVitrineProps) {
  const vazio = valores !== undefined && valores.every((v) => v === 0);
  const visitou = valores?.[0] ?? 0;
  // Sem "Visitou" no período, as barras usam o maior valor como escala.
  const escala = visitou > 0 ? visitou : Math.max(0, ...(valores ?? []));

  return (
    <section
      aria-labelledby={idTitulo}
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2 bg-slate-50/50">
        <h2 id={idTitulo} className="font-bold text-slate-900">
          {titulo}
        </h2>
        {acao}
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={9} />
        ) : erro || valores === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : vazio ? (
          <p className="py-6 text-center text-sm text-slate-500">{textoVazio}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {ROTULOS_ETAPAS.map((rotulo, i) => {
              const valor = valores[i];
              const sobreVisitou = i === 0 ? null : taxa(valor, visitou);
              const sobreAnterior = i === 0 ? null : taxa(valor, valores[i - 1]);
              const largura = escala > 0 ? Math.min(100, (valor / escala) * 100) : 0;
              return (
                <li key={rotulo} className="grid grid-cols-[minmax(9rem,12rem)_1fr_3.5rem_auto] items-center gap-3 text-sm">
                  <span className="text-slate-700">{rotulo}</span>
                  <span aria-hidden="true" className="block h-3 rounded-full bg-primary-50 overflow-hidden">
                    <span className="block h-full rounded-full bg-primary-500" style={{ width: `${largura}%` }} />
                  </span>
                  <span className="text-right font-semibold text-slate-900 tabular-nums">{valor}</span>
                  <span className={`text-right tabular-nums text-slate-500 ${comAnterior ? 'min-w-[11rem]' : 'min-w-[3rem]'}`}>
                    {sobreVisitou !== null ? `${sobreVisitou}%` : null}
                    {comAnterior && sobreAnterior !== null ? ` · ${sobreAnterior}% da anterior` : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
