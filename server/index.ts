import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCached, setCached } from './api-cache';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const BCB_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

/** BCB SGS series: SELIC acumulada no mês (base 252), % a.a., mensal */
const BCB_SERIES_SELIC = 4189;
/** BCB SGS series: CDI, % ao dia, diária */
const BCB_SERIES_CDI = 12;
/** BCB SGS series: IPCA - Índice Nacional de Preços ao Consumidor Amplo, variação mensal % */
const BCB_SERIES_IPCA = 433;
const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface BCBPoint {
  data: string;
  valor: string;
}

interface YahooChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: Array< { close?: (number | null)[] } >;
    adjclose?: Array< { adjclose?: (number | null)[] } >;
  };
}

function formatDateBR(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parsePeriod(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case '1m':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3m':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case '12m':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case '24m':
      start.setFullYear(start.getFullYear() - 2);
      break;
    case '60m':
      start.setFullYear(start.getFullYear() - 5);
      break;
    default:
      start.setFullYear(start.getFullYear() - 1);
  }
  return { start, end };
}

function getYahooRange(period: string): string {
  const map: Record<string, string> = { '1m': '1mo', '3m': '3mo', '6m': '6mo', '12m': '1y', '24m': '2y', '60m': '5y' };
  return map[period] ?? '1y';
}

async function fetchBCB(
  seriesCode: number,
  start: Date,
  end: Date
): Promise<BCBPoint[]> {
  const cacheKey = `bcb:${seriesCode}:${formatDateBR(start)}:${formatDateBR(end)}`;
  const cached = getCached<BCBPoint[]>(cacheKey);
  if (cached) return cached;
  const url = `${BCB_BASE}.${seriesCode}/dados?formato=json&dataInicial=${formatDateBR(start)}&dataFinal=${formatDateBR(end)}`;
  const { data } = await axios.get<BCBPoint[]>(url);
  const result = data ?? [];
  setCached(cacheKey, result);
  return result;
}

interface YahooPricePoint {
  date: string;
  value: number;
}

async function fetchYahooBVSP(period: string): Promise<YahooPricePoint[]> {
  const range = getYahooRange(period);
  const cacheKey = `yahoo:bvsp:${range}`;
  const cached = getCached<YahooPricePoint[]>(cacheKey);
  if (cached) return cached;
  const url = `${YAHOO_CHART}/%5EBVSP?interval=1d&range=${range}`;
  const { data } = await axios.get<{ chart?: { result?: YahooChartResult[] } }>(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InvestmentApp/1.0)' },
  });
  const chart = data?.chart?.result?.[0];
  if (!chart) throw new Error('Invalid Yahoo Finance response');
  const timestamps = chart.timestamp ?? [];
  const quotes =
    chart.indicators?.quote?.[0]?.close ?? chart.indicators?.adjclose?.[0]?.adjclose ?? [];
  const result = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      value: quotes[i] ?? null,
    }))
    .filter((p): p is YahooPricePoint => p.value != null);
  setCached(cacheKey, result);
  return result;
}

/** Cumulative % return from period start: 0 at start, then e.g. 25 for +25%. */
function seriesToCumulativePercent(series: number[]): number[] {
  if (series.length === 0) return [];
  const first = series[0];
  if (first === 0) return series.map(() => 0);
  return series.map((v) => (v / first - 1) * 100);
}

function buildDateKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function fillForward(arr: (number | null)[]): number[] {
  const out: number[] = [];
  let last: number | null = null;
  for (const v of arr) {
    last = v != null ? v : last;
    out.push(last ?? 0);
  }
  return out;
}

