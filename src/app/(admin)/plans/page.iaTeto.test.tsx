import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlansPage from './page'
import { planService } from '@/services/planService'
import { termService } from '@/services/termService'
import { ApiError } from '@/lib/apiError'
import type { Plan } from '@/types/tenant'
import type { Term } from '@/types/term'

// spec: configurador-com-ia TASK-ADM-301 (T30, CA-31); blueprint §9.4; RF-C-50, RF-C-51.

vi.mock('@/services/planService', () => ({ planService: { listPlans: vi.fn(), createPlan: vi.fn(), updatePlan: vi.fn(), deletePlan: vi.fn() } }))
vi.mock('@/services/termService', () => ({ termService: { list: vi.fn() } }))

const ROTULO = 'Editar com IA: teto por dia, em centavos'
const DICA = 'Vazio ou zero: o plano não tem Editar com IA. Exemplo: 20 = R$ 0,20 por dia.'

const base = { descricao: '', activation_fee: 100, monthly_value: 99, included_services: ['lp'], is_active: true, cycle: 'mensal', term_id: 'term-1', product: 'landing-page', pages_included: 1, max_usuarios: 0, destaques: [], selo: '', sem_marca: false, sem_dominio_proprio: false, plano_anual: '' }
const semIa = { ...base, slug: 'pagina', nome: 'Página', ia_teto_diario_centavos: 0 } as unknown as Plan
const comIa = { ...base, slug: 'presenca', nome: 'Presença', ia_teto_diario_centavos: 20 } as unknown as Plan
const tetoMaximo = { ...base, slug: 'captacao', nome: 'Captação', ia_teto_diario_centavos: 1000 } as unknown as Plan

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={qc}><PlansPage /></QueryClientProvider>)
}

function cartaoDe(nome: string): HTMLElement {
  const cabecalho = screen.getByRole('heading', { name: nome }).closest('div') as HTMLElement
  return cabecalho.parentElement as HTMLElement
}

describe('Planos — teto de "Editar com IA"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(planService.listPlans).mockResolvedValue({ active: [semIa, comIa, tetoMaximo], inactive: [] })
    vi.mocked(termService.list).mockResolvedValue([{ id: 'term-1', name: 'Termo', is_active: true } as unknown as Term])
    vi.mocked(planService.updatePlan).mockResolvedValue(semIa)
    vi.mocked(planService.createPlan).mockResolvedValue(semIa)
  })

  test('T30 — o campo é achado pelo rótulo, é número inteiro de 0 a 1000 e traz a dica', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo Plano' }))
    const campo = await screen.findByLabelText(ROTULO)
    expect(campo).toHaveAttribute('type', 'number')
    expect(campo).toHaveAttribute('min', '0')
    expect(campo).toHaveAttribute('max', '1000')
    expect(campo).toHaveAttribute('step', '1')
    expect(campo).not.toBeRequired()
    expect(campo).toHaveValue(null)
    expect(campo).toHaveAccessibleDescription(DICA)
  })

  test('T30 — digitar 20 e salvar manda ia_teto_diario_centavos: 20 no PUT', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Página' }))
    const campo = await screen.findByLabelText(ROTULO)
    fireEvent.change(campo, { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][0]).toBe('pagina')
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toHaveProperty('ia_teto_diario_centavos', 20)
  })

  test('T30 — editar plano com teto abre o campo com o valor; esvaziar e salvar manda 0', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Presença' }))
    const campo = await screen.findByLabelText(ROTULO)
    expect(campo).toHaveValue(20)
    fireEvent.change(campo, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toHaveProperty('ia_teto_diario_centavos', 0)
  })

  test('T30 — plano sem teto abre o campo vazio e salvar sem tocar manda 0', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Página' }))
    expect(await screen.findByLabelText(ROTULO)).toHaveValue(null)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toHaveProperty('ia_teto_diario_centavos', 0)
  })

  test('T30 — criar sem preencher o teto manda ia_teto_diario_centavos: 0 no POST', async () => {
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
    expect(vi.mocked(planService.createPlan).mock.calls[0][0]).toHaveProperty('ia_teto_diario_centavos', 0)
  })

  test('CA-31 — a lista mostra "IA: R$ 0,20 por dia" só no plano com teto', async () => {
    renderizar()
    await screen.findByRole('heading', { name: 'Presença' })
    expect(within(cartaoDe('Presença')).getByText('IA: R$ 0,20 por dia')).toBeInTheDocument()
    expect(within(cartaoDe('Captação')).getByText('IA: R$ 10,00 por dia')).toBeInTheDocument()
    expect(within(cartaoDe('Página')).queryByText(/^IA: R\$/)).toBeNull()
  })

  // A regra de 0 a 1000 é da API (RF-C-51). O min/max do campo só orienta o
  // navegador; o que vale é a recusa da API aparecer na tela.
  test('T30 — o 400 da API sobre o teto aparece no formulário', async () => {
    vi.mocked(planService.updatePlan).mockRejectedValueOnce(
      new ApiError('ia_teto_diario_centavos deve ser de 0 a 1000', 400, { error: 'ia_teto_diario_centavos deve ser de 0 a 1000' }),
    )
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Página' }))
    fireEvent.change(await screen.findByLabelText(ROTULO), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(await screen.findByRole('alert')).toHaveTextContent('ia_teto_diario_centavos deve ser de 0 a 1000')
    expect(screen.getByRole('heading', { name: 'Editar Plano — Página' })).toBeInTheDocument()
  })
})
