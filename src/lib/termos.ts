import type { Term, TipoDeTermo } from '@/types/term';

// Os três tipos de termo da API, na ordem do formulário de criação.
export const TIPOS_DE_TERMO: ReadonlyArray<{ valor: TipoDeTermo; rotulo: string }> = [
  { valor: 'contratacao_servico', rotulo: 'Termo de contratação' },
  { valor: 'termos_uso', rotulo: 'Termos de uso' },
  { valor: 'politica_privacidade', rotulo: 'Política de privacidade' },
];

// Termo antigo sem tipo conta como contratação, a mesma regra da API.
export function tipoDoTermo(term: Pick<Term, 'type'>): TipoDeTermo {
  return term.type || 'contratacao_servico';
}

export function rotuloDoTipo(term: Pick<Term, 'type'>): string {
  const tipo = tipoDoTermo(term);
  return TIPOS_DE_TERMO.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

// Planos e tenants só vinculam termo de contratação ativo.
export function termosDeContratacaoAtivos(terms: readonly Term[]): Term[] {
  return terms.filter((t) => t.is_active && tipoDoTermo(t) === 'contratacao_servico');
}
