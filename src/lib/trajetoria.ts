// jornada-trajetoria RF-JT-10..17: a trajetória de uma visita (nós, tempos, voltas) a partir dos eventos crus.
// Funções puras; a tela não faz conta própria.
import type { EventoJornada, InstanteMs } from '@/types/jornada';
import {
  DESDE_ENTRADA_COM_IA,
  ROLAGEM,
  ROTULOS_ETAPAS,
  ROTULOS_ETAPAS_ENTRADA_COM_IA,
  eventosDaLinhaDoTempo,
  instanteDoCorte,
  rotuloDaRota,
  rotuloDoEvento,
} from './jornada';

export interface EventoDoNo {
  em: InstanteMs;
  nome: string;
  rotulo: string | null;
  tipo: 'acao' | 'erro' | 'leitura';
}

export interface NoDaTrajetoria {
  tipo: 'etapa' | 'pagina';
  rotulo: string;
  caminho: string;
  inicio: InstanteMs;
  segundos: number;
  volta: boolean;
  rolagem: 25 | 50 | 75 | 100 | null;
  eventos: EventoDoNo[];
}

export interface Trajetoria {
  inicio: InstanteMs;
  fim: InstanteMs;
  duracaoMs: number;
  nos: NoDaTrajetoria[];
  voltas: number;
}

const PAGINA_DE_PASSAGEM = '/configurar';
const CAMINHO_DA_PREVIA = '/configurar/preview';
const PREFIXO_SITE_MONTADO = 'lp_site_montado_';

// Marcos das duas séries (tabela etapasJornada da API, sem lp_page_view). Os rótulos de "Visitou" até "Contratou"
// vêm das tabelas de jornada.ts; os dois "Abriu/Enviou a contratação" e "Contratou" são iguais nas duas séries.
const MARCOS_DA_SERIE_NOVA: Record<string, string> = {
  lp_janela_aberta: ROTULOS_ETAPAS_ENTRADA_COM_IA[1],
  lp_janela_enviada: ROTULOS_ETAPAS_ENTRADA_COM_IA[2],
  lp_site_montado_ia: ROTULOS_ETAPAS_ENTRADA_COM_IA[3],
  lp_site_montado_reserva: ROTULOS_ETAPAS_ENTRADA_COM_IA[3],
  lp_site_montado_modelo_pronto: ROTULOS_ETAPAS_ENTRADA_COM_IA[3],
  lp_checkout_opened: ROTULOS_ETAPAS_ENTRADA_COM_IA[4],
  lp_checkout_submitted: ROTULOS_ETAPAS_ENTRADA_COM_IA[5],
  lp_checkout_succeeded: ROTULOS_ETAPAS_ENTRADA_COM_IA[6],
};

const MARCOS_SO_DA_SERIE_ANTIGA: Record<string, string> = {
  lp_config_started: ROTULOS_ETAPAS[1],
  lp_topo_comecou: 'Começou',
  lp_selection_completed: ROTULOS_ETAPAS[2],
  lp_first_edit: ROTULOS_ETAPAS[3],
  lp_preview_opened: ROTULOS_ETAPAS[4],
};

// RF-JT-13: medição passiva nunca abre nó.
const PREFIXOS_PASSIVOS = [
  'lp_tempo_',
  'lp_rolagem_',
  'lp_secao_',
  'lp_previa_secao_',
  'lp_campo_contratar_',
  'lp_verificacao_token',
];
const MINIATURA_ROLAGEM = /^lp_mini_.+_rolagem_/;

function ehMedicaoPassiva(nome: string): boolean {
  return PREFIXOS_PASSIVOS.some((p) => nome.startsWith(p)) || MINIATURA_ROLAGEM.test(nome);
}

// RF-JT-13 (conferência visual, 21/11): só as medições mandadas ao sair da página ou do campo chegam atrasadas e
// voltam para o nó de onde vieram. Rolagem, seções, miniatura e token acontecem com a pessoa na página.
function ehMedicaoDeSaida(nome: string): boolean {
  return nome === 'lp_tempo_na_pagina' || nome.startsWith('lp_campo_contratar_');
}

function tipoDoEvento(nome: string): EventoDoNo['tipo'] {
  if (nome.startsWith('lp_erro_')) return 'erro';
  if (nome === 'lp_page_view' || ehMedicaoPassiva(nome)) return 'leitura';
  return 'acao';
}

function paraEventoDoNo(evento: EventoJornada): EventoDoNo {
  return { em: evento.em, nome: evento.nome, rotulo: rotuloDoEvento(evento), tipo: tipoDoEvento(evento.nome) };
}

