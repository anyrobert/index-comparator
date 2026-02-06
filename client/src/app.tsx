import { useState, useEffect, useCallback } from 'react';
import { PeriodSelector } from './components/period-selector';
import { ComparisonChart } from './components/comparison-chart';
import { InvestedSummary } from './components/invested-summary';
import { MonthlyContributionChart } from './components/monthly-contribution-chart';
import { SimulatorSummary } from './components/simulator-summary';
import { fetchComparison } from './api/fetch-comparison';
import type { ComparisonData, Period } from './types';

type TabId = 'comparison' | 'simulator';

const TABS: { id: TabId; label: string }[] = [
  { id: 'comparison', label: 'Comparação' },
  { id: 'simulator', label: 'Simulador de aportes' },
];

function parseNum(s: string): number | null {
  const v = parseFloat(s.trim().replace(/,/g, '.'));
  return Number.isFinite(v) ? v : null;
}

const inputBaseClass =
  'rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-800 shadow-sm placeholder:text-neutral-400 focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-500';

function App() {
  const [period, setPeriod] = useState<Period>('12m');
  const [activeTab, setActiveTab] = useState<TabId>('comparison');
  const [investedValue, setInvestedValue] = useState<string>('');
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatorInitial, setSimulatorInitial] = useState<string>('100');
  const [simulatorMonthly, setSimulatorMonthly] = useState<string>('50');

  const investedAmount = parseNum(investedValue);
  const simInitial = parseNum(simulatorInitial);
  const simMonthly = parseNum(simulatorMonthly);
  const showSimulatorContent = data && simInitial != null && simInitial >= 0 && simMonthly != null && simMonthly >= 0;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });
    fetchComparison(period)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar dados'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, current: TabId) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const idx = TABS.findIndex((t) => t.id === current);
      const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      const nextTab = TABS[next < 0 ? TABS.length - 1 : next % TABS.length];
      setActiveTab(nextTab.id);
      document.getElementById(`tab-btn-${nextTab.id}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab('comparison');
      document.getElementById('tab-btn-comparison')?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab('simulator');
      document.getElementById('tab-btn-simulator')?.focus();
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="absolute -left-[9999px] top-4 z-[100] px-4 py-2 bg-white text-neutral-900 rounded-lg shadow-lg focus:left-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-800 dark:text-neutral-100"
      >
        Pular para o conteúdo principal
      </a>
      <header className="bg-indigo-700 text-white py-4 px-6 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold m-0 mb-1 text-white text-pretty">
            Comparação de investimentos
          </h1>
          <p className="m-0 text-indigo-100 text-sm">
            Tesouro Selic, Ibovespa e 100% CDI — compare por índice ou por valor investido
          </p>
        </div>
      </header>
      <main id="main-content" className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
        <PeriodSelector value={period} onChange={setPeriod} />
        <div
          className="mb-6 flex border-b border-neutral-200 dark:border-neutral-600"
          role="tablist"
          aria-label="Comparação ou simulador"
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              id={`tab-btn-${id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`tab-${id}`}
              tabIndex={activeTab === id ? 0 : -1}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/50 ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              onClick={() => setActiveTab(id)}
              onKeyDown={(e) => handleTabKeyDown(e, id)}
            >
              {label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="py-8 text-center text-neutral-600 dark:text-neutral-400" aria-live="polite">
            Carregando…
          </div>
        ) : error ? (
          <div
            className="py-4 px-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            role="alert"
            aria-live="polite"
          >
            <p className="font-medium m-0">Não foi possível carregar a comparação</p>
            <p className="m-0 mt-1 text-sm opacity-90">{error}</p>
          </div>
        ) : data ? (
          <>
            {((data.unavailableSeries && data.unavailableSeries.length > 0) ||
              (data.unavailableSeries && Object.keys(data.unavailableSeries).length > 0)) && (
              <div
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                role="status"
                aria-live="polite"
              >
                {data.unavailableSeries && data.unavailableSeries.length > 0 && (
                  <>
                    <p className="font-medium m-0 text-sm">
                      Índice não disponível para este período:
                    </p>
                    <ul className="mt-1 list-inside list-disc m-0 text-sm opacity-90">
                      {data.unavailableSeries.map((key) => (
                        <li key={key}>
                          {key === 'ipca'
                            ? 'IPCA'
                            : key === 'ibov'
                              ? 'Ibovespa'
                              : key === 'tesouroSelic'
                                ? 'Tesouro Selic'
                                : key === 'cdi'
                                  ? 'CDI'
                                  : key}
                          {' — dados ainda não publicados para este mês.'}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            <div
              id="tab-comparison"
              role="tabpanel"
              aria-labelledby="tab-btn-comparison"
              hidden={activeTab !== 'comparison'}
              className={activeTab !== 'comparison' ? 'hidden' : undefined}
            >
              <div className="mb-6 flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Valor investido (R$)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    name="invested-value"
                    placeholder="Ex: 10.000 (deixe vazio para índice base 100)…"
                    value={investedValue}
                    onChange={(e) => setInvestedValue(e.target.value)}
                    className={`${inputBaseClass} w-64`}
                    aria-label="Valor investido em reais"
                    spellCheck={false}
                  />
                </label>
              </div>
              <InvestedSummary data={data} investedValue={investedAmount} />
              <ComparisonChart data={data} investedValue={investedAmount} />
            </div>
            <div
              id="tab-simulator"
              role="tabpanel"
              aria-labelledby="tab-btn-simulator"
              hidden={activeTab !== 'simulator'}
              className={activeTab !== 'simulator' ? 'hidden' : undefined}
            >
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 text-pretty">
                Simule quanto teria hoje se tivesse investido um valor inicial no primeiro mês do período e aportado um valor fixo no início de cada mês.
              </p>
              <div className="mb-6 flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Valor inicial (R$)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    name="simulator-initial"
                    placeholder="Ex: 100…"
                    value={simulatorInitial}
                    onChange={(e) => setSimulatorInitial(e.target.value)}
                    className={`${inputBaseClass} w-40`}
                    aria-label="Valor investido no primeiro mês"
                    spellCheck={false}
                  />
                </label>
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Aporte mensal (R$)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    name="simulator-monthly"
                    placeholder="Ex: 50…"
                    value={simulatorMonthly}
                    onChange={(e) => setSimulatorMonthly(e.target.value)}
                    className={`${inputBaseClass} w-40`}
                    aria-label="Valor aportado no início de cada mês"
                    spellCheck={false}
                  />
                </label>
              </div>
              {showSimulatorContent ? (
                <>
                  <SimulatorSummary
                    data={data}
                    initialValue={simInitial}
                    monthlyContribution={simMonthly}
                  />
                  <MonthlyContributionChart
                    data={data}
                    initialValue={simInitial}
                    monthlyContribution={simMonthly}
                  />
                </>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Preencha valor inicial e aporte mensal para ver o resumo e o gráfico.
                </p>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default App;