app.get('/api/compare', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '12m';
    const cdbsParam = (req.query.cdbs as string) || '100';
    const cdiMultipliers = cdbsParam.split(',').map((s) => parseFloat(s.trim()) / 100);

    const { start, end } = parsePeriod(period);

    const [selicResult, cdiResult, ipcaResult, yahooResult] = await Promise.allSettled([
      fetchBCB(BCB_SERIES_SELIC, start, end),
      fetchBCB(BCB_SERIES_CDI, start, end),
      fetchBCB(BCB_SERIES_IPCA, start, end),
      fetchYahooBVSP(period),
    ]);

    const selicRaw = selicResult.status === 'fulfilled' ? selicResult.value : [];
    const cdiRaw = cdiResult.status === 'fulfilled' ? cdiResult.value : [];
    const ipcaRaw = ipcaResult.status === 'fulfilled' ? ipcaResult.value : [];
    const yahooData = yahooResult.status === 'fulfilled' ? yahooResult.value : null;

    const unavailableSeries: string[] = [];
    if (ipcaResult.status === 'rejected') {
      unavailableSeries.push('ipca');
      console.warn('IPCA data unavailable for period:', period, ipcaResult.reason?.message ?? ipcaResult.reason);
    }
    if (yahooResult.status === 'rejected') {
      unavailableSeries.push('ibov');
      console.warn('Yahoo BVSP data unavailable:', yahooResult.reason?.message ?? yahooResult.reason);
    }
    if (selicResult.status === 'rejected') {
      unavailableSeries.push('tesouroSelic');
      console.warn('SELIC data unavailable:', selicResult.reason?.message ?? selicResult.reason);
    }
    if (cdiResult.status === 'rejected') {
      unavailableSeries.push('cdi');
      console.warn('CDI data unavailable:', cdiResult.reason?.message ?? cdiResult.reason);
    }

    const yahooDataSafe = yahooData ?? [];
    const hasDates = yahooDataSafe.length > 0 || cdiRaw.length > 0;
    if (!hasDates) {
      res.status(404).json({
        error: 'Nenhum dado disponível para o período selecionado. Tente outro período.',
      });
      return;
    }

    const cdiByDate = new Map<string, number>();
    cdiRaw.forEach(({ data, valor }) => {
      const v = parseFloat(String(valor).replace(',', '.'));
      if (!isNaN(v)) cdiByDate.set(data, v);
    });

    const selicMonthly = selicRaw.map(({ data, valor }) => ({
      data,
      valor: parseFloat(String(valor).replace(',', '.')) || 0,
    }));

    let cumSelic = 1;
    const selicByDate = new Map<string, number>();
    for (const m of selicMonthly) {
      const monthRate = (1 + m.valor / 100) ** (1 / 12) - 1;
      cumSelic *= 1 + monthRate;
      selicByDate.set(m.data, cumSelic);
    }

    const ipcaMonthly = ipcaRaw.map(({ data, valor }) => ({
      data,
      valor: parseFloat(String(valor).replace(',', '.')) || 0,
    }));
    let cumIpca = 1;
    const ipcaByDate = new Map<string, number>();
    for (const m of ipcaMonthly) {
      cumIpca *= 1 + m.valor / 100;
      ipcaByDate.set(m.data, cumIpca);
    }

    const allDatesSet = new Set<string>();
    yahooDataSafe.forEach(({ date }) => allDatesSet.add(buildDateKey(date)));
    cdiRaw.forEach(({ data }) => {
      const [d, M, y] = data.split('/');
      allDatesSet.add(`${y}-${M.padStart(2, '0')}-${d.padStart(2, '0')}`);
    });
    let sortedDates = Array.from(allDatesSet).sort();

    const ibovMap = new Map(yahooDataSafe.map((p) => [buildDateKey(p.date), p.value]));
    const ibovSeries = sortedDates.map((d) => ibovMap.get(d) ?? null);
    const ibovFilled = fillForward(ibovSeries);

    // Start timeline at first date we have real Ibov data (avoid weekends/holidays making Ibov look flat)
    const firstIbovIdx = ibovFilled.findIndex((v) => v > 0);
    if (firstIbovIdx > 0) {
      sortedDates = sortedDates.slice(firstIbovIdx);
      ibovFilled.splice(0, firstIbovIdx);
    }
    const ibovPercent = seriesToCumulativePercent(ibovFilled);

    const parseBR = (s: string): Date => {
      const [dd, mm, yyyy] = s.split('/');
      return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    };
    const selicKeys = Array.from(selicByDate.keys()).sort(
      (a, b) => parseBR(a).getTime() - parseBR(b).getTime()
    );
    const tesouroSelicSeriesArr: number[] = [];
    let lastSelic = 1;
    for (const d of sortedDates) {
      const dateObj = new Date(d + 'Z');
      const monthKey = selicKeys.filter((k) => parseBR(k) <= dateObj).pop();
      const v = monthKey != null ? selicByDate.get(monthKey) : null;
      if (v != null) lastSelic = v;
      tesouroSelicSeriesArr.push(lastSelic);
    }
    const tesouroSelicPercent = seriesToCumulativePercent(tesouroSelicSeriesArr);

    const ipcaKeys = Array.from(ipcaByDate.keys()).sort(
      (a, b) => parseBR(a).getTime() - parseBR(b).getTime()
    );
    const ipcaSeriesArr: number[] = [];
    let lastIpca = 1;
    for (const d of sortedDates) {
      const dateObj = new Date(d + 'Z');
      const monthKey = ipcaKeys.filter((k) => parseBR(k) <= dateObj).pop();
      const v = monthKey != null ? ipcaByDate.get(monthKey) : null;
      if (v != null) lastIpca = v;
      ipcaSeriesArr.push(lastIpca);
    }
    const ipcaPercent = seriesToCumulativePercent(ipcaSeriesArr);

    const cdbs: Record<string, number[]> = {};
    cdiMultipliers.forEach((mult, idx) => {
      const name = `CDB ${cdbsParam.split(',')[idx].trim()}% CDI`;
      let cdbCum = 1;
      const series = sortedDates.map((d) => {
        const br = d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);
        const dailyRate = cdiByDate.get(br);
        if (dailyRate != null) cdbCum *= 1 + (dailyRate * mult) / 100;
        return cdbCum;
      });
      cdbs[name] = seriesToCumulativePercent(series);
    });

    res.json({
      dates: sortedDates,
      series: {
        tesouroSelic: tesouroSelicPercent,
        ibov: ibovPercent,
        ipca: ipcaPercent,
        cdbs,
      },
      ...(unavailableSeries.length > 0 && { unavailableSeries }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to fetch comparison data',
    });
  }
});

// Serve built client in production (e.g. Docker)
const staticDir = path.join(__dirname, '../client/dist');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
