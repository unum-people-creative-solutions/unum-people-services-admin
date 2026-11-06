'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jornadaService } from '@/services/jornadaService';
import { FunilVitrine } from '@/components/jornada/FunilVitrine';
import { UsoDoEditor } from '@/components/jornada/UsoDoEditor';
import { PaginasDeEntrada } from '@/components/jornada/PaginasDeEntrada';
import { VisitasDoDia } from '@/components/jornada/VisitasDoDia';
import {
  ROTULOS_ORIGEM,
  calcularFunil,
  calcularLeitura,
  calcularUso,
  diaUtc,
  periodoUtc,
  rotuloDoAparelho,
  somarDias,
  type FiltroJornada,
  type GrupoOrigem,
} from '@/lib/jornada';
import type { Aparelho } from '@/types/jornada';

// spec-2-painel RF-2-07; blueprint §3.

const PERIODOS = [
  { dias: 1, rotulo: 'Hoje' },
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
] as const;

type Dias = (typeof PERIODOS)[number]['dias'];

const GRUPOS_ORIGEM = Object.keys(ROTULOS_ORIGEM) as GrupoOrigem[];
const APARELHOS: Aparelho[] = ['celular', 'computador'];

const classeSelect =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function JornadaPage() {
  const [hoje] = useState(() => diaUtc(new Date()));
  const [dias, setDias] = useState<Dias>(7);
  const [filtro, setFiltro] = useState<FiltroJornada>({ origem: 'todas', aparelho: 'todos' });
  const [dia, setDia] = useState(hoje);
  const [mostrarTeste, setMostrarTeste] = useState(false);

  const periodo = useMemo(() => periodoUtc(dias, new Date(`${hoje}T12:00:00Z`)), [dias, hoje]);

  const funilQuery = useQuery({
    queryKey: ['jornada-funil', periodo.de, periodo.ate],
    queryFn: () => jornadaService.funil(periodo.de, periodo.ate),
  });

  const visitasQuery = useQuery({
    queryKey: ['jornada-visitas', dia, mostrarTeste],
    queryFn: () => jornadaService.visitas(dia, mostrarTeste),
  });

  // Filtros recalculados na tela, a partir das linhas cruas (sem nova chamada).
  const valores = useMemo(
    () => (funilQuery.data ? calcularFunil(funilQuery.data, filtro) : undefined),
    [funilQuery.data, filtro],
  );
  const uso = useMemo(
    () => (funilQuery.data ? calcularUso(funilQuery.data, filtro) : undefined),
    [funilQuery.data, filtro],
  );
  const leitura = useMemo(
    () => (funilQuery.data ? calcularLeitura(funilQuery.data, filtro) : undefined),
    [funilQuery.data, filtro],
  );

  // Período e filtros no título das seções que os obedecem (blueprint §3.2; leitura §7.1).
  const comFiltros = (nome: string) =>
    [
      nome,
      PERIODOS.find((p) => p.dias === dias)?.rotulo,
      filtro.origem !== 'todas' ? ROTULOS_ORIGEM[filtro.origem] : null,
      filtro.aparelho !== 'todos' ? rotuloDoAparelho(filtro.aparelho) : null,
    ]
      .filter(Boolean)
      .join(' · ');

  const funilCarregando = funilQuery.isPending || (funilQuery.isError && funilQuery.isFetching);
  const visitasCarregando = visitasQuery.isPending || (visitasQuery.isError && visitasQuery.isFetching);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">Jornada do visitante</h1>
          <p className="text-slate-500">
            De onde vêm, onde param e o que usam no configurador. Visitas de teste ficam fora dos números.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-sm font-medium text-slate-600">
              Período:
            </span>
            <div role="group" aria-label="Período" className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {PERIODOS.map((p) => (
                <button
                  key={p.dias}
                  type="button"
                  aria-pressed={dias === p.dias}
                  onClick={() => setDias(p.dias)}
                  className={
                    dias === p.dias
                      ? 'px-3 py-1.5 rounded-md text-sm font-medium bg-white text-primary-700 shadow-sm'
                      : 'px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900'
                  }
                >
                  {p.rotulo}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
            Origem
            <select
              className={classeSelect}
              value={filtro.origem}
              onChange={(e) => setFiltro((f) => ({ ...f, origem: e.target.value as FiltroJornada['origem'] }))}
            >
              <option value="todas">Todas</option>
              {GRUPOS_ORIGEM.map((g) => (
                <option key={g} value={g}>
                  {ROTULOS_ORIGEM[g]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
            Aparelho
            <select
              className={classeSelect}
              value={filtro.aparelho}
              onChange={(e) => setFiltro((f) => ({ ...f, aparelho: e.target.value as FiltroJornada['aparelho'] }))}
            >
              <option value="todos">Todos</option>
              {APARELHOS.map((a) => (
                <option key={a} value={a}>
                  {rotuloDoAparelho(a)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <FunilVitrine
          idTitulo="titulo-funil-jornada"
          titulo={comFiltros('Funil')}
          valores={valores}
          carregando={funilCarregando}
          erro={funilQuery.isError}
          onTentar={() => void funilQuery.refetch()}
          textoVazio="Nenhuma visita registrada no período."
          comAnterior
        />

        <UsoDoEditor
          uso={uso}
          carregando={funilCarregando}
          erro={funilQuery.isError}
          onTentar={() => void funilQuery.refetch()}
        />

        <PaginasDeEntrada
          titulo={comFiltros('Páginas de entrada')}
          leitura={leitura}
          carregando={funilCarregando}
          erro={funilQuery.isError}
          onTentar={() => void funilQuery.refetch()}
        />

        <VisitasDoDia
          dia={dia}
          hoje={hoje}
          visitas={visitasQuery.data}
          carregando={visitasCarregando}
          erro={visitasQuery.isError}
          onTentar={() => void visitasQuery.refetch()}
          onDiaAnterior={() => setDia((d) => somarDias(d, -1))}
          onProximoDia={() => setDia((d) => (d < hoje ? somarDias(d, 1) : d))}
          mostrarTeste={mostrarTeste}
          onMostrarTeste={setMostrarTeste}
        />
      </div>
    </div>
  );
}
