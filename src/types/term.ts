export type TipoDeTermo = 'contratacao_servico' | 'termos_uso' | 'politica_privacidade';

export interface Term {
  id: string;
  name: string;
  description: string;
  // Vazio em termos antigos: conta como contratacao_servico (lib/termos.ts).
  type: TipoDeTermo | '';
  is_active: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
  // Só em GET /admin/terms: por que o termo não pode ser excluído, ou null.
  bloqueio_exclusao?: 'aceites' | 'plano_ativo' | null;
}

export interface TermVersion {
  term_id: string;
  version_number: number;
  content_md_s3_key: string;
  content_html_s3_key: string;
  content_hash: string;
  published_by: string;
  published_at: string;
  changelog: string;
  content_html_url?: string;
}

export interface CreateTermInput {
  name: string;
  description: string;
  type: TipoDeTermo;
}

export interface UpdateTermInput {
  name: string;
  description: string;
  is_active: boolean;
}

export interface PublishTermVersionInput {
  content_md: string;
  changelog?: string;
}
