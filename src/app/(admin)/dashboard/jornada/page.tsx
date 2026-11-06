'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { jornadaService } from '@/services/jornadaService';
import { FunilVitrine } from '@/components/jornada/FunilVitrine';
import { UsoDoEditor } from '@/components/jornada/UsoDoEditor';
import { PaginasDeEntrada } from '@/components/jornada/PaginasDeEntrada';
import { VisitasDoPeriodo } from '@/components/jornada/VisitasDoPeriodo';
import {
  PERIODOS,
  ROTULOS_ORIGEM,
  calcularFunil,
  calcularLeitura,
  calcularUso,
  formatarHora,
  janela,
  rotuloDoAparelho,
  type FiltroJornada,
  type GrupoOrigem,
} from '@/lib/jornada';
import type { Aparelho } from '@/types/jornada';

// spec-2-painel RF-2-07; blueprint §3; spec-4-detalhe RF-4-21 e RF-4-22.

const PERIODO_PADRAO = PERIODOS.find((p) => p.rotulo === '7 dias')!;
const UM_DIA_MS = 86_400_000;

const GRUPOS_ORIGEM = Object.keys(ROTULOS_ORIGEM) as GrupoOrigem[];
const APARELHOS: Aparelho[] = ['celular', 'computador'];

const classeSelect =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function JornadaPage() {
  const queryClient = useQueryClient();
  // A janela termina no instante da última troca de período ou do último Atualizar.
  // rodada: o Atualizar busca de novo mesmo quando o relógio não andou.
  const [consulta, setConsulta] = useState(() => ({ periodo: PERIODO_PADRAO, agora: Date.now(), rodada: 0 }));
  const [filtro, setFiltro] = useState<FiltroJornada>({ origem: 'todas', aparelho: 'todos' });
  const [mostrarTeste, setMostrarTeste] = useState(false);

  const { periodo, rodada } = consulta;
  const { desde, ate } = janela(periodo.ms, consulta.agora);

  const funilQuery = useQuery({
    queryKey: ['jornada-funil', desde, ate, rodada],
    queryFn: () => jornadaService.funil(desde, ate),
  });

  // RF-4-19: as de teste vêm sempre; a tela filtra pelo "Mostrar visitas de teste".
  const visitasQuery = useQuery({
    queryKey: ['jornada-visitas', desde, ate, rodada],
    queryFn: () => jornadaService.visitas(desde, ate),
  });

  const visitas = useMemo(
    () => visitasQuery.data?.filter((v) => mostrarTeste || !v.teste),
    [visitasQuery.data, mostrarTeste],
  );

  const atualizando = funilQuery.isFetching || visitasQuery.isFetching;
  const atualizadoEm =
    funilQuery.isSuccess && visitasQuery.isSuccess && !atualizando
      ? Math.max(funilQuery.dataUpdatedAt, visitasQuery.dataUpdatedAt)
      : null;

  function trocarPeriodo(novo: (typeof PERIODOS)[number]) {
    setConsulta((c) => ({ ...c, periodo: novo, agora: Date.now() }));
  }

  function atualizar() {
    setConsulta((c) => ({ ...c, agora: Date.now(), rodada: c.rodada + 1 }));
    // As visitas abertas buscam o visitante de novo (RF-4-22).
    void queryClient.invalidateQueries({ queryKey: ['jornada-visitante'] });
  }

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
      periodo.rotulo,
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
          <div className="flex w-full items-start gap-3">
            <span aria-hidden="true" className="py-2 text-sm font-medium text-slate-600">
              Período:
            </span>
            <div role="group" aria-label="Período" className="flex flex-wrap rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {PERIODOS.map((p) => (
                <button
                  key={p.rotulo}
                  type="button"
                  aria-pressed={periodo === p}
                  onClick={() => trocarPeriodo(p)}
                  className={
                    periodo === p
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
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
            <button
              type="button"
              onClick={atualizar}
              disabled={atualizando}
              aria-busy={atualizando}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={atualizando ? 'animate-spin motion-reduce:animate-none' : undefined}
              />
              Atualizar
            </button>
            <p aria-live="polite" className="text-sm text-slate-500">
              {atualizadoEm !== null ? `Atualizado às ${formatarHora(atualizadoEm)}` : ''}
            </p>
          </div>
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

        <VisitasDoPeriodo
          rotuloPeriodo={periodo.rotulo}
          comData={periodo.ms > UM_DIA_MS}
          visitas={visitas}
          carregando={visitasCarregando}
          erro={visitasQuery.isError}
          onTentar={() => void visitasQuery.refetch()}
          mostrarTeste={mostrarTeste}
          onMostrarTeste={setMostrarTeste}
        />
      </div>
    </div>
  );
}
