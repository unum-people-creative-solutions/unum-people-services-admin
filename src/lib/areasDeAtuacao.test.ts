import { describe, expect, test } from 'vitest';
import { AREAS_DE_ATUACAO } from './areasDeAtuacao';

describe('AREAS_DE_ATUACAO (RF-AA-01)', () => {
  test('é a lista literal de 13 áreas, nesta ordem', () => {
    expect([...AREAS_DE_ATUACAO]).toEqual([
      'Saúde',
      'Beleza e estética',
      'Bem-estar e esporte',
      'Alimentação',
      'Comércio e lojas',
      'Serviços para casa',
      'Serviços profissionais',
      'Educação e cursos',
      'Tecnologia e marketing',
      'Imóveis',
      'Automotivo',
      'Eventos e fotografia',
      'Outro',
    ]);
  });
});
