import { OPCOES_MENU, PASSOS_IA, taxa } from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface UsoDoEditorProps {
  // Visitas por evento, já filtradas; undefined enquanto carrega ou no erro.
  uso: Record<string, number> | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
}

// Uso do editor (blueprint §3.3): menu "Editar" e o funil da IA, lado a lado a partir de lg.
export function UsoDoEditor({ uso, carregando, erro, onTentar }: UsoDoEditorProps) {
  const contar = (evento: string) => uso?.[evento] ?? 0;
  const copiou = contar(PASSOS_IA.copiou.evento);
  const passosComTaxa = [PASSOS_IA.viu, PASSOS_IA.aplicou];

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
                Editar com sua IA
              </h3>
              <ul aria-labelledby="titulo-editar-ia" className="flex flex-col gap-2 text-sm">
                <li className="grid grid-cols-[1fr_3rem_3rem] items-center gap-3">
                  <span className="text-slate-700">{PASSOS_IA.copiou.rotulo}</span>
                  <span className="text-right font-semibold text-slate-900 tabular-nums">{copiou}</span>
                  <span />
                </li>
                {passosComTaxa.map((passo) => {
                  const valor = contar(passo.evento);
                  const porcentagem = taxa(valor, copiou);
                  return (
                    <li key={passo.evento} className="grid grid-cols-[1fr_3rem_3rem] items-center gap-3">
                      <span className="text-slate-700">{passo.rotulo}</span>
                      <span className="text-right font-semibold text-slate-900 tabular-nums">{valor}</span>
                      <span className="text-right text-slate-500 tabular-nums">
                        {porcentagem !== null ? `${porcentagem}%` : null}
                      </span>
                    </li>
                  );
                })}
                {/* Sem porcentagem e em âmbar: indica atrito. */}
                <li className="grid grid-cols-[1fr_3rem_3rem] items-center gap-3 text-amber-700">
                  <span>{PASSOS_IA.invalida.rotulo}</span>
                  <span className="text-right font-semibold tabular-nums">{contar(PASSOS_IA.invalida.evento)}</span>
                  <span />
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
