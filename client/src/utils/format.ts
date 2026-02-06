/** Portuguese month abbreviations for axis/tooltip. */
export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(value: number): string {
  return brlFormatter.format(value);
}

export function formatAxisDate(isoDate: string, compact = false): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (compact && d) {
    return `${d} ${MONTHS[(m ?? 1) - 1]}`;
  }
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function formatTooltipDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}
