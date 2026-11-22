import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PaginaDeEntrada } from '@/types/jornada';
import { PaginasDeEntrada } from './PaginasDeEntrada';

// jornada-trajetoria T10 (RF-JT-34): só as páginas com visita e só as linhas com valor.

type Leitura = Record<PaginaDeEntrada, Record<string, number>>;

const VAZIA: Leitura = { inicio: {}, saude: {}, crm: {}, blog: {} };

function renderizar(leitura: Partial<Leitura>) {
  render(
    <PaginasDeEntrada
      titulo="Páginas de entrada"
      leitura={{ ...VAZIA, ...leitura }}
      carregando={false}
      erro={false}
      onTentar={() => {}}
    />,
  );
  return screen.getByRole('region', { name: 'Páginas de entrada' });
}

function abas(secao: HTMLElement) {
  return within(within(secao).getByRole('group', { name: 'Página de entrada' })).getAllByRole('button');
}

function linhas(secao: HTMLElement, bloco: string) {
  return within(within(secao).getByRole('list', { name: bloco }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);
}

const INICIO_E_SAUDE: Partial<Leitura> = {
  inicio: {
    visita: 51,
    rolagem_25: 40,
    rolagem_50: 0,
    tempo_10s: 30,
    secao_modelos: 20,
    clique_galeria_modelo: 7,
  },
  saude: { visita: 13, rolagem_25: 9 },
};

describe('PaginasDeEntrada sucinta (RF-JT-34)', () => {
  it('só as abas das páginas com visita, com o número: "Início · 51" e "Saúde · 13"', () => {
    const secao = renderizar(INICIO_E_SAUDE);
    expect(abas(secao).map((b) => b.textContent)).toEqual(['Início · 51', 'Saúde · 13']);
    expect(within(secao).queryByRole('button', { name: /^CRM/ })).toBeNull();
    expect(within(secao).queryByRole('button', { name: /^Blog/ })).toBeNull();
  });

  it('a aba inicial é a de mais visitas e trocar de aba mostra a outra página', () => {
    const secao = renderizar({ inicio: { visita: 5, rolagem_25: 1 }, saude: { visita: 13, rolagem_25: 9 } });
    const pressionadas = () => abas(secao).filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent);
    expect(pressionadas()).toEqual(['Saúde · 13']);
    fireEvent.click(within(secao).getByRole('button', { name: 'Início · 5' }));
    expect(pressionadas()).toEqual(['Início · 5']);
    expect(linhas(secao, 'Rolagem')).toEqual(['25%120%']);
  });

  it('nota com a página escondida, em ordem das abas e ligadas por vírgula e "e"', () => {
    renderizar(INICIO_E_SAUDE);
    expect(screen.getByText('CRM e Blog sem visitas no período não aparecem.')).toBeInTheDocument();
  });

  it('nota com 3 páginas escondidas: "Saúde, CRM e Blog"', () => {
    const secao = renderizar({ inicio: { visita: 4, rolagem_25: 2 } });
    expect(within(secao).getByText('Saúde, CRM e Blog sem visitas no período não aparecem.')).toBeInTheDocument();
  });

  it('nota com 1 página escondida: só o nome', () => {
    const secao = renderizar({ inicio: { visita: 4 }, saude: { visita: 3 }, crm: { visita: 2 } });
    expect(within(secao).getByText('Blog sem visitas no período não aparece.')).toBeInTheDocument();
  });

  it('com as quatro páginas com visita, não há nota', () => {
    const secao = renderizar({ inicio: { visita: 4 }, saude: { visita: 3 }, crm: { visita: 2 }, blog: { visita: 1 } });
    expect(within(secao).queryByText(/sem visitas no período não aparece/)).toBeNull();
    expect(abas(secao).map((b) => b.textContent)).toEqual(['Início · 4', 'Saúde · 3', 'CRM · 2', 'Blog · 1']);
  });

  it('em cada bloco, só as linhas com valor maior que 0', () => {
    const secao = renderizar(INICIO_E_SAUDE);
    expect(linhas(secao, 'Rolagem')).toEqual(['25%4078%']);
    expect(linhas(secao, 'Tempo na página (aba visível)')).toEqual(['10 s3059%']);
    expect(linhas(secao, 'Seções vistas')).toEqual(['Modelos2039%']);
    expect(linhas(secao, 'Cliques')).toEqual(['Galeria: escolheu um modelo7']);
  });

  it('bloco sem linhas (tudo 0) não aparece, nem o título', () => {
    const secao = renderizar({ inicio: { visita: 10, rolagem_25: 6 } });
    expect(within(secao).getByRole('list', { name: 'Rolagem' })).toBeInTheDocument();
    expect(within(secao).queryByRole('list', { name: 'Tempo na página (aba visível)' })).toBeNull();
    expect(within(secao).queryByRole('list', { name: 'Seções vistas' })).toBeNull();
    expect(within(secao).queryByRole('list', { name: 'Cliques' })).toBeNull();
    expect(within(secao).queryByRole('heading', { name: 'Cliques' })).toBeNull();
    expect(within(secao).queryByRole('heading', { name: 'Seções vistas' })).toBeNull();
  });

  it('sem visita em nenhuma página: só a mensagem, sem abas, blocos nem nota', () => {
    const secao = renderizar({});
    expect(within(secao).getByText('Nenhuma visita entrou pelas páginas de entrada no período.')).toBeInTheDocument();
    expect(within(secao).queryByRole('group', { name: 'Página de entrada' })).toBeNull();
    expect(within(secao).queryByRole('list')).toBeNull();
    expect(within(secao).queryByText(/sem visitas no período não aparece/)).toBeNull();
  });

  it('a página com visita mas sem nenhuma linha com valor mostra a aba e nenhum bloco', () => {
    const secao = renderizar({ inicio: { visita: 3 } });
    expect(abas(secao).map((b) => b.textContent)).toEqual(['Início · 3']);
    expect(within(secao).queryByRole('list')).toBeNull();
  });

  it('se o filtro zera a página escolhida, a seção volta para a de mais visitas', () => {
    const props = { titulo: 'Páginas de entrada', carregando: false, erro: false, onTentar: () => {} };
    const { rerender } = render(
      <PaginasDeEntrada {...props} leitura={{ ...VAZIA, inicio: { visita: 5 }, saude: { visita: 13 } }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Início · 5' }));
    rerender(<PaginasDeEntrada {...props} leitura={{ ...VAZIA, saude: { visita: 2 } }} />);
    const aba = screen.getByRole('button', { name: 'Saúde · 2' });
    expect(aba).toHaveAttribute('aria-pressed', 'true');
  });
});
