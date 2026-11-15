import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlansPage from './page'
import { useAuthStore } from '@/store/useAuthStore'

// spec: oferta-e-primeira-tela OF-302, OF-303, OF-304 (T31); TECH-DESIGN B1 T4 e risco 3:
// o PUT /admin/plans/{id} substitui o plano inteiro, então plano_anual nunca falta no corpo.
// A tela passa pelo planService e pelo apiFetch de verdade; só o fetch é trocado.

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
vi.mock('amazon-cognito-identity-js', () => ({ CognitoUser: vi.fn(), CognitoUserPool: vi.fn(), CognitoRefreshToken: vi.fn() }))

const ROTULO = 'Plano anual do mesmo degrau'
const AJUDA = 'Mude o anual primeiro, depois o mensal. A API recusa um anual diferente deste plano em produto, serviços, páginas, assinatura, domínio, usuários ou termo.'
// OF-205: a frase fixa da recusa do par.
const RECUSA = 'o plano anual precisa existir, ser anual e ter o mesmo produto, serviços, páginas, assinatura, domínio próprio, usuários e termo deste plano'

// Forma de GET /admin/plans: planView (domain.Plan + tenant_count). OF-201: a chave plano_anual sempre vem.
function plano(slug: string, nome: string, cycle: 'mensal' | 'anual', extra: Record<string, unknown> = {}) {
  return {
    slug,
    nome,
    descricao: '',
    cycle,
    activation_fee: cycle === 'anual' ? 149 : 14.9,
    monthly_value: cycle === 'anual' ? 0 : 14.9,
    included_services: ['site'],
    product: 'landing-page',
    pages_included: 1,
    max_usuarios: 0,
    destaques: [],
    sem_marca: false,
    sem_dominio_proprio: false,
    is_active: true,
    term_id: 'termo-contratacao',
    plano_anual: '',
    created_at: '2026-11-09T12:00:00Z',
    updated_at: '2026-11-09T12:00:00Z',
    tenant_count: 0,
    ...extra,
  }
}

const PLANOS = {
  active: [
    plano('pagina', 'Plano Página', 'mensal', { plano_anual: 'pagina_anual' }),
    plano('pagina_anual', 'Plano Página Anual', 'anual'),
    plano('presenca', 'Plano Presença', 'mensal', { included_services: ['site', 'blog'], activation_fee: 39.9, monthly_value: 39.9 }),
    plano('presenca_anual', 'Plano Presença Anual', 'anual', { included_services: ['site', 'blog'], activation_fee: 399 }),
    // Lacuna 1 da validação F2/F3: par gravado fora das opções. O anual foi
    // excluído (vitrine_anual) ou teve o ciclo trocado para mensal (presenca).
    plano('vitrine', 'Plano Vitrine', 'mensal', { plano_anual: 'vitrine_anual' }),
    plano('legado', 'Plano Legado', 'mensal', { plano_anual: 'presenca' }),
  ],
  inactive: [
    plano('captacao_anual', 'Plano Captação Anual', 'anual', { is_active: false, activation_fee: 699 }),
  ],
}

const TERMOS = [
  { id: 'termo-contratacao', name: 'Termo de contratação', description: '', type: 'contratacao_servico', is_active: true, current_version: 4, created_at: '', updated_at: '' },
]

function resposta(status: number, corpo?: unknown) {
  return { ok: status < 300, status, json: async () => corpo, text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)) }
}

// Roteia por método e caminho; escrita devolve `escrita` (padrão: o próprio corpo enviado).
function api(escrita?: { status: number; corpo: unknown }) {
  mockFetch.mockImplementation(async (url: string, opcoes: RequestInit = {}) => {
    const metodo = opcoes.method ?? 'GET'
    const caminho = new URL(String(url)).pathname
    if (metodo === 'GET' && caminho.endsWith('/admin/plans')) return resposta(200, PLANOS)
    if (metodo === 'GET' && caminho.endsWith('/admin/terms')) return resposta(200, TERMOS)
    if (metodo === 'PUT' || metodo === 'POST') {
      if (escrita) return resposta(escrita.status, escrita.corpo)
      return resposta(metodo === 'POST' ? 201 : 200, JSON.parse(String(opcoes.body)))
    }
    return resposta(404, { error: 'rota fora do teste' })
  })
}

function escritas() {
  return mockFetch.mock.calls
    .filter(([, opcoes]) => opcoes?.method === 'PUT' || opcoes?.method === 'POST')
    .map(([url, opcoes]) => ({ metodo: opcoes.method as string, caminho: new URL(String(url)).pathname, corpo: JSON.parse(String(opcoes.body)) }))
}

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={qc}><PlansPage /></QueryClientProvider>)
}

async function editar(nome: string) {
  renderizar()
  fireEvent.click(await screen.findByRole('button', { name: `Editar ${nome}` }))
  await screen.findByRole('heading', { name: `Editar Plano — ${nome}` })
}

