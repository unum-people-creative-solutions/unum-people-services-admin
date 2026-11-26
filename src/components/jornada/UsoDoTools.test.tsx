import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResumoToolsUso } from '@/types/toolsUso';
import { UsoDoTools } from './UsoDoTools';
// Resposta real de GET /admin/dashboard/tools-uso (api), copiada sem edição (L-071).
import fixtureToolsUso from '@/services/__fixtures__/tools-uso-resposta.json';

// medicao-de-uso RF-MU-08, RF-MU-09 e CA-MU-04.

afterEach(cleanup);

const resumo = fixtureToolsUso as ResumoToolsUso;

function renderizar(
  extra: {
    dados?: ResumoToolsUso | undefined;
    carregando?: boolean;
    erro?: boolean;
    onTentar?: () => void;
    chegaramPeloTools?: number | undefined;
  } = {},
) {
  render(
    <UsoDoTools
      dados={'dados' in extra ? extra.dados : resumo}
      carregando={extra.carregando ?? false}
      erro={extra.erro ?? false}
      onTentar={extra.onTentar ?? (() => {})}
      chegaramPeloTools={extra.chegaramPeloTools}
    />,
  );
  return screen.getByRole('region', { name: 'Uso do Tools' });
}

// Texto das células de uma linha, na ordem das colunas.
function celulas(linha: HTMLElement) {
  return within(linha).getAllByRole('cell').map((c) => c.textContent);
}

describe('UsoDoTools', () => {
  it('mostra as seis ferramentas com os rótulos literais e as colunas da spec', () => {
    const secao = renderizar();
    const tabela = within(secao).getByRole('table');
    expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Ferramenta', 'Visitas', 'Começaram', 'Viram o resultado', 'Clicaram no convite', 'Abriram o guia', 'Baixaram a planilha', 'Copiaram ou baixaram',
    ]);
    const linhas = within(tabela).getAllByRole('row').slice(1);
    expect(linhas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual([
      'Home', 'Quanto cobrar pelo serviço', 'Vale a pena anunciar?', 'Quais serviços compensam', 'Gerador de QR code', 'Gerador de link do WhatsApp',
    ]);
  });

  it('cada linha traz os números da resposta real; a planilha só existe em serviços e "Copiaram ou baixaram" só nos geradores', () => {
    const secao = renderizar();
    const linha = (nome: string) => within(secao).getByRole('row', { name: new RegExp(`^${nome.replace('?', '\\?')}`) });
    expect(celulas(linha('Home'))).toEqual(['5', '0', '0', '0', '0', '—', '—']);
    expect(celulas(linha('Quanto cobrar pelo serviço'))).toEqual(['7', '2', '1', '1', '0', '—', '—']);
    expect(celulas(linha('Vale a pena anunciar?'))).toEqual(['0', '0', '0', '0', '0', '—', '—']);
    expect(celulas(linha('Quais serviços compensam'))).toEqual(['2', '0', '0', '0', '0', '1', '—']);
    expect(celulas(linha('Gerador de QR code'))).toEqual(['0', '0', '0', '0', '0', '—', '5']);
    expect(celulas(linha('Gerador de link do WhatsApp'))).toEqual(['0', '0', '0', '0', '0', '—', '4']);
  });

  it('com a tabela dentro de uma área rolável no celular', () => {
    const secao = renderizar();
    expect(within(secao).getByRole('region', { name: 'Tabela do uso do Tools' })).toContainElement(
      within(secao).getByRole('table'),
    );
  });

  it('estado vazio literal quando todos os números são zero, sem tabela', () => {
    const zerado: ResumoToolsUso = {
      ...resumo,
      ferramentas: resumo.ferramentas.map((f) => ({
        ...f, visita: 0, comecou: 0, resultado: 0, convite: 0, guia: 0, planilha: 0, baixou: 0,
      })),
      dias: [],
    };
    const secao = renderizar({ dados: zerado });
    expect(within(secao).getByText('Ainda não há uso do Tools neste período.')).toBeInTheDocument();
    expect(within(secao).queryByRole('table')).toBeNull();
  });

  it('com dados não mostra o estado vazio', () => {
    const secao = renderizar();
    expect(within(secao).queryByText('Ainda não há uso do Tools neste período.')).toBeNull();
  });

  it('a linha "Chegaram ao unumpeople.app pelo Tools" mostra N visitas; 1 vai no singular', () => {
    const secao = renderizar({ chegaramPeloTools: 12 });
    expect(within(secao).getByText('Chegaram ao unumpeople.app pelo Tools: 12 visitas')).toBeInTheDocument();
    cleanup();
    const outra = renderizar({ chegaramPeloTools: 1 });
    expect(within(outra).getByText('Chegaram ao unumpeople.app pelo Tools: 1 visita')).toBeInTheDocument();
  });

  it('com 0 visitas a linha aparece com 0; sem o dado (undefined) a linha some', () => {
    const secao = renderizar({ chegaramPeloTools: 0 });
    expect(within(secao).getByText('Chegaram ao unumpeople.app pelo Tools: 0 visitas')).toBeInTheDocument();
    cleanup();
    const semDado = renderizar({ chegaramPeloTools: undefined });
    expect(within(semDado).queryByText(/Chegaram ao unumpeople\.app/)).toBeNull();
  });

  it('carregando: esqueleto, sem tabela, sem erro', () => {
    const secao = renderizar({ dados: undefined, carregando: true });
    expect(secao).toHaveAttribute('aria-busy', 'true');
    expect(within(secao).queryByRole('table')).toBeNull();
    expect(within(secao).queryByRole('alert')).toBeNull();
  });

  it('erro: alerta visível com "Tentar de novo", que chama onTentar', () => {
    const onTentar = vi.fn();
    const secao = renderizar({ dados: undefined, erro: true, onTentar });
    const alerta = within(secao).getByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar.');
    expect(within(secao).queryByRole('table')).toBeNull();
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentar).toHaveBeenCalledTimes(1);
  });
});
