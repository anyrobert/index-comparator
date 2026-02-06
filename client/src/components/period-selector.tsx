import type { Period } from '../types';

const PERIODS: { value: Period; label: string; title: string }[] = [
  { value: '1m', label: '1M', title: '1 mês' },
  { value: '3m', label: '3M', title: '3 meses' },
  { value: '6m', label: '6M', title: '6 meses' },
  { value: '12m', label: '1A', title: '1 ano' },
  { value: '24m', label: '2A', title: '2 anos' },
  { value: '60m', label: '5A', title: '5 anos' },
];

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {PERIODS.map(({ value: p, label, title }) => (
        <button
          key={p}
          type="button"
          title={title}
          aria-label={title}
          className={
            value === p
              ? 'px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white border border-indigo-600 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
              : 'px-4 py-2.5 rounded-lg text-sm font-medium border border-neutral-300 bg-white text-neutral-800 hover:border-indigo-400 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
          }
          onClick={() => onChange(p)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
