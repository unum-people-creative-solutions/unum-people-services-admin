'use client';

import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { AREAS_DE_ATUACAO } from '@/lib/areasDeAtuacao';

interface AreaDeAtuacaoSelectProps {
  registration: UseFormRegisterReturn;
  /** Valor já gravado na empresa. Se não estiver na lista, vira a opção "Valor antigo: ..." (RF-AA-06). */
  valorSalvo?: string | null;
  erro?: string;
  className?: string;
}

export function AreaDeAtuacaoSelect({ registration, valorSalvo, erro, className }: AreaDeAtuacaoSelectProps) {
  const id = useId();
  const valorAntigo = valorSalvo && !AREAS_DE_ATUACAO.includes(valorSalvo) ? valorSalvo : null;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">Área de atuação</label>
      <select id={id} {...registration} className={className}>
        <option value="">Selecione</option>
        {AREAS_DE_ATUACAO.map((area) => (
          <option key={area} value={area}>{area}</option>
        ))}
        {valorAntigo && <option value={valorAntigo}>{`Valor antigo: ${valorAntigo}`}</option>}
      </select>
      {erro && <span className="text-red-500 text-xs">{erro}</span>}
    </div>
  );
}
