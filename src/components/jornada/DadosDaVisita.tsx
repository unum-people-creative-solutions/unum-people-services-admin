import type { VisitaJornada } from '@/types/jornada';
import { dadosDaVisita } from '@/lib/jornada';

// medicao-e-robustez MR-23: campanha, anúncio, navegador e pagamento da visita.
// Os valores (o termo vem do Google) entram como texto. Sem nenhum dado, nada aparece.
export function DadosDaVisita({ visita }: { visita: VisitaJornada }) {
  const itens = dadosDaVisita(visita);
  if (itens.length === 0) return null;
  return (
    <ul aria-label="Dados da visita" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      {itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
