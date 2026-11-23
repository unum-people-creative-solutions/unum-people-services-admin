'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { jornadaService } from '@/services/jornadaService';
import { toolsUsoService } from '@/services/toolsUsoService';
import { FunilEmSeries, FunilVitrine, type SeriesDoFunil } from '@/components/jornada/FunilVitrine';
import { UsoDoEditor } from '@/components/jornada/UsoDoEditor';
import { UsoDoTools } from '@/components/jornada/UsoDoTools';
import { MotivosDaReserva } from '@/components/jornada/MotivosDaReserva';
import { JanelaCampoACampo } from '@/components/jornada/JanelaCampoACampo';
import { PaginasDeEntrada } from '@/components/jornada/PaginasDeEntrada';
import { VisitasDoPeriodo } from '@/components/jornada/VisitasDoPeriodo';
import {
  DESDE_ENTRADA_COM_IA,
  PERIODOS,
  ROTULOS_ORIGEM,
  calcularFunil,
  calcularLeitura,
  calcularUso,
  calcularJanela,
  consolidarVisitas,
  dividirPelaEntradaComIa,
  filtrarVisitas,
  formatarHora,
  janela,
  rotuloDoAparelho,
  type FiltroJornada,
  type GrupoOrigem,
} from '@/lib/jornada';
import { diasDoPeriodo, visitasPelaOrigem } from '@/lib/toolsUso';
import type { Aparelho, FunilJornada } from '@/types/jornada';

// spec-2-painel RF-2-07; blueprint §3; spec-4-detalhe RF-4-21 e RF-4-22.

const PERIODO_PADRAO = PERIODOS.find((p) => p.rotulo === '24 horas')!;
const UM_DIA_MS = 86_400_000;
// A origem crua das visitas que saem do Tools (medicao-de-uso RF-MU-09).
const ORIGEM_DO_TOOLS = 'utm:tools';

const GRUPOS_ORIGEM = Object.keys(ROTULOS_ORIGEM) as GrupoOrigem[];
const APARELHOS: Aparelho[] = ['celular', 'computador'];

// Os totais do funil são somas por visita (a API conta as visitas que começaram na janela), então
// as duas partes de um período que cruza a data somam o período inteiro, sem dupla contagem.
function somarFunis(funis: FunilJornada[]): FunilJornada {
  return {
    etapas: funis.flatMap((f) => f.etapas),
    uso: funis.flatMap((f) => f.uso),
    pagou: funis.flatMap((f) => f.pagou),
    leitura: funis.flatMap((f) => f.leitura),
    // medicao-de-mercado M3 (RF-MM-37): soma o que cada série deixou de fora (a chave some com sem_sinal=incluir).
    sem_sinal_humano: funis.flatMap((f) => f.sem_sinal_humano ?? []),
  };
}

// "N visitas sem sinal humano ficaram de fora" (RF-MM-37), com o singular e o zero.
function textoDoSemSinal(n: number): string {
  if (n === 0) return 'Nenhuma visita sem sinal humano ficou de fora';
  if (n === 1) return '1 visita sem sinal humano ficou de fora';
  return `${n} visitas sem sinal humano ficaram de fora`;
}

