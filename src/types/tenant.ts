import type { AcessosDoUsuario, MudancasDeAcesso } from './acesso';
export type TenantStatus = 'aguardando_ativacao' | 'ativo' | 'inadimplente' | 'suspenso' | 'pausado' | 'cancelado' | 'pendente_asaas';
export type PlanCycle = 'mensal' | 'anual';
export type PlanType = 'pago' | 'personalizado' | 'livre';
export type PlanProduct = 'plataforma' | 'landing-page';

export interface Plan {
  slug: string;
  nome: string;
  descricao: string;
  activation_fee: number;
  monthly_value: number;
  included_services: string[];
  is_active: boolean;
  cycle: PlanCycle;
  term_id?: string;
  tenant_count?: number;
  created_at?: string;
  updated_at?: string;
  // Leitura tolerante (RF-F1-01): o backend serializa product sem omitempty,
  // então plano legado chega como product="" (nunca com a chave ausente).
  // String vazia e ausência equivalem a product='plataforma'. 0 é valor
  // legítimo de pages_included para plano plataforma.
  product?: PlanProduct | '';
  pages_included?: number;
  // gestao-de-acesso-f2 RF-01: 0 ou ausente = sem limite de usuários.
  max_usuarios?: number;
  // Destaques e selo do card do plano (feature plano-destaques). Ausentes em
  // plano gravado antes do campo; a leitura (planService) entrega [] e ''.
  destaques?: string[];
  selo?: string;
  // planos-v2-marca-e-dominio RF-F01: restrições do plano. Ausentes em plano
  // gravado antes dos campos; a leitura (planService) entrega false.
  sem_marca?: boolean;
  sem_dominio_proprio?: boolean;
  // oferta-e-primeira-tela OF-301: slug do plano anual do mesmo degrau (só em
  // mensal). A API sempre traz a chave; a leitura (planService) entrega ''.
  plano_anual?: string;
  // configurador-com-ia RF-C-50: teto diário de "Editar com IA", em centavos
  // (0 a 1000). A API grava com omitempty: ausente = 0 = plano sem IA. A
  // leitura (planService) entrega 0.
  ia_teto_diario_centavos?: number;
  // metricas-de-visitas MV-82 (spec §3.7): liga a contagem de visitas das
  // páginas e a tela Visitas no Portal. Ausente em plano gravado antes do
  // campo; a leitura (planService) entrega false.
  metricas_de_visitas?: boolean;
}

export interface Contract {
  plan_id: string;
  plan_type: PlanType;
  term_id?: string;
  activation_fee: number;
  monthly_value: number;
  activation_billing_type?: 'pix' | 'credit_card';
  subscription_billing_type?: 'pix' | 'credit_card';
  asaas_customer_id?: string;
  activation_invoice_url?: string;
  subscription_invoice_url?: string;
  subscription_url_state?: 'aguardando_ativacao' | 'gerando' | 'disponivel' | 'erro';
  // Data paga até (AAAA-MM-DD; json omitempty): ausente antes do 1º pagamento.
  paid_until?: string;
  created_at: string;
}

