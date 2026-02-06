import type { ComparisonData } from '../types';
import {
  buildBalanceSeries,
  pctSeriesToIndex100,
} from './monthly-contribution-chart';
import { formatBRL } from '../utils/format';

interface SimulatorSummaryProps {
  data: ComparisonData;
  initialValue: number;
  monthlyContribution: number;
}

export function SimulatorSummary({
  data,
  initialValue,
  monthlyContribution,
}: SimulatorSummaryProps) {
  const { dates, series } = data;
  const monthKeys = Array.from(new Set(dates.map((d) => d.slice(0, 7)))).sort();
  const numMonths = monthKeys.length;
  const totalInvested = initialValue + monthlyContribution * Math.max(0, numMonths - 1);

  const cdiSeries = Object.values(series.cdbs)[0];
  const tesouro = buildBalanceSeries(
    dates,
    pctSeriesToIndex100(series.tesouroSelic),
    initialValue,
    monthlyContribution
  );
  const ibov = buildBalanceSeries(
    dates,
    pctSeriesToIndex100(series.ibov),
    initialValue,
    monthlyContribution
  );
  const ipcaUnavailable = data.unavailableSeries?.includes('ipca');
  const ipca = buildBalanceSeries(
    dates,
    pctSeriesToIndex100(series.ipca),
    initialValue,
    monthlyContribution
  );
  const cdi = cdiSeries
    ? buildBalanceSeries(
        dates,
        pctSeriesToIndex100(cdiSeries),
        initialValue,
        monthlyContribution
      )
    : tesouro.map(() => initialValue);

  const lastIdx = dates.length - 1;
  const rows = [
    { label: 'Tesouro Selic', finalValue: tesouro[lastIdx] ?? totalInvested, gain: (tesouro[lastIdx] ?? totalInvested) - totalInvested, unavailable: false },
    { label: 'Ibovespa', finalValue: ibov[lastIdx] ?? totalInvested, gain: (ibov[lastIdx] ?? totalInvested) - totalInvested, unavailable: false },
    { label: 'IPCA', finalValue: ipca[lastIdx] ?? totalInvested, gain: (ipca[lastIdx] ?? totalInvested) - totalInvested, unavailable: ipcaUnavailable },
    { label: '100% CDI', finalValue: cdi[lastIdx] ?? totalInvested, gain: (cdi[lastIdx] ?? totalInvested) - totalInvested, unavailable: false },
  ];

  return (
    <section
      className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-600 dark:bg-neutral-800"
      aria-labelledby="simulator-summary-heading"
    >
      <h2 id="simulator-summary-heading" className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-3 text-pretty">
        Resumo: total investido e ganho no período
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Total investido
          </p>
          <p className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
            {formatBRL(totalInvested)}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 tabular-nums">
            {formatBRL(initialValue)} inicial + {formatBRL(monthlyContribution)} × {numMonths - 1} meses
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
    </section>
  );
}
