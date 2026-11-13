import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { EnderecoFields } from './EnderecoFields';
import * as viaCep from '@/lib/viaCep';

const Wrapper = ({ defaultValues = {} }: { defaultValues?: Record<string, unknown> }) => {
  const methods = useForm({
    defaultValues: {
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
      },
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <EnderecoFields />
    </FormProvider>
  );
};

describe('EnderecoFields (T16 adaptado ao admin)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza todos os campos de endereço editáveis', () => {
    render(<Wrapper />);

    expect(screen.getByRole('textbox', { name: /cep/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /logradouro|rua/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /número/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /complemento/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /bairro/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /cidade/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /uf/i })).toBeInTheDocument();
  });

  it('preenche logradouro, bairro, cidade e uf pelo CEP de 8 dígitos sem apagar o número digitado', async () => {
    vi.spyOn(viaCep, 'buscarCep').mockResolvedValueOnce({
      logradouro: 'Av. Pref. Erasto Gaertner',
      bairro: 'Bacacheri',
      cidade: 'Curitiba',
      uf: 'PR',
    });

    render(<Wrapper defaultValues={{ endereco: { numero: '2423' } }} />);

    const numeroInput = screen.getByRole('textbox', { name: /número/i }) as HTMLInputElement;
    expect(numeroInput.value).toBe('2423');

    const cepInput = screen.getByRole('textbox', { name: /cep/i });
    fireEvent.change(cepInput, { target: { value: '82515000' } });

    await waitFor(() => {
      expect(viaCep.buscarCep).toHaveBeenCalledWith('82515000');
    });

    await waitFor(() => {
      const ruaInput = screen.getByRole('textbox', { name: /logradouro|rua/i }) as HTMLInputElement;
      expect(ruaInput.value).toBe('Av. Pref. Erasto Gaertner');
    });

    const bairroInput = screen.getByRole('textbox', { name: /bairro/i }) as HTMLInputElement;
    const cidadeInput = screen.getByRole('textbox', { name: /cidade/i }) as HTMLInputElement;
    const ufInput = screen.getByRole('textbox', { name: /uf/i }) as HTMLInputElement;

    expect(bairroInput.value).toBe('Bacacheri');
    expect(cidadeInput.value).toBe('Curitiba');
    expect(ufInput.value).toBe('PR');

    // Número não pode ter sido apagado:
    expect(numeroInput.value).toBe('2423');
  });

  it('quando o ViaCEP falha, não trava a tela, não dispara alert e mantém os campos editáveis', async () => {
    vi.spyOn(viaCep, 'buscarCep').mockResolvedValueOnce(null);
    const alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);

    render(<Wrapper />);

    const cepInput = screen.getByRole('textbox', { name: /cep/i });
    fireEvent.change(cepInput, { target: { value: '99999999' } });

    await waitFor(() => {
      expect(viaCep.buscarCep).toHaveBeenCalledWith('99999999');
    });

    expect(alertMock).not.toHaveBeenCalled();

    const ruaInput = screen.getByRole('textbox', { name: /logradouro|rua/i }) as HTMLInputElement;
    fireEvent.change(ruaInput, { target: { value: 'Rua Manual' } });
    expect(ruaInput.value).toBe('Rua Manual');
    expect(ruaInput.disabled).toBe(false);
  });
});
