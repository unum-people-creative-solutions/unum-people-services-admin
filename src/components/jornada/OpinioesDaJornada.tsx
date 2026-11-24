import Link from 'next/link';
import type { NotaDaOpiniao, OpiniaoDoEditor, ResumoDeOpinioes } from '@/types/jornadaOpinioes';
import { caminhoDoVisitante } from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface OpinioesDaJornadaProps {
  // Resposta da API; undefined enquanto carrega ou no erro.
  dados: ResumoDeOpinioes | undefined;
  // id do modelo (l11) -> rótulo (Refúgio), do cartão "Modelos" da mesma página; sem ele, mostra o id.
  rotulosDeModelo?: Readonly<Record<string, string>>;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
}

// Rótulos literais da spec (RF-OM-19), da melhor nota para a pior.
const NOTAS: ReadonlyArray<{ nota: NotaDaOpiniao; rotulo: string }> = [
  { nota: '5', rotulo: 'Muito boa' },
  { nota: '4', rotulo: 'Boa' },
  { nota: '3', rotulo: 'Mais ou menos' },
  { nota: '2', rotulo: 'Ruim' },
  { nota: '1', rotulo: 'Muito ruim' },
];
const ROTULO_DA_NOTA: Readonly<Record<string, string>> = Object.fromEntries(NOTAS.map((n) => [n.nota, n.rotulo]));

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// "24/11/2026 12:00", sem a vírgula que alguns ICU põem entre data e hora.
function dataEHora(em: number): string {
  const p = Object.fromEntries(formatoDataHora.formatToParts(new Date(em)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

// "4,2": uma casa e vírgula.
function mediaComVirgula(media: number): string {
  return media.toFixed(1).replace('.', ',');
}

function totalEmTexto(total: number): string {
  return total === 1 ? '1 opinião' : `${total} opiniões`;
}

function QuemEVisita({ opiniao }: { opiniao: OpiniaoDoEditor }) {
  if (opiniao.porta === 'logada') return <span className="text-slate-600">Cliente</span>;
  if (!opiniao.visitante || !opiniao.visita) return <span className="text-slate-500">Visita sem registro</span>;
  return (
    <Link
      href={`${caminhoDoVisitante(opiniao.visitante)}#visita-${opiniao.visita}`}
      className="font-medium text-primary-700 hover:underline"
    >
      Ver a visita
    </Link>
  );
}

// opiniao-e-modelos RF-OM-19 e DT-OM-18: um cartão com o período da página.
export function OpinioesDaJornada({ dados, rotulosDeModelo, carregando, erro, onTentar }: OpinioesDaJornadaProps) {
  return (
    <section
      aria-labelledby="titulo-opinioes-da-jornada"
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 id="titulo-opinioes-da-jornada" className="font-bold text-slate-900">
          Opiniões
        </h2>
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={5} />
        ) : erro || dados === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : dados.total === 0 ? (
          <p className="py-2 text-center text-sm text-slate-500">Ainda não há opiniões neste período.</p>
        ) : (
          <div className="flex flex-col gap-6 min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <div>
                <p className="text-2xl font-bold text-slate-900">{`Média: ${mediaComVirgula(dados.media)} de 5`}</p>
                <p className="text-sm text-slate-600">{totalEmTexto(dados.total)}</p>
              </div>
              <ul aria-label="Opiniões por nota" className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                {NOTAS.map(({ nota, rotulo }) => {
                  const quantas = dados.por_nota[nota];
                  const largura = dados.total > 0 ? Math.round((quantas / dados.total) * 100) : 0;
                  return (
                    <li key={nota} className="flex items-center gap-3">
                      <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-slate-900">{nota}</span>
                      <span className="w-28 shrink-0 text-slate-700">{rotulo}</span>
                      <span aria-hidden="true" className="h-2 min-w-0 flex-1 rounded bg-slate-100">
                        <span className="block h-2 rounded bg-primary-500" style={{ width: `${largura}%` }} />
                      </span>
                      <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-slate-900">{quantas}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <ul aria-label="Opiniões do período" className="divide-y divide-slate-100 text-sm">
              {dados.opinioes.map((o, i) => {
                const texto = o.texto?.trim();
                return (
                  <li key={`${o.em}-${i}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                      <time dateTime={new Date(o.em).toISOString()} className="tabular-nums">
                        {dataEHora(o.em)}
                      </time>
                      <span className="font-semibold text-slate-900">{`${o.nota} · ${ROTULO_DA_NOTA[String(o.nota)] ?? ''}`}</span>
                      <span>{rotulosDeModelo?.[o.modelo] ?? o.modelo}</span>
                      <QuemEVisita opiniao={o} />
                    </div>
                    {texto ? (
                      <p className="whitespace-pre-line break-words text-slate-800">{texto}</p>
                    ) : (
                      <p className="text-slate-500">Sem comentário</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
