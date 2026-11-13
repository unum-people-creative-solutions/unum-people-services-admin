'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { buscarCep } from '@/lib/viaCep';

interface EnderecoFieldsProps {
  namePrefix?: string;
  disabled?: boolean;
}

export function EnderecoFields({ namePrefix = 'endereco', disabled = false }: EnderecoFieldsProps) {
  const { register, setValue, control } = useFormContext();
  const getFieldName = useCallback(
    (field: string) => (namePrefix ? `${namePrefix}.${field}` : field),
    [namePrefix]
  );

  const cepFieldName = getFieldName('cep');
  const cepValue = useWatch({ control, name: cepFieldName });
  const ultimoCepConsultado = useRef<string>('');

  useEffect(() => {
    const limpo = (cepValue || '').replace(/\D/g, '');
    if (limpo.length === 8 && limpo !== ultimoCepConsultado.current) {
      ultimoCepConsultado.current = limpo;
      void (async () => {
        try {
          const dados = await buscarCep(limpo);
          if (dados) {
            if (dados.logradouro) {
              setValue(getFieldName('logradouro'), dados.logradouro, { shouldDirty: true, shouldValidate: true });
            }
            if (dados.bairro) {
              setValue(getFieldName('bairro'), dados.bairro, { shouldDirty: true, shouldValidate: true });
            }
            if (dados.cidade) {
              setValue(getFieldName('cidade'), dados.cidade, { shouldDirty: true, shouldValidate: true });
            }
            if (dados.uf) {
              setValue(getFieldName('uf'), dados.uf, { shouldDirty: true, shouldValidate: true });
            }
          }
        } catch {
          // Falhas no ViaCEP não bloqueiam digitação nem disparam alertas
        }
      })();
    }
  }, [cepValue, setValue, getFieldName]);

  const cepId = `${namePrefix ? `${namePrefix}_` : ''}cep`;
  const logradouroId = `${namePrefix ? `${namePrefix}_` : ''}logradouro`;
  const numeroId = `${namePrefix ? `${namePrefix}_` : ''}numero`;
  const complementoId = `${namePrefix ? `${namePrefix}_` : ''}complemento`;
  const bairroId = `${namePrefix ? `${namePrefix}_` : ''}bairro`;
  const cidadeId = `${namePrefix ? `${namePrefix}_` : ''}cidade`;
  const ufId = `${namePrefix ? `${namePrefix}_` : ''}uf`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor={cepId} className="text-sm font-semibold text-slate-700">
            CEP
          </label>
          <input
            id={cepId}
            {...register(getFieldName('cep'))}
            disabled={disabled}
            placeholder="00000-000"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label htmlFor={logradouroId} className="text-sm font-semibold text-slate-700">
            Rua / Logradouro
          </label>
          <input
            id={logradouroId}
            {...register(getFieldName('logradouro'))}
            disabled={disabled}
            placeholder="Av. Paulista, Rua das Flores..."
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor={numeroId} className="text-sm font-semibold text-slate-700">
            Número
          </label>
          <input
            id={numeroId}
            {...register(getFieldName('numero'))}
            disabled={disabled}
            placeholder="123"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label htmlFor={complementoId} className="text-sm font-semibold text-slate-700">
            Complemento
          </label>
          <input
            id={complementoId}
            {...register(getFieldName('complemento'))}
            disabled={disabled}
            placeholder="Sala 101, Bloco B (opcional)"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor={bairroId} className="text-sm font-semibold text-slate-700">
            Bairro
          </label>
          <input
            id={bairroId}
            {...register(getFieldName('bairro'))}
            disabled={disabled}
            placeholder="Centro"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={cidadeId} className="text-sm font-semibold text-slate-700">
            Cidade
          </label>
          <input
            id={cidadeId}
            {...register(getFieldName('cidade'))}
            disabled={disabled}
            placeholder="São Paulo"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={ufId} className="text-sm font-semibold text-slate-700">
            UF
          </label>
          <input
            id={ufId}
            {...register(getFieldName('uf'))}
            disabled={disabled}
            maxLength={2}
            placeholder="SP"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white disabled:bg-slate-100 disabled:text-slate-500 uppercase"
          />
        </div>
      </div>
    </div>
  );
}
