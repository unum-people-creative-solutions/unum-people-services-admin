import type { FerramentaTools, ResumoToolsUso, TotaisDaFerramenta } from '@/types/toolsUso';
import { semUsoDoTools } from '@/lib/toolsUso';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface UsoDoToolsProps {
  // Resposta da API do Tools; undefined enquanto carrega ou no erro.
  dados: ResumoToolsUso | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
  // Visitas da jornada com origem utm:tools no período; undefined quando a jornada não deu o dado.
  chegaramPeloTools: number | undefined;
}

const ROTULOS_FERRAMENTA: Record<FerramentaTools, string> = {
  home: 'Home',
  'quanto-cobrar': 'Quanto cobrar pelo serviço',
  'vale-anunciar': 'Vale a pena anunciar?',
  'servicos-compensam': 'Quais serviços compensam',
};

// A planilha só existe na ferramenta de serviços.
const COM_PLANILHA: ReadonlySet<FerramentaTools> = new Set<FerramentaTools>(['servicos-compensam']);

const COLUNAS: ReadonlyArray<{ rotulo: string; valor: (f: TotaisDaFerramenta) => number }> = [
  { rotulo: 'Visitas', valor: (f) => f.visita },
  { rotulo: 'Começaram', valor: (f) => f.comecou },
  { rotulo: 'Viram o resultado', valor: (f) => f.resultado },
  { rotulo: 'Clicaram no convite', valor: (f) => f.convite },
  { rotulo: 'Abriram o guia', valor: (f) => f.guia },
];

const COLUNA_PLANILHA = 'Baixaram a planilha';

function textoDasVisitas(n: number): string {
  return `Chegaram ao unumpeople.app pelo Tools: ${n} ${n === 1 ? 'visita' : 'visitas'}`;
}

// medicao-de-uso RF-MU-08 e RF-MU-09: uso das ferramentas do Tools no período da página, mais as visitas
// que vieram do Tools para o unumpeople.app.
export function UsoDoTools({ dados, carregando, erro, onTentar, chegaramPeloTools }: UsoDoToolsProps) {
  return (
    <section
      aria-labelledby="titulo-uso-do-tools"
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 id="titulo-uso-do-tools" className="font-bold text-slate-900">
          Uso do Tools
        </h2>
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={5} />
        ) : erro || dados === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            {semUsoDoTools(dados) ? (
              <p className="py-2 text-center text-slate-500">Ainda não há uso do Tools neste período.</p>
            ) : (
              <div role="region" aria-label="Tabela do uso do Tools" tabIndex={0} className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Ferramenta
                      </th>
                      {COLUNAS.map((c) => (
                        <th key={c.rotulo} scope="col" className="px-2 py-2 text-right font-semibold">
                          {c.rotulo}
                        </th>
                      ))}
                      <th scope="col" className="pl-2 py-2 text-right font-semibold">
                        {COLUNA_PLANILHA}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.ferramentas.map((f) => (
                      <tr key={f.ferramenta} className="border-b border-slate-100 last:border-0">
                        <th scope="row" className="py-2 pr-3 font-medium text-slate-700">
                          {ROTULOS_FERRAMENTA[f.ferramenta]}
                        </th>
                        {COLUNAS.map((c) => (
                          <td key={c.rotulo} className="px-2 py-2 text-right font-semibold text-slate-900 tabular-nums">
                            {c.valor(f)}
                          </td>
                        ))}
                        <td className="pl-2 py-2 text-right font-semibold text-slate-900 tabular-nums">
                          {COM_PLANILHA.has(f.ferramenta) ? f.planilha : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {chegaramPeloTools !== undefined ? <p className="text-slate-700">{textoDasVisitas(chegaramPeloTools)}</p> : null}
          </div>
        )}
      </div>
    </section>
  );
}
