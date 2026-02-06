import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ComparisonData } from '../types';
import { formatBRL, formatAxisDate, formatTooltipDate } from '../utils/format';
import { useMediaQuery } from '../hooks/use-media-query';

const COLORS = {
  tesouroSelic: '#818cf8',
  ibov: '#38bdf8',
  ipca: '#e879f9',
  cdbs: ['#34d399', '#f59e0b', '#a78bfa'],
} as const;

type SeriesItem = { name: string; color: string };

interface ComparisonChartProps {
  data: ComparisonData | null;
  /** When set, chart shows projected value in BRL instead of index base 100 */
  investedValue?: number | null;
}

function buildChartData(data: ComparisonData, investedValue: number | null) {
  const { dates, series, unavailableSeries } = data;
  const showMoney = investedValue != null && investedValue > 0;
  const round = (v: number) => Math.round(v * 100) / 100;
  const showIpca = !unavailableSeries?.includes('ipca');
  return dates.map((date, i) => {
    const pctSelic = series.tesouroSelic[i] ?? 0;
    const pctIbov = series.ibov[i] ?? 0;
    const pctIpca = series.ipca[i] ?? 0;
    const point: Record<string, string | number> = {
      date: date.slice(0, 10),
      'Tesouro Selic': showMoney ? round((1 + pctSelic / 100) * investedValue!) : round(pctSelic),
      Ibovespa: showMoney ? round((1 + pctIbov / 100) * investedValue!) : round(pctIbov),
      ...(showIpca && {
        IPCA: showMoney ? round((1 + pctIpca / 100) * investedValue!) : round(pctIpca),
      }),
    };
    Object.entries(series.cdbs).forEach(([name, values]) => {
      const pct = values[i] ?? 0;
      point[name] = showMoney ? round((1 + pct / 100) * investedValue!) : round(pct);
    });
    return point;
  });
}

const DEFAULT_VISIBLE_NAMES = new Set(['Tesouro Selic', 'Ibovespa', 'IPCA']);

export function ComparisonChart({ data, investedValue = null }: ComparisonChartProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const showMoney = investedValue != null && investedValue > 0;
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isDark = useMediaQuery('(prefers-color-scheme: dark)');
  const tickFill = isDark ? 'rgb(226 232 240)' : 'rgb(64 64 64)';

  const { chartData, seriesList } = useMemo(() => {
    if (!data) return { chartData: [], seriesList: [] as SeriesItem[] };
    const chartData = buildChartData(data, investedValue);
    const cdbNames = Object.keys(data.series.cdbs);
    const showIpca = !data.unavailableSeries?.includes('ipca');
    const list: SeriesItem[] = [
      { name: 'Tesouro Selic', color: COLORS.tesouroSelic },
      { name: 'Ibovespa', color: COLORS.ibov },
      ...(showIpca ? [{ name: 'IPCA', color: COLORS.ipca }] : []),
      ...cdbNames.map((name, idx) => ({
        name,
        color: COLORS.cdbs[idx % COLORS.cdbs.length],
      })),
    ];
    return { chartData, seriesList: list };
  }, [data, investedValue]);

  const toggle = (name: string) => {
    setVisible((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isVisible = (name: string) => visible[name] ?? DEFAULT_VISIBLE_NAMES.has(name);

  if (!data) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
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
      <ResponsiveContainer width="100%" height={isMobile ? 400 : 400} minHeight={340}>
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
            tickFormatter={(v) =>
              showMoney ? formatBRL(Number(v)) : `${Number(v).toFixed(0)}%`
            }
            width={isMobile ? 42 : 60}
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
              value != null
                ? showMoney
                  ? formatBRL(value)
                  : `${Number(value).toFixed(2)}%`
                : '—',
              name ?? '—',
            ]}
            labelFormatter={(label) => formatTooltipDate(String(label))}
          />
          {!showMoney && (
            <ReferenceLine y={0} stroke="rgb(100 116 139)" strokeDasharray="2 2" />
          )}
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
      <p className={`mt-2 text-neutral-500 dark:text-neutral-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>
        {showMoney
          ? `Projeção a partir de ${formatBRL(investedValue!)} no início do período. Fonte: BCB, Yahoo Finance.`
          : 'Rentabilidade acumulada desde o início do período (0%). Fonte: BCB, Yahoo Finance.'}
      </p>
    </div>
  );
}
