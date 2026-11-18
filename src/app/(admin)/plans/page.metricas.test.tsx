import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlansPage from './page'
import { planService } from '@/services/planService'
import { termService } from '@/services/termService'
import type { Plan } from '@/types/tenant'
import type { Term } from '@/types/term'

// spec: metricas-de-visitas TASK-ADM-302 (T40, CA-MV-38); MV-80, MV-81; contrato §3.7.

vi.mock('@/services/planService', () => ({ planService: { listPlans: vi.fn(), createPlan: vi.fn(), updatePlan: vi.fn(), deletePlan: vi.fn() } }))
vi.mock('@/services/termService', () => ({ termService: { list: vi.fn() } }))

const ROTULO = 'Contar visitas da página (tela Visitas no Portal)'
const ROTULO_MARCA = 'Esconder a assinatura Unum People na página publicada'
const SELO = 'Métricas de visitas'

const base = { descricao: '', activation_fee: 100, monthly_value: 99, included_services: ['lp'], is_active: true, cycle: 'mensal', term_id: 'term-1', product: 'landing-page', pages_included: 1, max_usuarios: 0, destaques: [], selo: '', sem_marca: false, sem_dominio_proprio: false, plano_anual: '', ia_teto_diario_centavos: 0 }
const semMetricas = { ...base, slug: 'pagina', nome: 'Página', metricas_de_visitas: false } as unknown as Plan
const comMetricas = { ...base, slug: 'presenca', nome: 'Presença', metricas_de_visitas: true } as unknown as Plan

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={qc}><PlansPage /></QueryClientProvider>)
}

function cartaoDe(nome: string): HTMLElement {
  const cabecalho = screen.getByRole('heading', { name: nome }).closest('div') as HTMLElement
  return cabecalho.parentElement as HTMLElement
}

describe('Planos — "Contar visitas da página"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(planService.listPlans).mockResolvedValue({ active: [semMetricas, comMetricas], inactive: [] })
    vi.mocked(termService.list).mockResolvedValue([{ id: 'term-1', name: 'Termo', is_active: true } as unknown as Term])
    vi.mocked(planService.updatePlan).mockResolvedValue(semMetricas)
    vi.mocked(planService.createPlan).mockResolvedValue(semMetricas)
  })

  test('T40 — Novo Plano abre com o checkbox desmarcado, logo depois de "Esconder a assinatura…"', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo Plano' }))
    const campo = await screen.findByLabelText(ROTULO)
    expect(campo).toHaveAttribute('type', 'checkbox')
    expect(campo).toHaveAttribute('id', 'metricas_de_visitas')
    expect(campo).not.toBeChecked()
    const caixas = screen.getAllByRole('checkbox')
    expect(caixas.indexOf(campo)).toBe(caixas.indexOf(screen.getByLabelText(ROTULO_MARCA)) + 1)
  })

  test('T40 — marcar e salvar manda metricas_de_visitas: true no PUT', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Página' }))
    const campo = await screen.findByLabelText(ROTULO)
    expect(campo).not.toBeChecked()
    fireEvent.click(campo)
    expect(campo).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][0]).toBe('pagina')
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toHaveProperty('metricas_de_visitas', true)
  })

  test('T40 — editar plano com o atributo abre o checkbox marcado; desmarcar e salvar manda false', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Presença' }))
    const campo = await screen.findByLabelText(ROTULO)
    expect(campo).toBeChecked()
    fireEvent.click(campo)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][0]).toBe('presenca')
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toHaveProperty('metricas_de_visitas', false)
  })

  test('T40 — plano que veio sem a chave abre desmarcado e salvar sem tocar manda false', async () => {
    const legado = { ...base, slug: 'antigo', nome: 'Antigo' } as unknown as Plan
    vi.mocked(planService.listPlans).mockResolvedValue({ active: [legado], inactive: [] })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Antigo' }))
    expect(await screen.findByLabelText(ROTULO)).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toHaveProperty('metricas_de_visitas', false)
  })

  test('T40 — criar sem marcar manda metricas_de_visitas: false no POST', async () => {
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
    expect(vi.mocked(planService.createPlan).mock.calls[0][0]).toHaveProperty('metricas_de_visitas', false)
  })

  test('T40 — criar marcando o checkbox manda metricas_de_visitas: true no POST', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Novo Plano' }))
    await screen.findByRole('heading', { name: 'Criar Novo Plano' })
    fireEvent.change(screen.getByPlaceholderText('ex: basico_mensal'), { target: { value: 'novo' } })
    fireEvent.change(screen.getByPlaceholderText('ex: Básico Mensal'), { target: { value: 'Novo' } })
    fireEvent.change(screen.getByLabelText('Taxa de Adesão'), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText('Mensalidade'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Termo de Contratação'), { target: { value: 'term-1' } })
    fireEvent.click(screen.getByLabelText(ROTULO))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.createPlan).toHaveBeenCalled())
    expect(vi.mocked(planService.createPlan).mock.calls[0][0]).toHaveProperty('metricas_de_visitas', true)
  })

  test('MV-81 — a lista mostra "Métricas de visitas" só no plano com o atributo', async () => {
    renderizar()
    await screen.findByRole('heading', { name: 'Presença' })
    expect(within(cartaoDe('Presença')).getByText(SELO)).toBeInTheDocument()
    expect(within(cartaoDe('Página')).queryByText(SELO)).toBeNull()
  })
})
