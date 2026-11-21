import type { OrigemDaMontagem } from '@/lib/jornada';

// Selos da jornada (blueprint §3.4 e §4). Todos com texto, sem depender só de cor.

export function SeloPagamento({ pago }: { pago: boolean }) {
  return pago ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Pagou
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
      Não pagou
    </span>
  );
}

// O mesmo selo da lista de tenants.
export function SeloTeste() {
  return (
    <span
      role="img"
      aria-label="Visita de teste"
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
    >
      Teste
    </span>
  );
}

export function SeloUsouEditor() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
      Usou o editor
    </span>
  );
}

const ROTULO_MONTAGEM: Record<OrigemDaMontagem, { texto: string; classe: string }> = {
  ia: { texto: 'IA', classe: 'bg-emerald-100 text-emerald-800' },
  reserva: { texto: 'Reserva (falha IA)', classe: 'bg-amber-100 text-amber-800 border border-amber-200' },
  modelo_pronto: { texto: 'Modelo pronto', classe: 'bg-slate-100 text-slate-700' },
};

export function SeloMontagem({ tipo }: { tipo: OrigemDaMontagem }) {
  const { texto, classe } = ROTULO_MONTAGEM[tipo];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${classe}`}>
      {texto}
    </span>
  );
}

export function SeloEditou() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
      Editou
    </span>
  );
}

export function SeloAberturas({ quantidade }: { quantidade: number }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
      {quantidade} aberturas
    </span>
  );
}
