import Link from 'next/link';

// Nome da empresa contratante com link para o tenant (spec-2-painel P3).
// Tenant que não existe mais chega com nome vazio: sem link, com o id para conferência.
export function EmpresaContratante({ tenantId, nome, className }: { tenantId: string; nome: string; className: string }) {
  if (nome.trim() === '') {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-2">
        <span className="text-slate-500">Empresa removida</span>
        <span className="font-mono text-[11px] text-slate-400">{tenantId}</span>
      </span>
    );
  }
  return (
    <Link href={`/tenants/${encodeURIComponent(tenantId)}`} className={className}>
      {nome}
    </Link>
  );
}
