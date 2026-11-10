import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlansPage from './page'
import { planService } from '@/services/planService'
import { termService } from '@/services/termService'
import type { Plan } from '@/types/tenant'
import type { Term } from '@/types/term'

// spec: planos-v2-marca-e-dominio RF-F02, RF-F03, RF-F04 (T10 e o card do T11); TECH-DESIGN T6.

vi.mock('@/services/planService', () => ({ planService: { listPlans: vi.fn(), createPlan: vi.fn(), updatePlan: vi.fn(), deletePlan: vi.fn() } }))
vi.mock('@/services/termService', () => ({ termService: { list: vi.fn() } }))

const ROTULO_MARCA = 'Esconder a assinatura Unum People na página publicada'
const ROTULO_DOMINIO = 'Sem domínio próprio (só o endereço unumpeople.app)'

const base = { descricao: '', activation_fee: 100, monthly_value: 99, included_services: ['crm'], is_active: true, cycle: 'mensal', term_id: 'term-1', product: 'plataforma', pages_included: 0, max_usuarios: 0, destaques: [], selo: '' }
// Plano gravado antes dos campos: chega sem os atributos (listPlans mockado não aplica defaults).
const semAtributos = { ...base, slug: 'captacao', nome: 'Captação' } as unknown as Plan
const comRestricoes = { ...base, slug: 'pagina', nome: 'Página', sem_marca: true, sem_dominio_proprio: true } as unknown as Plan
const semRestricoes = { ...base, slug: 'presenca', nome: 'Presença', sem_marca: false, sem_dominio_proprio: false } as unknown as Plan
// Planos reais são assimétricos (sem marca, com domínio): um só atributo verdadeiro por plano (validation N17).
const soSemMarca = { ...base, slug: 'vitrine', nome: 'Vitrine', sem_marca: true, sem_dominio_proprio: false } as unknown as Plan
const soSemDominio = { ...base, slug: 'essencial', nome: 'Essencial', sem_marca: false, sem_dominio_proprio: true } as unknown as Plan

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={qc}><PlansPage /></QueryClientProvider>)
}

function cartaoDe(nome: string): HTMLElement {
  const cabecalho = screen.getByRole('heading', { name: nome }).closest('div') as HTMLElement
  return cabecalho.parentElement as HTMLElement
}

describe('Planos — assinatura e domínio próprio por plano', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(planService.listPlans).mockResolvedValue({ active: [semAtributos, comRestricoes, semRestricoes], inactive: [] })
    vi.mocked(termService.list).mockResolvedValue([{ id: 'term-1', name: 'Termo', is_active: true } as unknown as Term])
    vi.mocked(planService.updatePlan).mockResolvedValue(semAtributos)
    vi.mocked(planService.createPlan).mockResolvedValue(semAtributos)
  })

  test('T10 — marcar só a assinatura envia sem_marca true e sem_dominio_proprio false', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Captação' }))
    const marca = await screen.findByLabelText(ROTULO_MARCA)
    expect(marca).not.toBeChecked()
    fireEvent.click(marca)
    expect(marca).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toMatchObject({ sem_marca: true, sem_dominio_proprio: false })
  })

  test('T10 — marcar só o domínio próprio envia sem_dominio_proprio true e sem_marca false', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Captação' }))
    const dominio = await screen.findByLabelText(ROTULO_DOMINIO)
    expect(dominio).not.toBeChecked()
    fireEvent.click(dominio)
    expect(dominio).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    const payload = vi.mocked(planService.updatePlan).mock.calls[0][1]
    expect(payload).toHaveProperty('sem_dominio_proprio', true)
    expect(payload).toHaveProperty('sem_marca', false)
  })

  test('T10 — editar plano com os dois atributos verdadeiros abre com os dois checkboxes marcados', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Página' }))
    expect(await screen.findByLabelText(ROTULO_MARCA)).toBeChecked()
    expect(screen.getByLabelText(ROTULO_DOMINIO)).toBeChecked()
  })

  test('T10 — salvar sem marcar nada envia os dois como false', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Captação' }))
    expect(await screen.findByLabelText(ROTULO_MARCA)).not.toBeChecked()
    expect(screen.getByLabelText(ROTULO_DOMINIO)).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    const payload = vi.mocked(planService.updatePlan).mock.calls[0][1]
    expect(payload).toMatchObject({ sem_marca: false, sem_dominio_proprio: false })
    expect(payload).toHaveProperty('sem_marca', false)
    expect(payload).toHaveProperty('sem_dominio_proprio', false)
  })

  // Validation M4/M5: os casos acima só passam por "Editar ..."; o formulário de
  // criação precisa de teste próprio dos valores iniciais e do payload sem toque.
  test('T10 — Novo Plano abre com assinatura e domínio próprio desmarcados', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo Plano' }))
    expect(await screen.findByRole('heading', { name: 'Criar Novo Plano' })).toBeInTheDocument()
    expect(screen.getByLabelText(ROTULO_MARCA)).not.toBeChecked()
    expect(screen.getByLabelText(ROTULO_DOMINIO)).not.toBeChecked()
  })

  test('T10 — criar preenchendo só o obrigatório, sem tocar nos checkboxes, envia os dois como false', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo Plano' }))
    await screen.findByRole('heading', { name: 'Criar Novo Plano' })
    fireEvent.change(screen.getByPlaceholderText('ex: basico_mensal'), { target: { value: 'novo' } })
    fireEvent.change(screen.getByPlaceholderText('ex: Básico Mensal'), { target: { value: 'Novo' } })
    fireEvent.change(screen.getByLabelText('Taxa de Adesão'), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText('Mensalidade'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Termo de Contratação'), { target: { value: 'term-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.createPlan).toHaveBeenCalled())
    expect(planService.updatePlan).not.toHaveBeenCalled()
    const payload = vi.mocked(planService.createPlan).mock.calls[0][0]
    expect(payload).toHaveProperty('sem_marca', false)
    expect(payload).toHaveProperty('sem_dominio_proprio', false)
  })

  test('T11 — o cartão mostra "Sem assinatura" e "Sem domínio próprio" só quando verdadeiros', async () => {
    renderizar()
    await screen.findByRole('heading', { name: 'Página' })

    const pagina = cartaoDe('Página')
    expect(within(pagina).getByText('Sem assinatura')).toBeInTheDocument()
    expect(within(pagina).getByText('Sem domínio próprio')).toBeInTheDocument()

    const presenca = cartaoDe('Presença')
    expect(within(presenca).queryByText('Sem assinatura')).toBeNull()
    expect(within(presenca).queryByText('Sem domínio próprio')).toBeNull()

    const captacao = cartaoDe('Captação')
    expect(within(captacao).queryByText('Sem assinatura')).toBeNull()
    expect(within(captacao).queryByText('Sem domínio próprio')).toBeNull()
  })

  test('T11 — atributos assimétricos: cada texto do cartão segue só o seu atributo', async () => {
    vi.mocked(planService.listPlans).mockResolvedValue({ active: [soSemMarca, soSemDominio], inactive: [] })
    renderizar()
    await screen.findByRole('heading', { name: 'Vitrine' })

    const vitrine = cartaoDe('Vitrine')
    expect(within(vitrine).getByText('Sem assinatura')).toBeInTheDocument()
    expect(within(vitrine).queryByText('Sem domínio próprio')).toBeNull()

    const essencial = cartaoDe('Essencial')
    expect(within(essencial).getByText('Sem domínio próprio')).toBeInTheDocument()
    expect(within(essencial).queryByText('Sem assinatura')).toBeNull()
  })
})
