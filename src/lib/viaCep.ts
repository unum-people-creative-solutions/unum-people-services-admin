export interface EnderecoViaCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const limpo = (cep || '').replace(/\D/g, '');
  if (limpo.length !== 8) {
    return null;
  }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (data.erro === true || data.erro === 'true') {
      return null;
    }
    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      uf: data.uf ?? '',
    };
  } catch {
    return null;
  }
}
