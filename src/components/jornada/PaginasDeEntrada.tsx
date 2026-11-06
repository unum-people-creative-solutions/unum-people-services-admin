import { useState, type ReactNode } from 'react';
import {
  BOTOES_DA_PAGINA,
  ROLAGEM_LEITURA,
  ROTULOS_CLIQUE,
  ROTULOS_PAGINA,
  ROTULOS_SECAO,
  SECOES_DA_PAGINA,
  TEMPO_LEITURA,
  taxa,
} from '@/lib/jornada';
import type { PaginaDeEntrada } from '@/types/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

// A ordem das abas é também a do desempate (RF-3-13).
const PAGINAS = Object.keys(ROTULOS_PAGINA) as PaginaDeEntrada[];

interface PaginasDeEntradaProps {
  titulo: ReactNode;
  // Visitas por página e evento (sem "lp_"), já filtradas; undefined enquanto carrega ou no erro.
  leitura: Record<PaginaDeEntrada, Record<string, number>> | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
}

interface Linha {
  chave: string;
  rotulo: string;
  valor: number;
}

function paginaComMaisVisitas(leitura: Record<PaginaDeEntrada, Record<string, number>>): PaginaDeEntrada {
  // reduce mantém a primeira no empate: vale a ordem das abas.
  return PAGINAS.reduce((melhor, p) => ((leitura[p].visita ?? 0) > (leitura[melhor].visita ?? 0) ? p : melhor));
}

// Bloco com barras sobre as visitas da página (rolagem, tempo e seções).
function BlocoComTaxa({ id, titulo, linhas, base }: { id: string; titulo: ReactNode; linhas: Linha[]; base: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 id={id} className="mb-3 text-sm font-semibold text-slate-900">
        {titulo}
      </h3>
      <ul aria-labelledby={id} className="flex flex-col gap-2 text-sm">
        {linhas.map((linha) => {
          const porcentagem = taxa(linha.valor, base);
          const largura = base > 0 ? Math.min(100, (linha.valor / base) * 100) : 0;
          return (
            <li
              key={linha.chave}
              className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[minmax(6rem,10rem)_1fr_2.5rem_3rem] items-center gap-x-3 gap-y-1"
            >
              <span className="text-slate-700">{linha.rotulo}</span>
              <span aria-hidden="true" className="order-last col-span-3 sm:order-none sm:col-span-1 block h-3 rounded-full bg-primary-50 overflow-hidden">
                <span className="block h-full rounded-full bg-primary-500" style={{ width: `${largura}%` }} />
              </span>
              <span className="text-right font-semibold text-slate-900 tabular-nums">{linha.valor}</span>
              <span className="text-right tabular-nums text-slate-500 min-w-[3rem]">
                {porcentagem !== null ? `${porcentagem}%` : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Páginas de entrada (TECH-DESIGN-jornada-leitura-das-paginas §7.1): só totais, nenhum dado do visitante.
export function PaginasDeEntrada({ titulo, leitura, carregando, erro, onTentar }: PaginasDeEntradaProps) {
  const [escolhida, setEscolhida] = useState<PaginaDeEntrada | null>(null);

  const pagina = leitura ? (escolhida ?? paginaComMaisVisitas(leitura)) : null;
  const contagem = leitura && pagina ? leitura[pagina] : {};
  const contar = (evento: string) => contagem[evento] ?? 0;
  const n = contar('visita');

  const cliques: Linha[] = pagina
    ? BOTOES_DA_PAGINA[pagina]
        .map((nome) => ({ chave: nome, rotulo: ROTULOS_CLIQUE[nome], valor: contar(`clique_${nome}`) }))
        // sort estável: no empate fica a ordem da tabela de cliques.
        .sort((a, b) => b.valor - a.valor)
    : [];

  return (
    <section
      aria-labelledby="titulo-paginas-entrada"
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 id="titulo-paginas-entrada" className="font-bold text-slate-900">
          {titulo}
        </h2>
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={6} />
        ) : erro || leitura === undefined || pagina === null ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="group" aria-label="Página de entrada" className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                {PAGINAS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={pagina === p}
                    onClick={() => setEscolhida(p)}
                    className={
                      pagina === p
                        ? 'px-3 py-1.5 rounded-md text-sm font-medium bg-white text-primary-700 shadow-sm'
                        : 'px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900'
                    }
                  >
                    {ROTULOS_PAGINA[p]}
                  </button>
                ))}
              </div>
              {n > 0 ? (
                <p className="text-sm text-slate-500 tabular-nums">{n === 1 ? '1 visita viu esta página' : `${n} visitas viram esta página`}</p>
              ) : null}
            </div>

            {n === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nenhuma visita entrou por esta página no período.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BlocoComTaxa
                  id="titulo-leitura-rolagem"
                  titulo="Rolagem"
                  base={n}
                  linhas={ROLAGEM_LEITURA.map((l) => ({ chave: l.evento, rotulo: l.rotulo, valor: contar(l.evento) }))}
                />
                <BlocoComTaxa
                  id="titulo-leitura-tempo"
                  titulo={
                    <>
                      Tempo na página <span className="font-normal text-slate-500">(aba visível)</span>
                    </>
                  }
                  base={n}
                  linhas={TEMPO_LEITURA.map((l) => ({ chave: l.evento, rotulo: l.rotulo, valor: contar(l.evento) }))}
                />
                <BlocoComTaxa
                  id="titulo-leitura-secoes"
                  titulo="Seções vistas"
                  base={n}
                  linhas={SECOES_DA_PAGINA[pagina].map((nome) => ({
                    chave: nome,
                    rotulo: ROTULOS_SECAO[nome],
                    valor: contar(`secao_${nome}`),
                  }))}
                />
                {/* Cliques só com o número: dependem de onde o botão fica (§7.1). */}
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 id="titulo-leitura-cliques" className="mb-3 text-sm font-semibold text-slate-900">
                    Cliques
                  </h3>
                  <ul aria-labelledby="titulo-leitura-cliques" className="flex flex-col gap-2 text-sm">
                    {cliques.map((clique) => (
                      <li key={clique.chave} className="flex items-center justify-between gap-3">
                        <span className="text-slate-700">{clique.rotulo}</span>
                        <span className="font-semibold text-slate-900 tabular-nums">{clique.valor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
