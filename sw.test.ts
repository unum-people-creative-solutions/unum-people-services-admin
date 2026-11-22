import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

describe('service worker endpoint', () => {
  it('serves an explicit no-op service worker for browsers with stale registrations', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js')

    expect(fs.existsSync(swPath)).toBe(true)
    expect(fs.readFileSync(swPath, 'utf8')).toContain('self.addEventListener')
  })
})

// RF-EM-20: o mesmo arquivo atende registros antigos (sem corpo no fetch) e o push de erros.
type Ouvinte = (evento: Record<string, unknown>) => void

function carregarSw() {
  const ouvintes: Record<string, Ouvinte> = {}
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const openWindow = vi.fn().mockResolvedValue(undefined)
  const matchAll = vi.fn().mockResolvedValue([])
  const claim = vi.fn().mockResolvedValue(undefined)
  const skipWaiting = vi.fn()
  const fakeSelf = {
    location: { origin: 'https://admin.unumpeople.com.br' },
    registration: { showNotification },
    clients: { openWindow, matchAll, claim },
    skipWaiting,
    addEventListener: (tipo: string, fn: Ouvinte) => {
      ouvintes[tipo] = fn
    },
  }
  const codigo = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8')
  new Function('self', codigo)(fakeSelf)
  return { ouvintes, showNotification, openWindow, matchAll, claim, skipWaiting }
}

function eventoPush(payload?: unknown) {
  const esperas: Promise<unknown>[] = []
  return {
    evento: {
      data: payload === undefined ? null : { text: () => (typeof payload === 'string' ? payload : JSON.stringify(payload)) },
      waitUntil: (p: Promise<unknown>) => esperas.push(p),
    },
    esperas,
  }
}

function eventoClique(url?: string) {
  const esperas: Promise<unknown>[] = []
  const close = vi.fn()
  return {
    evento: {
      notification: { close, data: url === undefined ? undefined : { url } },
      waitUntil: (p: Promise<unknown>) => esperas.push(p),
    },
    esperas,
    close,
  }
}

describe('service worker - push de erros', () => {
  it('mantém o comportamento antigo: skipWaiting, clients.claim e fetch sem corpo', async () => {
    const sw = carregarSw()
    sw.ouvintes.install({})
    expect(sw.skipWaiting).toHaveBeenCalled()
    const esperas: Promise<unknown>[] = []
    sw.ouvintes.activate({ waitUntil: (p: Promise<unknown>) => esperas.push(p) })
    await Promise.all(esperas)
    expect(sw.claim).toHaveBeenCalled()
    expect(sw.ouvintes.fetch({})).toBeUndefined()
  })

  it('push mostra a notificação com title, body e url do payload', async () => {
    const sw = carregarSw()
    const { evento, esperas } = eventoPush({ title: 'Erro em lp-ia', body: 'Veja o Monitoramento', url: '/dashboard/errors?service=lp-ia' })
    sw.ouvintes.push(evento)
    await Promise.all(esperas)
    expect(sw.showNotification).toHaveBeenCalledWith(
      'Erro em lp-ia',
      expect.objectContaining({ body: 'Veja o Monitoramento', data: { url: '/dashboard/errors?service=lp-ia' } }),
    )
  })

  it('push sem corpo ou com JSON inválido ainda mostra um aviso apontando para o Monitoramento', async () => {
    for (const payload of [undefined, 'isto não é json']) {
      const sw = carregarSw()
      const { evento, esperas } = eventoPush(payload)
      sw.ouvintes.push(evento)
      await Promise.all(esperas)
      expect(sw.showNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ data: { url: '/dashboard/errors' } }),
      )
    }
  })

  it('o clique fecha a notificação e abre /dashboard/errors quando não há janela aberta', async () => {
    const sw = carregarSw()
    const { evento, esperas, close } = eventoClique('/dashboard/errors')
    sw.ouvintes.notificationclick(evento)
    await Promise.all(esperas)
    expect(close).toHaveBeenCalled()
    expect(sw.openWindow).toHaveBeenCalledWith('https://admin.unumpeople.com.br/dashboard/errors')
  })

  it('o clique sem url no payload cai em /dashboard/errors', async () => {
    const sw = carregarSw()
    const { evento, esperas } = eventoClique()
    sw.ouvintes.notificationclick(evento)
    await Promise.all(esperas)
    expect(sw.openWindow).toHaveBeenCalledWith('https://admin.unumpeople.com.br/dashboard/errors')
  })

  it('o clique nunca sai do domínio: url de outro site vira /dashboard/errors', async () => {
    const sw = carregarSw()
    const { evento, esperas } = eventoClique('https://malicioso.example/phishing')
    sw.ouvintes.notificationclick(evento)
    await Promise.all(esperas)
    expect(sw.openWindow).toHaveBeenCalledWith('https://admin.unumpeople.com.br/dashboard/errors')
  })

  it('o clique foca e navega a janela já aberta do admin em vez de abrir outra', async () => {
    const sw = carregarSw()
    const focus = vi.fn().mockResolvedValue(undefined)
    const navigate = vi.fn().mockResolvedValue({ focus })
    sw.matchAll.mockResolvedValue([{ url: 'https://admin.unumpeople.com.br/dashboard', navigate, focus }])
    const { evento, esperas } = eventoClique('/dashboard/errors')
    sw.ouvintes.notificationclick(evento)
    await Promise.all(esperas)
    expect(navigate).toHaveBeenCalledWith('https://admin.unumpeople.com.br/dashboard/errors')
    expect(focus).toHaveBeenCalled()
    expect(sw.openWindow).not.toHaveBeenCalled()
  })
})
