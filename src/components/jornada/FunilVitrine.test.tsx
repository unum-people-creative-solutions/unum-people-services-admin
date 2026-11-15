import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FunilVitrine } from './FunilVitrine';

// medicao-e-robustez MR-25 (T26): a nota da série fica junto do rótulo da etapa 6.
const estado = vi.hoisted(() => ({ desde: null as string | null }));

vi.mock('@/lib/jornada', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/jornada')>();
  return {
    ...original,
    get DESDE_CHEGADA_NA_CONTRATACAO() {
      return estado.desde;
    },
  };
});

const VALORES = [100, 60, 40, 30, 20, 10, 5, 3, 1];

function renderizar() {
  render(
    <FunilVitrine
      idTitulo="titulo-funil"
      titulo="Funil"
      valores={VALORES}
      carregando={false}
      erro={false}
      onTentar={() => {}}
      textoVazio="Nada"
    />,
  );
  return screen.getByRole('region', { name: 'Funil' });
}

function linha(secao: HTMLElement, rotulo: string) {
  const item = within(secao)
    .getAllByRole('listitem')
    .find((li) => within(li).queryByText(rotulo) !== null);
  if (!item) throw new Error(`sem a linha ${rotulo}`);
  return item;
}

describe('FunilVitrine: nota da série de "Abriu a contratação" (MR-25)', () => {
  afterEach(() => {
    estado.desde = null;
  });

  it('com a data, a nota aparece na linha "Abriu a contratação" e em nenhuma outra', () => {
    estado.desde = '2026-11-20';
    const secao = renderizar();
    expect(within(linha(secao, 'Abriu a contratação')).getByText('conta a chegada na tela desde 20/11')).toBeInTheDocument();
    expect(within(secao).getAllByText('conta a chegada na tela desde 20/11')).toHaveLength(1);
  });

  it('com null, a nota não aparece', () => {
    const secao = renderizar();
    expect(within(secao).queryByText(/conta a chegada na tela/)).toBeNull();
    expect(linha(secao, 'Abriu a contratação')).toBeInTheDocument();
  });
});
