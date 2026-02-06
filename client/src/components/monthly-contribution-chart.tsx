import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ComparisonData } from '../types';
import { formatBRL, formatAxisDate, formatTooltipDate } from '../utils/format';
import { useMediaQuery } from '../hooks/use-media-query';

const COLORS = {
  tesouroSelic: '#818cf8',
  ibov: '#38bdf8',
  ipca: '#e879f9',
  cdi: '#a78bfa',
} as const;

/**
 * API series are cumulative % (0 at start). Convert to index base 100 for balance math: 100 + pct.
 * Then balance = initial * (index/100) + contributions weighted by index growth.
 */
export function pctSeriesToIndex100(pctSeries: number[]): number[] {
  return pctSeries.map((p) => 100 + p);
}

/** Dado índice base 100 por data, calcula saldo ao longo do tempo com aporte inicial + aporte no início de cada mês. */
export function buildBalanceSeries(
  dates: string[],
  indexSeries: number[],
  initialValue: number,
  monthlyContribution: number
): number[] {
  if (dates.length === 0 || indexSeries.length === 0) return [];
  const monthKeys = Array.from(new Set(dates.map((d) => d.slice(0, 7)))).sort();
  const firstDateIdxByMonth = new Map<string, number>();
  for (let i = 0; i < dates.length; i++) {
    const key = dates[i].slice(0, 7);
    if (!firstDateIdxByMonth.has(key)) firstDateIdxByMonth.set(key, i);
  }
  const result: number[] = [];
  for (let t = 0; t < dates.length; t++) {
    const idxT = indexSeries[t] ?? 100;
    let balance = (initialValue * idxT) / 100;
    const currentMonth = dates[t].slice(0, 7);
    for (const monthKey of monthKeys) {
      if (monthKey === monthKeys[0]) continue;
      if (monthKey > currentMonth) break;
      const startIdx = firstDateIdxByMonth.get(monthKey);
      const idxStart = startIdx != null ? (indexSeries[startIdx] ?? 100) : 100;
      balance += (monthlyContribution * idxT) / idxStart;
    }
    result.push(Math.round(balance * 100) / 100);
  }
  return result;
}

interface MonthlyContributionChartProps {
  data: ComparisonData;
  initialValue: number;
  monthlyContribution: number;
}

export function MonthlyContributionChart({
  data,
  initialValue,
  monthlyContribution,
}: MonthlyContributionChartProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isDark = useMediaQuery('(prefers-color-scheme: dark)');
  const tickFill = isDark ? 'rgb(226 232 240)' : 'rgb(64 64 64)';

  const { chartData, seriesList } = useMemo(() => {
    const { dates, series, unavailableSeries } = data;
    const showIpca = !unavailableSeries?.includes('ipca');
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

    const chartData = dates.map((date, i) => ({
      date: date.slice(0, 10),
      'Tesouro Selic': tesouro[i],
      Ibovespa: ibov[i],
      ...(showIpca && { IPCA: ipca[i] }),
      '100% CDI': cdi[i],
    }));

    const list = [
      { name: 'Tesouro Selic', color: COLORS.tesouroSelic },
      { name: 'Ibovespa', color: COLORS.ibov },
      ...(showIpca ? [{ name: 'IPCA', color: COLORS.ipca }] : []),
      { name: '100% CDI', color: COLORS.cdi },
    ];
    return { chartData, seriesList: list };
  }, [data, initialValue, monthlyContribution]);

  const toggle = (name: string) => {
    setVisible((prev) => ({ ...prev, [name]: !prev[name] }));
  };
  const isVisible = (name: string) => visible[name] !== false;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
      <h2 className={`font-semibold mb-2 text-pretty ${isMobile ? 'text-base' : 'text-lg'}`}>
        Simulador: aporte inicial + aporte mensal
      </h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 text-pretty">
        Se você investisse {formatBRL(initialValue)} no início do período e aportasse{' '}
        {formatBRL(monthlyContribution)} no início de cada mês, o saldo evoluiria assim em cada
        investimento.
      </p>
      <div className={`mb-4 flex flex-wrap gap-2 ${isMobile ? 'gap-1.5' : ''}`} role="group" aria-label="Visibilidade das séries">
        {seriesList.map(({ name, color }) => (
          <button
            key={name}
            type="button"
            onClick={() => toggle(name)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              isMobile ? 'px-2.5 py-2 min-h-[44px]' : 'px-3 py-2'
            } ${
              isVisible(name)
                ? 'border bg-white shadow-sm dark:bg-neutral-700'
                : 'border border-dashed opacity-50 hover:opacity-70'
            } border-neutral-300 dark:border-neutral-600`}
            aria-label={isVisible(name) ? `Ocultar série ${name}` : `Mostrar série ${name}`}
            title={isVisible(name) ? `Ocultar ${name}` : `Mostrar ${name}`}
          >
            <span
              className={`shrink-0 rounded-full ${isMobile ? 'h-3 w-3' : 'h-2.5 w-2.5'}`}
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            {name}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={360} minHeight={300}>
        <LineChart
          data={chartData}
          margin={
            isMobile
              ? { top: 16, right: 16, left: 8, bottom: 36 }
              : { top: 20, right: 30, left: 20, bottom: 20 }
          }
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-600"
            vertical={isMobile}
            strokeOpacity={isMobile ? 1 : 0.4}
          />
          <XAxis
            dataKey="date"
            stroke={tickFill}
            tick={{
              fontSize: isMobile ? 14 : 13,
              fill: tickFill,
              fontWeight: 500,
            }}
            axisLine={{ stroke: tickFill }}
            tickLine={{ stroke: tickFill }}
            tickFormatter={(v) => formatAxisDate(String(v), isMobile)}
            interval={chartData.length > 6 ? Math.floor((chartData.length - 1) / (isMobile ? 5 : 6)) : 0}
          />
          <YAxis
            domain={['auto', 'auto']}
            stroke={tickFill}
            tick={{
              fontSize: isMobile ? 14 : 13,
              fill: tickFill,
              fontWeight: 500,
            }}
            axisLine={{ stroke: tickFill }}
            tickLine={{ stroke: tickFill }}
            tickFormatter={(v) => formatBRL(Number(v))}
            width={isMobile ? 52 : 70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(30 41 59)',
              border: '1px solid rgb(71 85 105)',
              borderRadius: '8px',
              padding: '12px 16px',
            }}
            labelStyle={{ color: 'rgb(248 250 252)', fontWeight: 600, marginBottom: 8 }}
            itemStyle={{ color: 'rgb(226 232 240)' }}
            formatter={(value: number | undefined, name: string | undefined) => [
              value != null ? formatBRL(value) : '—',
              name ?? '—',
            ]}
            labelFormatter={(label) => formatTooltipDate(String(label))}
          />
          {seriesList.map(({ name, color }) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={color}
              strokeWidth={isMobile ? 2.5 : 2}
              dot={false}
              hide={!isVisible(name)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
