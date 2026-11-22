import '@testing-library/jest-dom'
import { afterEach } from 'vitest'

// Nenhum teste fala com a rede de verdade. A resposta real chega num tempo que o teste não controla:
// às vezes depois que o arquivo terminou, e o setState do componente estoura "window is not defined"
// (CI do admin#117). Quem precisa de rede simula o serviço ou instala o próprio fetch.
const chamadasDeRede: string[] = []
globalThis.fetch = ((input: RequestInfo | URL) => {
  const url = input instanceof Request ? input.url : String(input)
  chamadasDeRede.push(url)
  return Promise.reject(new TypeError(`teste chamou a rede real: ${url}`))
}) as typeof fetch

afterEach(() => {
  const feitas = chamadasDeRede.splice(0)
  if (feitas.length > 0) {
    throw new Error(`O teste chamou a rede real; simule o serviço: ${feitas.join(', ')}`)
  }
})
