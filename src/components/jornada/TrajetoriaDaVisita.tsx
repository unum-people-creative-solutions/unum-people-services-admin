import Link from 'next/link';
import {
  caminhoDoVisitante,
  formatarDuracao,
  formatarHora,
  formatarHoraComSegundos,
  rotuloDaRota,
} from '@/lib/jornada';
import { acoesPrincipais, type NoDaTrajetoria, type Trajetoria } from '@/lib/trajetoria';
import { SeloPagamento } from './Selos';

// jornada-trajetoria RF-JT-20..26: cada nó é uma bolinha ligada ao próximo por uma linha horizontal; abaixo dela, uma
// linha vertical com as ações (até 3 no resumo, todos os eventos no completo). Bolinhas e linhas são decorativas.

type Modo = 'resumo' | 'completo';
type TipoDeEvento = 'acao' | 'erro' | 'leitura';

const ROTULO_CONTRATOU = 'Contratou';

const COR_DO_PONTINHO: Record<TipoDeEvento, string> = {
  acao: 'bg-primary-500',
  erro: 'bg-amber-500',
  leitura: 'bg-white border border-slate-300',
};

const COR_DO_TEXTO: Record<TipoDeEvento, string> = {
  acao: 'text-slate-800',
  erro: 'text-amber-800',
  leitura: 'text-slate-500',
};

function rotuloDaRolagem(rolagem: NonNullable<NoDaTrajetoria['rolagem']>): string {
  return rolagem === 100 ? 'o fim' : `${rolagem}%`;
}

function plural(n: number, singular: string, pluralDe: string): string {
  return `${n} ${n === 1 ? singular : pluralDe}`;
}

function resumoDaTrajetoria(t: Trajetoria): string {
  const partes = [
    `${formatarHora(t.inicio)}–${formatarHora(t.fim)}`,
    formatarDuracao(Math.floor(t.duracaoMs / 1000)),
    plural(t.nos.length, 'etapa', 'etapas'),
  ];
  if (t.voltas > 0) partes.push(`voltou ${plural(t.voltas, 'vez', 'vezes')}`);
  return partes.join(' · ');
}

function informacaoDoNo(no: NoDaTrajetoria, ultimo: boolean, modo: Modo): string {
  const duracao = formatarDuracao(no.segundos);
  const partes: string[] = [];
  if (modo === 'completo') partes.push(formatarHoraComSegundos(no.inicio));
  if (no.tipo === 'etapa') partes.push(rotuloDaRota(no.caminho), duracao);
  else partes.push(...(no.volta ? ['voltou', duracao] : [duracao]));
  let texto = partes.join(' · ');
  if (no.rolagem !== null) texto += ` · rolou até ${rotuloDaRolagem(no.rolagem)}`;
  if (ultimo && no.rotulo !== ROTULO_CONTRATOU) texto += ' · saiu aqui';
  return texto;
}

function Bolinha({ no }: { no: NoDaTrajetoria }) {
  const forma =
    no.rotulo === ROTULO_CONTRATOU
      ? 'bg-green-500 ring-4 ring-green-100'
      : no.tipo === 'etapa'
        ? 'bg-primary-500 ring-4 ring-primary-100'
        : 'bg-white border-2 border-primary-500';
  return <span className={`block h-[18px] w-[18px] shrink-0 rounded-full ${forma}`} />;
}