export interface Invoice {
  asaas_invoice_id: string;
  asaas_payment_id?: string;
  asaas_subscription_id?: string;
  status: 'SCHEDULED' | 'SYNCHRONIZED' | 'AUTHORIZED' | 'ERROR';
  pdf_url?: string;
  xml_url?: string;
  municipal_service_id?: string;
  error_reason?: string;
  effective_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Site {
  site_id: string;
  slug: string;
  // fix-achados-2b-3-5 (2b): status derivado do tenant pela API
  // (domain.SiteStatusForTenant), o mesmo do Portal.
  status: 'no_ar' | 'aguardando_ativacao' | 'suspenso' | 'cancelado';
  url: string;
  layout_id: string;
  theme_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface SiteDetail extends Site {
  schema_version: number;
  content: Record<string, unknown>;
  contact: Record<string, unknown>;
  seo: Record<string, unknown>;
  hidden_sections?: string[];
}

// RF-AP-60 (spec acesso-antes-do-pagamento) e `sitePreviaConfig` em internal/handler/admin_handler.go
// (API): content e contact são sempre objetos (nunca nulos), hidden_sections é sempre array, e
// section_order e cta só vêm quando não vazios (omitempty no Go).
export interface SitePreviaConfig {
  schema_version: number;
  layout_id: string;
  theme_id: string;
  content: Record<string, unknown>;
  contact: Record<string, unknown>;
  hidden_sections: string[];
  section_order?: string[];
  cta?: Record<string, unknown>;
}

// RF-AP-60: GET /admin/tenants/{id}/sites/{site_id}/previa
export interface SitePrevia {
  status: Site['status'];
  publicada: SitePreviaConfig;
  // null literal quando a página não tem rascunho (a chave sempre vem).
  rascunho: SitePreviaConfig | null;
}

export interface ServiceAgreementStatus {
  tenant_id: string;
  term_id: string;
  term_name?: string;
  document_url?: string;
  required_version: number;
  status: 'pendente' | 'aceito';
  accepted_version?: number;
  accepted_at?: string;
  accepted_by?: string;
  ip_address?: string;
  user_agent?: string;
  updated_at?: string;
}

export interface EnderecoDoNegocio {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade?: string;
  uf?: string;
}

export interface Tenant {
  id: string;
  api_key: string;
  nome_negocio: string;
  email_contato: string;
  documento: string;
  nicho: string;
  // dados-do-negocio (RF-DNG-19, RF-DNG-22)
  celular?: string;
  endereco?: EnderecoDoNegocio | null;
  endereco_pendente?: boolean;
  /** @deprecated Use `site_urls`. Mantido para convivência com leitores ainda não migrados. */
  site_url?: string;
  site_urls?: string[];
  slug?: string;
  enabled_services?: string[];
  google_ads_customer_id?: string;
  ads_conversion_action_id?: string;
  ads_recurring_conversion_action_id?: string;
  use_mcc_auth: boolean;
  status: TenantStatus;
  /** Unix do início do dia em que um cancelamento agendado vira terminal. */
  cancel_at?: number;
  plan_id: string;
  plan_type?: PlanType;
  plan_status?: TenantStatus; // Mantido para retrocompatibilidade se necessário
  plan_value: number;
  plan_cycle: PlanCycle;
  activated_at: string;
  next_billing_at: string;
  renewal_at: string;
  is_blocked: boolean;
  created_at: string;
  contract?: Contract;
  agreement?: ServiceAgreementStatus;
  asaas_subscription_id?: string;
  delinquency_since?: string;
  is_test_tenant?: boolean;
  activation_billing_type?: 'pix' | 'credit_card';
  subscription_billing_type?: 'pix' | 'credit_card';
}

export interface CreateTenantInput {
  nome_negocio: string;
  nome_admin: string;
  email_contato: string;
  documento: string;
  nicho: string;
  /** @deprecated Use `site_urls`. Mantido para convivência com leitores ainda não migrados. */
  site_url?: string;
  site_urls?: string[];
  slug?: string;
  enabled_services?: string[];
  google_ads_customer_id?: string;
  use_mcc_auth: boolean;
  plan_id: string;
  plan_type?: PlanType;
  activation_fee?: number;
  monthly_value?: number;
  plan_cycle: PlanCycle;
  activation_billing_type?: 'pix' | 'credit_card';
  subscription_billing_type?: 'pix' | 'credit_card';
  is_test_tenant?: boolean;
  term_id?: string;
  // dados-do-negocio (RF-DNG-21, RF-DNG-23)
  postal_code?: string;
  address?: string;
  address_number?: string;
  complement?: string;
  province?: string;
  mobile_phone?: string;
  celular?: string;
  endereco?: EnderecoDoNegocio | null;
}

export interface TenantUser {
  email: string;
  name: string;
  created_at: string;
  // gestao-de-acesso-f2 RF-06: status do vínculo e papel efetivo por ferramenta.
  status: 'ativo' | 'bloqueado';
  acessos: AcessosDoUsuario;
}

export interface AddTenantUserInput {
  email: string;
  name: string;
  // gestao-de-acesso-f5 RF-09: o convite manda só os acessos, com o Portal.
  acessos: MudancasDeAcesso;
}

export interface ChangePlanInput {
  plan_id: string;
  plan_type: PlanType;
  monthly_value: number;
  activation_fee: number;
  activation_billing_type?: 'pix' | 'credit_card';
  subscription_billing_type?: 'pix' | 'credit_card';
  plan_cycle?: 'mensal' | 'anual';
  enabled_services?: string[];
  term_id?: string;
}