const classeSelect =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function JornadaPage() {
  const queryClient = useQueryClient();
  // A janela termina no instante da última troca de período ou do último Atualizar.
  // rodada: o Atualizar busca de novo mesmo quando o relógio não andou.
  const [consulta, setConsulta] = useState(() => ({ periodo: PERIODO_PADRAO, agora: Date.now(), rodada: 0 }));
  // A origem começa no anúncio do Google (pedido de 06/11/2026); "Todas" segue no menu.
  const [filtro, setFiltro] = useState<FiltroJornada>({ origem: 'google', aparelho: 'todos' });
  const [mostrarTeste, setMostrarTeste] = useState(false);
  // medicao-de-mercado M3 (RF-MM-37): desmarcada, a API exclui as sessões sem sinal humano do funil e a
  // tela mostra quantas ficaram de fora. Estado local, sem persistência.
  const [incluirSemSinal, setIncluirSemSinal] = useState(false);

  const { periodo, rodada } = consulta;
  const { desde, ate } = janela(periodo.ms, consulta.agora);

  // configurador-com-ia (blueprint §9.1): uma chamada por série. Com DESDE_ENTRADA_COM_IA null, a
  // série antiga é a janela inteira (a chamada de sempre); quando o período cruza a data, duas.
  const partes = dividirPelaEntradaComIa(desde, ate, DESDE_ENTRADA_COM_IA);
  // Só pede o parâmetro novo quando a caixa está marcada; desmarcada, a chamada é a de sempre.
  const buscarFunil = (de: number, ate: number) =>
    incluirSemSinal ? jornadaService.funil(de, ate, { incluirSemSinal: true }) : jornadaService.funil(de, ate);
  const funilQuery = useQuery({
    queryKey: ['jornada-funil', partes.antiga?.desde, partes.antiga?.ate, rodada, incluirSemSinal],
    queryFn: () => buscarFunil(partes.antiga!.desde, partes.antiga!.ate),
    enabled: partes.antiga !== null,
  });
  const funilNovoQuery = useQuery({
    queryKey: ['jornada-funil-entrada-com-ia', partes.nova?.desde, partes.nova?.ate, rodada, incluirSemSinal],
    queryFn: () => buscarFunil(partes.nova!.desde, partes.nova!.ate),
    enabled: partes.nova !== null,
  });
  // As chamadas que este período usa (uma ou duas).
  const chamadasDoFunil = [
    ...(partes.antiga !== null ? [funilQuery] : []),
    ...(partes.nova !== null ? [funilNovoQuery] : []),
  ];
  // null: a série não tem parte no período; undefined: ainda sem dados.
  const dadosAntiga = partes.antiga === null ? null : funilQuery.data;
  const dadosNova = partes.nova === null ? null : funilNovoQuery.data;
  const series = useMemo<SeriesDoFunil | undefined>(
    () => (dadosAntiga === undefined || dadosNova === undefined ? undefined : { antiga: dadosAntiga, nova: dadosNova }),
    [dadosAntiga, dadosNova],
  );
  const funilDoPeriodo = useMemo(
    () => (series ? somarFunis([series.antiga, series.nova].filter((f): f is FunilJornada => f !== null)) : undefined),
    [series],
  );
  const funilErro = chamadasDoFunil.some((q) => q.isError);
  const tentarFunil = () => {
    for (const q of chamadasDoFunil) void q.refetch();
  };

  // medicao-de-uso RF-MU-08: o cartão "Uso do Tools" usa o mesmo período da página, em dias de Brasília.
  const diasDoTools = diasDoPeriodo(desde, ate);
  const toolsUsoQuery = useQuery({
    queryKey: ['tools-uso', diasDoTools.de, diasDoTools.ate, rodada],
    queryFn: () => toolsUsoService.resumo(diasDoTools.de, diasDoTools.ate),
  });
  // RF-MU-09: visitas da jornada com origem utm:tools; sem o funil (carregando ou erro), a linha some.
  const chegaramPeloTools = useMemo(
    () => (funilDoPeriodo ? visitasPelaOrigem(funilDoPeriodo, ORIGEM_DO_TOOLS) : undefined),
    [funilDoPeriodo],
  );

  // RF-4-19: as de teste vêm sempre; a tela filtra pelo "Mostrar visitas de teste".
  const visitasQuery = useQuery({
    queryKey: ['jornada-visitas', desde, ate, rodada],
    queryFn: () => jornadaService.visitas(desde, ate),
  });

  const visitasDoPeriodo = useMemo(
    () => visitasQuery.data?.filter((v) => mostrarTeste || !v.teste),
    [visitasQuery.data, mostrarTeste],
  );
  const visitasConsolidadas = useMemo(
    () => (visitasDoPeriodo ? consolidarVisitas(visitasDoPeriodo) : undefined),
    [visitasDoPeriodo],
  );
  const visitas = useMemo(
    () => (visitasConsolidadas ? filtrarVisitas(visitasConsolidadas, filtro) : undefined),
    [visitasConsolidadas, filtro],
  );

  const atualizando = chamadasDoFunil.some((q) => q.isFetching) || visitasQuery.isFetching;
  const atualizadoEm =
    chamadasDoFunil.every((q) => q.isSuccess) && visitasQuery.isSuccess && !atualizando
      ? Math.max(...chamadasDoFunil.map((q) => q.dataUpdatedAt), visitasQuery.dataUpdatedAt)
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
    () => (funilDoPeriodo ? calcularFunil(funilDoPeriodo, filtro) : undefined),
    [funilDoPeriodo, filtro],
  );
  const uso = useMemo(
    () => (funilDoPeriodo ? calcularUso(funilDoPeriodo, filtro) : undefined),
    [funilDoPeriodo, filtro],
  );
  const dadosDaJanela = useMemo(
    () => (funilDoPeriodo ? calcularJanela(funilDoPeriodo, filtro) : undefined),
    [funilDoPeriodo, filtro],
  );
  const leitura = useMemo(
    () => (funilDoPeriodo ? calcularLeitura(funilDoPeriodo, filtro) : undefined),
    [funilDoPeriodo, filtro],
  );

  // O que a API deixou de fora, com os filtros de origem e aparelho aplicados; sem texto com a caixa marcada.
  const semSinalDeFora = useMemo(
    () =>
      funilDoPeriodo && !incluirSemSinal
        ? filtrarVisitas(funilDoPeriodo.sem_sinal_humano ?? [], filtro).reduce((total, l) => total + l.visitas, 0)
        : undefined,
    [funilDoPeriodo, incluirSemSinal, filtro],
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

  const funilCarregando = chamadasDoFunil.some((q) => q.isPending || (q.isError && q.isFetching));
  const visitasCarregando = visitasQuery.isPending || (visitasQuery.isError && visitasQuery.isFetching);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div
          data-testid="topo-da-jornada"
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900">Jornada do visitante</h1>
            <p className="text-slate-500">
              De onde vêm, onde param e o que usam no configurador. Visitas de teste ficam fora dos números.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
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
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={incluirSemSinal}
                  onChange={(e) => setIncluirSemSinal(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600"
                />
                Incluir visitas sem sinal humano
              </label>
              <p aria-live="polite" className="text-sm text-slate-500 text-balance">
                {semSinalDeFora !== undefined ? textoDoSemSinal(semSinalDeFora) : ''}
              </p>
            </div>
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
        </div>

        {DESDE_ENTRADA_COM_IA === null ? (
          <FunilVitrine
            idTitulo="titulo-funil-jornada"
            titulo={comFiltros('Funil')}
            valores={valores}
            carregando={funilCarregando}
            erro={funilErro}
            onTentar={tentarFunil}
            textoVazio="Nenhuma visita registrada no período."
            comAnterior
          />
        ) : (
          <FunilEmSeries
            idTitulo="titulo-funil-jornada"
            titulo={comFiltros('Funil')}
            corte={DESDE_ENTRADA_COM_IA}
            series={funilErro ? undefined : series}
            filtro={filtro}
            carregando={funilCarregando}
            erro={funilErro}
            onTentar={tentarFunil}
            textoVazio="Nenhuma visita registrada no período."
            comAnterior
          />
        )}

        {/* RF-JT-35: lado a lado a partir de lg; abaixo disso, um embaixo do outro. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <UsoDoEditor
            uso={uso}
            carregando={funilCarregando}
            erro={funilErro}
            onTentar={tentarFunil}
          />

          <PaginasDeEntrada
            titulo={comFiltros('Páginas de entrada')}
            leitura={leitura}
            carregando={funilCarregando}
            erro={funilErro}
            onTentar={tentarFunil}
          />

          {/* medicao-de-mercado RF-MM-2d: mesma grade, mesmos filtros e período. */}
          <MotivosDaReserva uso={uso} carregando={funilCarregando} erro={funilErro} onTentar={tentarFunil} />

          {/* medicao-de-mercado RF-MM-48: ao lado dos motivos da reserva, mesmos filtros e período. */}
          <JanelaCampoACampo janela={dadosDaJanela} carregando={funilCarregando} erro={funilErro} onTentar={tentarFunil} />
        </div>

        {/* medicao-de-uso RF-MU-08: mesmo período da página; os filtros de origem e aparelho não valem aqui. */}
        <UsoDoTools
          dados={toolsUsoQuery.data}
          carregando={toolsUsoQuery.isPending || (toolsUsoQuery.isError && toolsUsoQuery.isFetching)}
          erro={toolsUsoQuery.isError}
          onTentar={() => void toolsUsoQuery.refetch()}
          chegaramPeloTools={chegaramPeloTools}
        />

        <VisitasDoPeriodo
          titulo={comFiltros('Visitas')}
          textoVazio={
            visitasDoPeriodo && visitasDoPeriodo.length > 0
              ? 'Nenhuma visita no período com esses filtros.'
              : 'Nenhuma visita neste período.'
          }
          comData={periodo.ms > UM_DIA_MS}
          visitas={visitas}
          carregando={visitasCarregando}
          erro={visitasQuery.isError}
          onTentar={() => void visitasQuery.refetch()}
          mostrarTeste={mostrarTeste}
          onMostrarTeste={setMostrarTeste}
          incluirSemSinal={incluirSemSinal}
        />
      </div>
    </div>
  );
}
