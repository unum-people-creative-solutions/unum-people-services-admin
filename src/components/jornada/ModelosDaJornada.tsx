import type { MontagensDoModelo } from '@/types/jornadaModelos';
import { semMontagens } from '@/lib/jornadaModelos';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface ModelosDaJornadaProps {
  // "Modelos" ou "Cores": título do cartão.
  titulo: string;
  // "Modelo" ou "Cores": cabeçalho da primeira coluna.
  colunaRotulo: string;
  // Linhas da resposta, na ordem dela; undefined enquanto carrega ou no erro.
  linhas: MontagensDoModelo[] | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
}

const COLUNAS: ReadonlyArray<{ rotulo: string; valor: (l: MontagensDoModelo) => number }> = [
  { rotulo: 'Montados pela IA', valor: (l) => l.ia },
  { rotulo: 'Escolhidos pela pessoa', valor: (l) => l.pessoa },
  { rotulo: 'Reserva', valor: (l) => l.reserva },
  { rotulo: 'Trocaram por outro', valor: (l) => l.saiu },
  { rotulo: 'Vieram de outro', valor: (l) => l.entrou },
  { rotulo: 'Contratados', valor: (l) => l.contratados },
];

// opiniao-e-modelos RF-OM-08 e DT-OM-07: um cartão por tabela (modelos ou temas), com o período da página.
export function ModelosDaJornada({ titulo, colunaRotulo, linhas, carregando, erro, onTentar }: ModelosDaJornadaProps) {
  const idTitulo = `titulo-${titulo.toLowerCase()}-da-jornada`;
  return (
    <section
      aria-labelledby={idTitulo}
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 id={idTitulo} className="font-bold text-slate-900">
          {titulo}
        </h2>
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={5} />
        ) : erro || linhas === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : semMontagens(linhas) ? (
          <p className="py-2 text-center text-sm text-slate-500">Ainda não há montagens neste período.</p>
        ) : (
          // A tabela rola dentro do cartão; a página não ganha rolagem lateral no celular.
          <div
            role="region"
            aria-label={`Tabela de ${titulo}`}
            tabIndex={0}
            style={{ overflowX: 'auto' }}
            className="text-sm"
          >
            <table className="w-full min-w-[44rem] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    {colunaRotulo}
                  </th>
                  {COLUNAS.map((c) => (
                    <th key={c.rotulo} scope="col" className="px-2 py-2 text-right font-semibold">
                      {c.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="py-2 pr-3 font-medium text-slate-700">
                      {l.rotulo}
                    </th>
                    {COLUNAS.map((c) => (
                      <td key={c.rotulo} className="px-2 py-2 text-right font-semibold text-slate-900 tabular-nums">
                        {c.valor(l)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
