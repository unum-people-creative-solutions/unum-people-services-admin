import { LINHAS_DA_IA, OPCOES_MENU, taxa } from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface UsoDoEditorProps {
  // Visitas por evento, já filtradas; undefined enquanto carrega ou no erro.
  uso: Record<string, number> | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
}

// Uso do editor (blueprint §3.3): menu "Editar" e as linhas da IA, lado a lado a partir de lg.
// configurador-com-ia blueprint §9.2: "Editar com IA" com as linhas novas primeiro e as quatro de
// copiar e colar depois, com o sufixo.
export function UsoDoEditor({ uso, carregando, erro, onTentar }: UsoDoEditorProps) {
  const contar = (evento: string) => uso?.[evento] ?? 0;

  return (
    <section
      aria-labelledby="titulo-uso-editor"
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 id="titulo-uso-editor" className="font-bold text-slate-900">
          Uso do editor
        </h2>
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={6} />
        ) : erro || uso === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 id="titulo-menu-editar" className="mb-3 text-sm font-semibold text-slate-900">
                Menu &quot;Editar&quot;
              </h3>
              <ul aria-labelledby="titulo-menu-editar" className="flex flex-col gap-2 text-sm">
                {OPCOES_MENU.map((opcao) => (
                  <li key={opcao.evento} className="flex items-center justify-between gap-3">
                    <span className="text-slate-700">{opcao.rotulo}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{contar(opcao.evento)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 id="titulo-editar-ia" className="mb-3 text-sm font-semibold text-slate-900">
                Editar com IA
              </h3>
              <ul aria-labelledby="titulo-editar-ia" className="flex flex-col gap-2 text-sm">
                {LINHAS_DA_IA.map((linha) => {
                  const valor = contar(linha.evento);
                  const porcentagem = linha.base !== undefined ? taxa(valor, contar(linha.base)) : null;
                  return (
                    // Atrito em âmbar, sem porcentagem.
                    <li
                      key={linha.evento}
                      className={`grid grid-cols-[1fr_3rem_3rem] items-center gap-3 ${linha.atrito ? 'text-amber-700' : ''}`}
                    >
                      <span className={linha.atrito ? '' : 'text-slate-700'}>{linha.rotulo}</span>
                      <span className={`text-right font-semibold tabular-nums ${linha.atrito ? '' : 'text-slate-900'}`}>{valor}</span>
                      <span className="text-right text-slate-500 tabular-nums">
                        {porcentagem !== null ? `${porcentagem}%` : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
