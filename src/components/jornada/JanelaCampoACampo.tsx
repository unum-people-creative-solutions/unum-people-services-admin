import { taxa, type DadosDaJanela } from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface JanelaCampoACampoProps {
  // Contagens por visita, já filtradas por origem e aparelho; undefined enquanto carrega ou no erro.
  janela: DadosDaJanela | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
}

// medicao-de-mercado RF-MM-48: em que estado a pessoa saiu de cada campo da janela "Vamos montar seu site". Só
// o estado (vazio ou preenchido) e o tempo; o texto digitado nunca existe aqui.
export function JanelaCampoACampo({ janela, carregando, erro, onTentar }: JanelaCampoACampoProps) {
  // `N (P%)`, com P = taxa(N, visitas que viram a janela); sem base, "-" no lugar da porcentagem.
  const celula = (n: number) => {
    const p = janela ? taxa(n, janela.viram) : null;
    return `${n} (${p === null ? '-' : `${p}%`})`;
  };

  return (
    <section
      aria-labelledby="titulo-janela-campo-a-campo"
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 id="titulo-janela-campo-a-campo" className="font-bold text-slate-900">
          Campo a campo na janela
        </h2>
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={5} />
        ) : erro || janela === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            {/* Lista, não <table>: a tabela de visitas da página é a única `table`; a grade abaixo imita colunas. */}
            <div className="rounded-lg border border-slate-200">
              <div
                aria-hidden="true"
                className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:grid-cols-[minmax(0,1fr)_8rem_8rem] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                <span>Campo</span>
                <span className="text-right">Saiu preenchido</span>
                <span className="text-right">Saiu vazio</span>
              </div>
              <ul aria-label="Campos da janela" className="divide-y divide-slate-100">
                {janela.campos.map((c) => (
                  <li
                    key={c.campo}
                    className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:grid-cols-[minmax(0,1fr)_8rem_8rem] items-center gap-2 px-3 py-2"
                  >
                    <span className="text-slate-700">{c.rotulo}</span>
                    <span className="text-right font-semibold text-slate-900 tabular-nums">
                      <span className="sr-only">Saiu preenchido: </span>
                      <span>{celula(c.preenchido)}</span>
                    </span>
                    <span className="text-right font-semibold text-slate-900 tabular-nums">
                      <span className="sr-only">Saiu vazio: </span>
                      <span>{celula(c.vazio)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-slate-700">Viram a janela: {janela.viram}</p>
            <p className="text-slate-700">Enviaram os dados: {janela.enviaram}</p>
            <p className="text-slate-700">Usaram &quot;Usar este exemplo&quot;: {janela.exemplo}</p>
          </div>
        )}
      </div>
    </section>
  );
}