function Pontinho({ tipo }: { tipo: TipoDeEvento }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute -left-[17px] top-1.5 block h-2 w-2 rounded-full ${COR_DO_PONTINHO[tipo]}`}
    />
  );
}

function AcoesDoNo({
  no,
  modo,
  visitante,
  ancora,
}: {
  no: NoDaTrajetoria;
  modo: Modo;
  visitante: string;
  ancora: string;
}) {
  const lista = 'ml-2 flex flex-col gap-1.5 border-l-2 border-slate-200 pl-3 text-xs';
  if (modo === 'completo') {
    if (no.eventos.length === 0) return null;
    return (
      <ul aria-label={`Ações de ${no.rotulo}`} className={lista}>
        {no.eventos.map((evento, i) => (
          <li key={`${evento.em}-${evento.nome}-${i}`} className={`relative ${COR_DO_TEXTO[evento.tipo]}`}>
            <Pontinho tipo={evento.tipo} />
            <time dateTime={new Date(evento.em).toISOString()} className="mr-1.5 tabular-nums text-slate-500">
              {formatarHoraComSegundos(evento.em)}
            </time>
            {evento.rotulo !== null ? <span>{evento.rotulo}</span> : <span className="font-mono">{evento.nome}</span>}
          </li>
        ))}
      </ul>
    );
  }
  const { itens, restantes } = acoesPrincipais(no);
  if (itens.length === 0 && restantes === 0) return null;
  return (
    <ul aria-label={`Ações de ${no.rotulo}`} className={lista}>
      {itens.map((item, i) => (
        <li key={`${item.rotulo}-${i}`} className={`relative ${COR_DO_TEXTO[item.tipo]}`}>
          <Pontinho tipo={item.tipo} />
          {item.rotulo}
        </li>
      ))}
      {restantes > 0 ? (
        <li className="relative">
          <Link
            href={`${caminhoDoVisitante(visitante)}#visita-${ancora}`}
            className="font-medium text-primary-700 hover:underline"
          >
            {`+ ${plural(restantes, 'ação', 'ações')}`}
          </Link>
        </li>
      ) : null}
    </ul>
  );
}

function Legenda() {
  const bolinhas: Array<[string, string]> = [
    ['bg-primary-500 ring-4 ring-primary-100', 'Bolinha cheia: etapa do funil'],
    ['bg-white border-2 border-primary-500', 'Bolinha vazada: mudou de página'],
    ['bg-green-500 ring-4 ring-green-100', 'Bolinha verde: contratou'],
  ];
  const pontinhos: Array<[TipoDeEvento, string]> = [
    ['acao', 'Pontinho azul: ação'],
    ['erro', 'Pontinho âmbar: erro'],
    ['leitura', 'Pontinho cinza vazado: leitura'],
  ];
  return (
    <ul aria-label="Legenda da trajetória" className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
      {bolinhas.map(([forma, texto]) => (
        <li key={texto} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`block h-3 w-3 rounded-full ${forma}`} />
          {texto}
        </li>
      ))}
      {pontinhos.map(([tipo, texto]) => (
        <li key={texto} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`block h-2 w-2 rounded-full ${COR_DO_PONTINHO[tipo]}`} />
          {texto}
        </li>
      ))}
    </ul>
  );
}

export function TrajetoriaDaVisita({
  trajetoria,
  modo,
  visitante,
  ancora,
  pagou,
}: {
  trajetoria: Trajetoria;
  modo: Modo;
  visitante: string;
  ancora: string;
  pagou: boolean;
}) {
  const largura = modo === 'completo' ? 'w-[236px]' : 'w-[196px]';
  const { nos } = trajetoria;
  return (
    // contain: inline-size: a largura do gráfico não alarga a tabela nem a página; ele rola no próprio quadro.
    <div className="flex flex-col gap-3 [contain:inline-size]">
      <p className="text-sm font-medium text-slate-900">{resumoDaTrajetoria(trajetoria)}</p>
      <div role="group" aria-label="Trajetória da visita" tabIndex={0} className="overflow-x-auto pb-2">
        <ol aria-label="Trajetória da visita" className="flex w-max">
          {nos.map((no, i) => {
            const ultimo = i === nos.length - 1;
            return (
              <li key={`${no.inicio}-${i}`} className={`relative ${largura} shrink-0 pr-3`}>
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-900">
                  <span>{no.rotulo}</span>
                  <span className="sr-only">{no.tipo === 'etapa' ? 'etapa do funil' : 'página'}</span>
                  {no.rotulo === ROTULO_CONTRATOU && pagou ? <SeloPagamento pago /> : null}
                </p>
                <p className="text-xs tabular-nums text-slate-600">{informacaoDoNo(no, ultimo, modo)}</p>
                <div aria-hidden="true" className="my-2 flex items-center">
                  <Bolinha no={no} />
                  {ultimo ? null : <span className="ml-1 mr-0 block h-0.5 flex-1 bg-slate-300" />}
                </div>
                <AcoesDoNo no={no} modo={modo} visitante={visitante} ancora={ancora} />
              </li>
            );
          })}
        </ol>
      </div>
      {modo === 'completo' ? <Legenda /> : null}
    </div>
  );
}
