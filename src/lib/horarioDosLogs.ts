// O CloudWatch Logs Insights devolve @timestamp em UTC sem fuso
// ("2026-11-07 00:44:35.142"); a auditoria vem em ISO com fuso.
// instanteDoLog lê os dois como o instante certo, qualquer que seja o fuso do
// computador; formatarHorarioDoLog mostra no horário de Brasília.
const SEM_FUSO = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/;

export function instanteDoLog(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const valor = texto.trim();
  const iso = SEM_FUSO.test(valor) ? `${valor.replace(' ', 'T')}Z` : valor;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

const formatoBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function formatarHorarioDoLog(texto: string | null | undefined): string {
  const ms = instanteDoLog(texto);
  return ms === null ? '—' : formatoBrasilia.format(ms);
}
