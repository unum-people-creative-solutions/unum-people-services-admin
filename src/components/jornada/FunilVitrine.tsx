import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  DESDE_CHEGADA_NA_CONTRATACAO,
  ROTULOS_ETAPAS,
  ROTULO_ETAPA_10_ENTRADA_COM_IA,
  ROTULOS_ETAPAS_ENTRADA_COM_IA,
  calcularFunil,
  calcularAoLadoEntradaComIa,
  calcularFunilEntradaComIa,
  calcularUso,
  compararSeries,
  medianaDaMontagem,
  notaDaEtapa,
  taxa,
  type FiltroJornada,
  type LinhaDaComparacao,
} from '@/lib/jornada';
import type { FunilJornada } from '@/types/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface FunilVitrineProps {
  idTitulo: string;
  titulo: ReactNode;
  // Um valor por rótulo, na mesma ordem; undefined enquanto carrega ou no erro.
  valores: number[] | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
  textoVazio: string;
  // Na página da jornada, cada etapa mostra também a taxa sobre a anterior (blueprint §3.2).
  comAnterior?: boolean;
  acao?: ReactNode;
  // configurador-com-ia (blueprint §9.1): rótulos da série; sem a prop, as nove etapas de hoje.
  rotulos?: readonly string[];
  // Linhas extras sob o rótulo, pelo rótulo da etapa.
  extras?: Readonly<Partial<Record<string, string | readonly string[]>>>;
  // RF-JF-40: "% da anterior" nunca passa de 100% (visita que pulou etapa por lote recusado não conta a mais).
  limitarAnterior?: boolean;
  // Nota sob o título do cartão.
  notaDoTitulo?: string | null;
  // Bloco abaixo das etapas (a comparação das séries).
  depois?: ReactNode;
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
  rotulos = ROTULOS_ETAPAS,
  extras,
  limitarAnterior = false,
  notaDoTitulo = null,
  depois,
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
        <div>
          <h2 id={idTitulo} className="font-bold text-slate-900">
            {titulo}
          </h2>
          {notaDoTitulo !== null ? <p className="mt-1 text-xs text-slate-500">{notaDoTitulo}</p> : null}
        </div>
        {acao}
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={rotulos.length} />
        ) : erro || valores === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : (
          <>
            {vazio ? (
              <p className="py-6 text-center text-sm text-slate-500">{textoVazio}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {rotulos.map((rotulo, i) => {
                  const valor = valores[i] ?? 0;
                  const sobreVisitou = i === 0 ? null : taxa(valor, visitou);
                  const bruta = i === 0 ? null : taxa(valor, valores[i - 1] ?? 0);
                  const sobreAnterior = bruta !== null && limitarAnterior ? Math.min(100, bruta) : bruta;
                  const largura = escala > 0 ? Math.min(100, (valor / escala) * 100) : 0;
                  // medicao-e-robustez MR-25: a série de "Abriu a contratação" muda de regra a partir do dia
                  // da constante. Pelo rótulo, porque na série nova a etapa não é a 6ª da lista.
                  const numeroDeHoje = (ROTULOS_ETAPAS as readonly string[]).indexOf(rotulo) + 1;
                  const nota = notaDaEtapa(numeroDeHoje, DESDE_CHEGADA_NA_CONTRATACAO);
                  const extraDaLinha = extras?.[rotulo];
                  const linhasExtras = extraDaLinha === undefined ? [] : typeof extraDaLinha === 'string' ? [extraDaLinha] : extraDaLinha;
                  return (
                    // No celular a barra desce para uma linha própria; a ordem no DOM (rótulo, barra, número, taxa) não muda.
                    <li
                      key={rotulo}
                      className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[minmax(9rem,12rem)_1fr_3.5rem_auto] items-center gap-x-3 gap-y-1 text-sm"
                    >
                      <span className="text-slate-700">
                        {rotulo}
                        {nota !== null ? <span className="block text-xs text-slate-500">{nota}</span> : null}
                        {linhasExtras.map((extra) => (
                          <span key={extra} className="block text-xs text-slate-500">
                            {extra}
                          </span>
                        ))}
                      </span>
                      <span aria-hidden="true" className="order-last col-span-3 sm:order-none sm:col-span-1 block h-3 rounded-full bg-primary-50 overflow-hidden">
                        <span className="block h-full rounded-full bg-primary-500" style={{ width: `${largura}%` }} />
                      </span>
                      <span className="text-right font-semibold text-slate-900 tabular-nums">{valor}</span>
                      <span className={`text-right tabular-nums text-slate-500 ${comAnterior ? 'sm:min-w-[11rem]' : 'min-w-[3rem]'}`}>
                        {sobreVisitou !== null ? `${sobreVisitou}%` : null}
                        {comAnterior && sobreAnterior !== null ? ` · ${sobreAnterior}% da anterior` : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {depois}
          </>
        )}
      </div>
    </section>
  );
}

// configurador-com-ia (blueprint §9.1, D-UI-29): a série nova ("Entrada com IA") e a antiga
// ("Escolha de modelo"), separadas pela data em que a flag ligou.
export type SerieDoFunil = 'nova' | 'antiga';

// null = a série não tem parte no período.
export interface SeriesDoFunil {
  antiga: FunilJornada | null;
  nova: FunilJornada | null;
}

interface FunilEmSeriesProps {
  idTitulo: string;
  titulo: ReactNode;
  // DESDE_ENTRADA_COM_IA (AAAA-MM-DD ou instante AAAA-MM-DDTHH:MM:SS-03:00, Brasília).
  corte: string;
  // undefined enquanto carrega ou no erro de qualquer das chamadas.
  series: SeriesDoFunil | undefined;
  filtro: FiltroJornada;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
  textoVazio: string;
  comAnterior?: boolean;
}

// AAAA-MM-DD → dd/mm; AAAA-MM-DDTHH:MM… (já em Brasília) → dd/mm, HHhMM.
function diaMesDoCorte(corte: string): string {
  const [, mes, dia] = corte.slice(0, 10).split('-');
  if (!corte.includes('T')) return `${dia}/${mes}`;
  return `${dia}/${mes}, ${corte.slice(11, 13)}h${corte.slice(14, 16)}`;
}

const SEM_VISITAS_ANTIGA = new Array<number>(ROTULOS_ETAPAS.length).fill(0);
const SEM_VISITAS_NOVA = new Array<number>(ROTULOS_ETAPAS_ENTRADA_COM_IA.length).fill(0);
const SEM_AO_LADO = { editou: 0, abriuAPrevia: 0 };

// RF-JF-42 (decisão do dono, D3): uma nota, sem terceira série. Texto literal.
const NOTA_DA_SERIE_NOVA = "Desde 19/11 a prévia abre sozinha depois da montagem; 'Abriu a prévia' conta só quem a abre por escolha.";

// RF-JF-41: contagem e, havendo quem viu o site montado, a parcela dessa base.
function parcela(rotulo: string, valor: number, base: number): string {
  const pct = taxa(valor, base);
  return pct === null ? `${rotulo}: ${valor}` : `${rotulo}: ${valor} (${Math.min(100, pct)}% de quem viu)`;
}
const SETAS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];

export function FunilEmSeries({
  idTitulo,
  titulo,
  corte,
  series,
  filtro,
  carregando,
  erro,
  onTentar,
  textoVazio,
  comAnterior = false,
}: FunilEmSeriesProps) {
  // null: a escolha automática vale até a pessoa tocar no seletor.
  const [escolhida, setEscolhida] = useState<SerieDoFunil | null>(null);
  const botoes = useRef<Record<SerieDoFunil, HTMLButtonElement | null>>({ nova: null, antiga: null });

  const valoresAntiga = series ? (series.antiga ? calcularFunil(series.antiga, filtro) : SEM_VISITAS_ANTIGA) : undefined;
  const valoresNova = series ? (series.nova ? calcularFunilEntradaComIa(series.nova, filtro) : SEM_VISITAS_NOVA) : undefined;
  const usoNova = series?.nova ? calcularUso(series.nova, filtro) : {};
  const aoLadoNova = series?.nova ? calcularAoLadoEntradaComIa(series.nova, filtro) : SEM_AO_LADO;

  // Padrão: a série que tem visitas no período; se as duas têm, a nova.
  const automatica: SerieDoFunil =
    (valoresNova?.[0] ?? 0) > 0
      ? 'nova'
      : (valoresAntiga?.[0] ?? 0) > 0
        ? 'antiga'
        : series !== undefined && series.nova === null
          ? 'antiga'
          : 'nova';
  const serie = escolhida ?? automatica;

  const diaMes = diaMesDoCorte(corte);
  const opcoes: ReadonlyArray<{ id: SerieDoFunil; rotulo: string; data: string }> = [
    { id: 'nova', rotulo: 'Entrada com IA', data: `desde ${diaMes}` },
    { id: 'antiga', rotulo: 'Escolha de modelo', data: `até ${diaMes}` },
  ];

  function escolher(id: SerieDoFunil, focar: boolean) {
    setEscolhida(id);
    if (focar) botoes.current[id]?.focus();
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>, atual: SerieDoFunil) {
    if (!SETAS.includes(evento.key)) return;
    evento.preventDefault();
    escolher(atual === 'nova' ? 'antiga' : 'nova', true);
  }

  const seletor = (
    <div role="radiogroup" aria-label="Série do funil" className="flex flex-wrap rounded-lg border border-slate-200 p-0.5 bg-slate-50">
      {opcoes.map((opcao) => {
        const marcada = serie === opcao.id;
        return (
          <button
            key={opcao.id}
            ref={(el) => {
              botoes.current[opcao.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={marcada}
            tabIndex={marcada ? 0 : -1}
            onClick={() => escolher(opcao.id, false)}
            onKeyDown={(e) => aoTeclar(e, opcao.id)}
            className={
              marcada
                ? 'px-3 py-1.5 rounded-md text-sm font-medium bg-white text-primary-700 shadow-sm'
                : 'px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900'
            }
          >
            {opcao.rotulo} <span className="text-xs font-normal text-slate-500">{opcao.data}</span>
          </button>
        );
      })}
    </div>
  );

  const cruza = series !== undefined && series.antiga !== null && series.nova !== null;
  const notaDoTitulo = cruza
    ? `O período cruza a troca da entrada (${diaMes}). Cada série mostra só as visitas do seu lado.`
    : null;

  const mediana = medianaDaMontagem(usoNova);
  const viramOSite = valoresNova?.[ROTULOS_ETAPAS_ENTRADA_COM_IA.indexOf('Viu o site montado')] ?? 0;
  // RF-JF-22: "modelo pronto" também é "Viu o site montado"; entra na divisão só quando houve.
  const modeloPronto = usoNova.lp_site_montado_modelo_pronto ?? 0;
  const extrasNova: Partial<Record<string, string | readonly string[]>> = {
    [ROTULO_ETAPA_10_ENTRADA_COM_IA]: `pelo campo do topo: ${usoNova.lp_topo_comecou ?? 0}`,
    'Viu o site montado': [
      `com IA: ${usoNova.lp_site_montado_ia ?? 0} · modelo reserva: ${usoNova.lp_site_montado_reserva ?? 0}` +
        (modeloPronto > 0 ? ` · modelo pronto: ${modeloPronto}` : '') +
        (mediana !== null ? ` · tempo mediano: ${mediana} s` : ''),
      parcela('Editou', aoLadoNova.editou, viramOSite),
      parcela('Abriu a prévia', aoLadoNova.abriuAPrevia, viramOSite),
    ],
  };

  const comparacao =
    cruza && valoresAntiga && valoresNova ? (
      <ComparacaoDasSeries linhas={compararSeries(valoresAntiga, valoresNova, aoLadoNova)} />
    ) : null;

  const comuns = { idTitulo, titulo, carregando, erro, onTentar, textoVazio, comAnterior, acao: seletor, notaDoTitulo };

  return serie === 'antiga' ? (
    <FunilVitrine {...comuns} depois={comparacao} valores={valoresAntiga} />
  ) : (
    <FunilVitrine
      {...comuns}
      depois={
        <>
          <p className="mt-4 text-xs text-slate-500">{NOTA_DA_SERIE_NOVA}</p>
          {comparacao}
        </>
      }
      limitarAnterior
      valores={valoresNova}
      rotulos={ROTULOS_ETAPAS_ENTRADA_COM_IA}
      extras={series?.nova ? extrasNova : undefined}
    />
  );
}

// Blueprint §9.1: tabela de três colunas, cada célula em "de cada 100 visitas".
function ComparacaoDasSeries({ linhas }: { linhas: LinhaDaComparacao[] }) {
  const celula = (valor: number | null) => (valor === null ? '—' : String(valor));
  return (
    <table className="mt-6 w-full text-sm">
      <caption className="mb-2 text-left font-semibold text-slate-900">Comparação, de cada 100 visitas</caption>
      <thead>
        <tr className="text-left text-slate-500">
          <th scope="col" className="py-1 font-medium">Etapa</th>
          <th scope="col" className="py-1 text-right font-medium">Escolha de modelo</th>
          <th scope="col" className="py-1 text-right font-medium">Entrada com IA</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha.rotulo} className="border-t border-slate-100">
            <th scope="row" className="py-1 text-left font-normal text-slate-700">{linha.rotulo}</th>
            <td className="py-1 text-right tabular-nums text-slate-900">{celula(linha.antiga)}</td>
            <td className="py-1 text-right tabular-nums text-slate-900">{celula(linha.nova)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