function novoNo(tipo: NoDaTrajetoria['tipo'], rotulo: string, evento: EventoJornada, volta: boolean): NoDaTrajetoria {
  return { tipo, rotulo, caminho: evento.caminho, inicio: evento.em, segundos: 0, volta, rolagem: null, eventos: [] };
}

function juntar(no: NoDaTrajetoria, evento: EventoJornada): void {
  no.eventos.push(paraEventoDoNo(evento));
  if (Object.hasOwn(ROLAGEM, evento.nome)) {
    no.rolagem = Math.max(no.rolagem ?? 0, ROLAGEM[evento.nome]) as NoDaTrajetoria['rolagem'];
  }
}

export function trajetoriaDaVisita(
  eventos: readonly EventoJornada[],
  visita: string | readonly string[],
  corte: string | null = DESDE_ENTRADA_COM_IA,
): Trajetoria | null {
  const visitas = typeof visita === 'string' ? null : new Set(visita);
  const daVisita = eventos
    .filter((e) => (visitas ? visitas.has(e.visita) : e.visita === visita))
    .sort((a, b) => a.em - b.em);
  const lista = eventosDaLinhaDoTempo(daVisita);
  if (lista.length === 0) return null;

  const inicio = lista[0].em;
  const fim = lista[lista.length - 1].em;
  const daSerieNova = corte !== null && inicio >= instanteDoCorte(corte);
  const marcos = daSerieNova ? MARCOS_DA_SERIE_NOVA : { ...MARCOS_DA_SERIE_NOVA, ...MARCOS_SO_DA_SERIE_ANTIGA };

  const nos: NoDaTrajetoria[] = [novoNo('etapa', ROTULOS_ETAPAS[0], lista[0], false)];
  let atual = nos[0];
  const abrir = (no: NoDaTrajetoria) => {
    nos.push(no);
    atual = no;
  };

  // RF-JT-12a: a montagem sai com o caminho do editor, mas a pessoa cai na prévia.
  let logoDepoisDaMontagem = false;
  for (const evento of lista) {
    const { nome, caminho } = evento;
    if (Object.hasOwn(marcos, nome)) {
      abrir(novoNo('etapa', marcos[nome], evento, false));
      juntar(atual, evento);
      logoDepoisDaMontagem = nome.startsWith(PREFIXO_SITE_MONTADO);
      continue;
    }
    if (ehMedicaoDeSaida(nome)) {
      const alvo = [...nos].reverse().find((n) => n.caminho === caminho) ?? atual;
      juntar(alvo, evento);
      continue;
    }
    if (logoDepoisDaMontagem && caminho === CAMINHO_DA_PREVIA) {
      atual.caminho = caminho;
      juntar(atual, evento);
    } else if (caminho === atual.caminho || (daSerieNova && caminho === PAGINA_DE_PASSAGEM)) {
      juntar(atual, evento);
    } else {
      abrir(novoNo('pagina', rotuloDaRota(caminho), evento, nos.some((n) => n.caminho === caminho)));
      juntar(atual, evento);
    }
    logoDepoisDaMontagem = false;
  }

  nos.forEach((no, i) => {
    const proximo = i + 1 < nos.length ? nos[i + 1].inicio : fim;
    no.segundos = Math.floor((proximo - no.inicio) / 1000);
  });

  return { inicio, fim, duracaoMs: fim - inicio, nos, voltas: nos.filter((n) => n.volta).length };
}

export interface AcaoPrincipal {
  rotulo: string;
  tipo: 'acao' | 'erro';
}

// RF-JT-17: o que a lista de visitas mostra sob a bolinha. O 1º evento do nó é o que o abriu, e fica de fora.
export function acoesPrincipais(
  no: NoDaTrajetoria,
  limite = 3,
): { itens: AcaoPrincipal[]; restantes: number } {
  const grupos: Array<AcaoPrincipal & { vezes: number }> = [];
  for (const evento of no.eventos.slice(1)) {
    if (evento.tipo === 'leitura') continue;
    const rotulo = evento.rotulo ?? evento.nome;
    const anterior = grupos.at(-1);
    if (anterior && anterior.rotulo === rotulo && anterior.tipo === evento.tipo) anterior.vezes += 1;
    else grupos.push({ rotulo, tipo: evento.tipo, vezes: 1 });
  }
  const itens = [
    ...grupos.filter((g) => g.tipo === 'erro'),
    ...grupos.filter((g) => g.tipo === 'acao'),
  ].map((g) => ({ rotulo: g.vezes > 1 ? `${g.rotulo} ×${g.vezes}` : g.rotulo, tipo: g.tipo }));
  return { itens: itens.slice(0, limite), restantes: Math.max(0, itens.length - limite) };
}