describe('Planos — plano anual do mesmo degrau', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    useAuthStore.setState({ user: { email: 'op@unum.com', groups: ['GlobalAdmin'] }, token: 't', refreshToken: 'r', isAuthenticated: true, isAdmin: true, hasHydrated: true })
    api()
  })

  test('editar um mensal ligado mostra o anual escolhido e só planos anuais, ativos e desativados', async () => {
    await editar('Plano Página')
    const campo = screen.getByRole('combobox', { name: ROTULO })
    expect(campo).toHaveDisplayValue('Plano Página Anual (pagina_anual)')
    expect(within(campo).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Sem plano anual',
      'Plano Página Anual (pagina_anual)',
      'Plano Presença Anual (presenca_anual)',
      'Plano Captação Anual (captacao_anual)',
    ])
    expect(within(campo).getByRole('option', { name: 'Sem plano anual' })).toHaveValue('')
    expect(screen.getByText(AJUDA)).toBeInTheDocument()
    expect(campo).toHaveAccessibleDescription(AJUDA)
  })

  test('o campo vem depois do Termo de Contratação', async () => {
    await editar('Plano Página')
    const termo = screen.getByRole('combobox', { name: 'Termo de Contratação' })
    const campo = screen.getByRole('combobox', { name: ROTULO })
    expect(termo.compareDocumentPosition(campo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('mensal sem ligação abre com "Sem plano anual"', async () => {
    await editar('Plano Presença')
    expect(screen.getByRole('combobox', { name: ROTULO })).toHaveDisplayValue('Sem plano anual')
  })

  test('salvar um mensal ligado sem mexer reenvia o mesmo plano_anual no PUT', async () => {
    await editar('Plano Página')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    const [put] = escritas()
    expect(put.metodo).toBe('PUT')
    expect(put.caminho).toMatch(/\/admin\/plans\/pagina$/)
    expect(put.corpo).toHaveProperty('plano_anual', 'pagina_anual')
  })

  test('mensal sem ligação envia plano_anual vazio, nunca sem a chave', async () => {
    await editar('Plano Presença')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0].corpo).toHaveProperty('plano_anual', '')
  })

  test('escolher outro anual envia o slug escolhido', async () => {
    await editar('Plano Presença')
    fireEvent.change(screen.getByRole('combobox', { name: ROTULO }), { target: { value: 'presenca_anual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0].corpo).toHaveProperty('plano_anual', 'presenca_anual')
  })

  test('trocar o ciclo para anual esconde o campo e envia plano_anual vazio', async () => {
    await editar('Plano Página')
    fireEvent.change(screen.getByRole('combobox', { name: 'Ciclo' }), { target: { value: 'anual' } })
    await waitFor(() => expect(screen.queryByRole('combobox', { name: ROTULO })).toBeNull())
    expect(screen.queryByText(AJUDA)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0].corpo).toHaveProperty('plano_anual', '')
  })

  test('editar um anual não mostra o campo e envia plano_anual vazio', async () => {
    await editar('Plano Página Anual')
    expect(screen.queryByRole('combobox', { name: ROTULO })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0].corpo).toHaveProperty('plano_anual', '')
  })

  test('criar plano novo abre com "Sem plano anual" e envia plano_anual vazio no POST', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo Plano' }))
    await screen.findByRole('heading', { name: 'Criar Novo Plano' })
    expect(screen.getByRole('combobox', { name: ROTULO })).toHaveDisplayValue('Sem plano anual')
    fireEvent.change(screen.getByPlaceholderText('ex: basico_mensal'), { target: { value: 'novo' } })
    fireEvent.change(screen.getByPlaceholderText('ex: Básico Mensal'), { target: { value: 'Novo' } })
    fireEvent.change(screen.getByLabelText('Taxa de Adesão'), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText('Mensalidade'), { target: { value: '100' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Termo de Contratação' }), { target: { value: 'termo-contratacao' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    const [post] = escritas()
    expect(post.metodo).toBe('POST')
    expect(post.caminho).toMatch(/\/admin\/plans$/)
    expect(post.corpo).toHaveProperty('plano_anual', '')
  })

  test.each([
    ['Plano Vitrine', 'vitrine_anual', 'anual excluído'],
    ['Plano Legado', 'presenca', 'ciclo trocado para mensal'],
  ])('editar %s com par fora das opções mostra "{slug} (não encontrado)" marcado (%s, %s)', async (nome, slug) => {
    await editar(nome)
    const campo = screen.getByRole('combobox', { name: ROTULO })
    const orfa = within(campo).getByRole('option', { name: `${slug} (não encontrado)`, selected: true })
    expect(orfa).toHaveValue(slug)
    expect(campo).toHaveDisplayValue(`${slug} (não encontrado)`)
    // O operador vê o valor e troca: "Sem plano anual" vai no PUT.
    fireEvent.change(campo, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0].corpo).toHaveProperty('plano_anual', '')
  })

  test('a recusa 400 do par aparece no alerta do formulário com a frase da API', async () => {
    api({ status: 400, corpo: { error: RECUSA } })
    await editar('Plano Presença')
    fireEvent.change(screen.getByRole('combobox', { name: ROTULO }), { target: { value: 'pagina_anual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(RECUSA)
    // O formulário continua aberto para corrigir.
    expect(screen.getByRole('heading', { name: 'Editar Plano — Plano Presença' })).toBeInTheDocument()
  })
})
