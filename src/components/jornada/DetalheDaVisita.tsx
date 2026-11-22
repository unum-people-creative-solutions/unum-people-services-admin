import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { jornadaService } from '@/services/jornadaService';
import { caminhoDoVisitante } from '@/lib/jornada';
import { trajetoriaDaVisita } from '@/lib/trajetoria';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';
import { TrajetoriaDaVisita } from './TrajetoriaDaVisita';

// Mora em lib/jornada para os componentes puros (TrajetoriaDaVisita) não puxarem o serviço de API.
export { caminhoDoVisitante };

// spec-4-detalhe RF-4-24: conteúdo da linha aberta. Cache por visitante; o Atualizar invalida.
export function DetalheDaVisita({
  visitante,
  visita,
  pagou,
}: {
  visitante: string;
  visita: string | readonly string[];
  pagou: boolean;
}) {
  const consulta = useQuery({
    queryKey: ['jornada-visitante', visitante],
    queryFn: () => jornadaService.visitante(visitante),
    staleTime: Infinity,
  });

  const trajetoria = useMemo(
    () => (consulta.data ? trajetoriaDaVisita(consulta.data.eventos, visita) : null),
    [consulta.data, visita],
  );
  // RF-JT-31: a âncora é a 1ª visita da linha (na consolidada, a primeira de visitasAgrupadas).
  const ancora = typeof visita === 'string' ? visita : visita[0];

  const carregando = consulta.isPending || (consulta.isError && consulta.isFetching);

  return (
    <div role="group" aria-label="Resumo da visita" aria-busy={carregando} className="flex flex-col gap-3">
      {carregando ? (
        <EsqueletoDaSecao linhas={3} />
      ) : consulta.isError ? (
        <ErroDaSecao mensagem="Não foi possível carregar esta visita." onTentar={() => void consulta.refetch()} />
      ) : (
        <>
          {trajetoria ? (
            <TrajetoriaDaVisita
              trajetoria={trajetoria}
              modo="resumo"
              visitante={visitante}
              ancora={ancora}
              pagou={pagou}
            />
          ) : (
            <p className="text-sm text-slate-500">Nenhum evento registrado nesta visita.</p>
          )}
          <Link
            href={`${caminhoDoVisitante(visitante)}#visita-${ancora}`}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
          >
            Ver todas as ações desta visita
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </>
      )}
    </div>
  );
}
