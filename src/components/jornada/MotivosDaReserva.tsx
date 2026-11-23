import { MOTIVOS_DA_RESERVA, PREFIXO_FAIXA_DO_TOKEN, medianaDasFaixas } from '@/lib/jornada';
import { EsqueletoDaSecao, ErroDaSecao } from './EstadoDaSecao';

interface MotivosDaReservaProps {
  // Visitas por evento, já filtradas por origem e aparelho; undefined enquanto carrega ou no erro.
  uso: Record<string, number> | undefined;
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
}

// medicao-de-mercado RF-MM-2d: por que a montagem caiu no modelo reserva e quanto o token anti-robô demora.
export function MotivosDaReserva({ uso, carregando, erro, onTentar }: MotivosDaReservaProps) {
  const contar = (evento: string) => uso?.[evento] ?? 0;
  const reservas = contar('lp_site_montado_reserva');
  const motivos = MOTIVOS_DA_RESERVA.filter((m) => contar(m.evento) > 0);
  const mediana = uso === undefined ? null : medianaDasFaixas(uso, PREFIXO_FAIXA_DO_TOKEN);
  const semReserva = reservas === 0 && motivos.length === 0;

  return (
    <section
      aria-labelledby="titulo-motivos-reserva"
      aria-busy={carregando}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 id="titulo-motivos-reserva" className="font-bold text-slate-900">
          Motivos da reserva
        </h2>
      </div>
      <div className="p-4">
        {carregando ? (
          <EsqueletoDaSecao linhas={4} />
        ) : erro || uso === undefined ? (
          <ErroDaSecao onTentar={onTentar} />
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            {semReserva ? (
              <p className="py-2 text-center text-slate-500">Nenhuma reserva no período.</p>
            ) : (
              <>
                <p className="text-slate-700">Visitas que caíram na reserva: {reservas}</p>
                {motivos.length > 0 ? (
                  <ul aria-label="Motivos" className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4">
                    {motivos.map((m) => (
                      <li key={m.evento} className="flex items-center justify-between gap-3">
                        <span className="text-slate-700">{m.rotulo}</span>
                        <span className="font-semibold text-slate-900 tabular-nums">{contar(m.evento)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
            {mediana !== null ? (
              <p className="text-slate-700">
                Tempo mediano do token anti-robô: {mediana === 'mais de 30' ? 'mais de 30 s' : `${mediana} s`}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
