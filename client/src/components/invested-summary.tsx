import type { ComparisonData } from '../types';
import { formatBRL } from '../utils/format';

interface InvestedSummaryProps {
  data: ComparisonData;
  investedValue: number | null;
}

export function InvestedSummary({ data, investedValue }: InvestedSummaryProps) {
  const { series } = data;
  const lastIdx = data.dates.length - 1;
  const hasValue = investedValue != null && investedValue > 0;

  if (lastIdx < 0) return null;

  const ipcaUnavailable = data.unavailableSeries?.includes('ipca');

  const rows: { label: string; finalValue: number; gain: number; unavailable?: boolean }[] = hasValue
    ? (() => {
        const r: { label: string; finalValue: number; gain: number; unavailable?: boolean }[] = [];
        const pctSelic = series.tesouroSelic[lastIdx] ?? 0;
        const pctIbov = series.ibov[lastIdx] ?? 0;
        const pctIpca = series.ipca[lastIdx] ?? 0;
        r.push({
          label: 'Tesouro Selic',
          finalValue: (1 + pctSelic / 100) * investedValue!,
          gain: (pctSelic / 100) * investedValue!,
        });
        r.push({
          label: 'Ibovespa',
          finalValue: (1 + pctIbov / 100) * investedValue!,
          gain: (pctIbov / 100) * investedValue!,
        });
        r.push({
          label: 'IPCA',
          finalValue: (1 + pctIpca / 100) * investedValue!,
          gain: (pctIpca / 100) * investedValue!,
          unavailable: ipcaUnavailable,
        });
        Object.entries(series.cdbs).forEach(([name, values]) => {
          const pct = values[lastIdx] ?? 0;
          r.push({
            label: name,
            finalValue: (1 + pct / 100) * investedValue!,
            gain: (pct / 100) * investedValue!,
          });
        });
        return r;
      })()
    : [];

  return (
    <section
      className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-600 dark:bg-neutral-800"
      aria-labelledby="invested-summary-heading"
    >
      <h2 id="invested-summary-heading" className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-3 text-pretty">
        Resumo: valor investido e ganho no período
      </h2>
      {!hasValue ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Informe o valor investido (R$) acima para ver quanto teria ao final do período e o ganho em cada investimento.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Valor investido
            </p>
            <p className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
              {formatBRL(investedValue)}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Valor ao final do período e ganho
            </p>
            <ul className="space-y-2" role="list">
              {rows.map(({ label, finalValue, gain, unavailable }) => (
                <li
                  key={label}
                  className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm min-w-0"
                >
                  <span className="text-neutral-700 dark:text-neutral-300 truncate">{label}</span>
                  {unavailable ? (
                    <span className="text-neutral-500 dark:text-neutral-400 italic shrink-0">
                      Não disponível para este mês
                    </span>
                  ) : (
                    <span className="font-medium text-neutral-800 dark:text-neutral-200 tabular-nums shrink-0">
                      {formatBRL(finalValue)}
                      <span
                        className={
                          gain >= 0
                            ? 'ml-2 text-emerald-600 dark:text-emerald-400'
                            : 'ml-2 text-red-600 dark:text-red-400'
                        }
                      >
                        ({gain >= 0 ? '+' : ''}{formatBRL(gain)})
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
