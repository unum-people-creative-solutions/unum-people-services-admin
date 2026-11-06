// Estados de cada seção da jornada (blueprint §6): esqueleto ao carregar e
// mensagem com "Tentar de novo" no erro. Uma seção que falha não derruba as outras.

export function EsqueletoDaSecao({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-5 rounded bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

export function ErroDaSecao({
  onTentar,
  mensagem = 'Não foi possível carregar.',
}: {
  onTentar: () => void;
  mensagem?: string;
}) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span>{mensagem}</span>
      <button
        type="button"
        onClick={onTentar}
        className="font-semibold underline underline-offset-2 hover:text-red-900"
      >
        Tentar de novo
      </button>
    </div>
  );
}
