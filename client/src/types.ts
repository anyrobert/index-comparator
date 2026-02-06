export type Period = '1m' | '3m' | '6m' | '12m' | '24m' | '60m';

export interface ComparisonSeries {
  tesouroSelic: number[];
  ibov: number[];
  ipca: number[];
  cdbs: Record<string, number[]>;
}

export interface ComparisonData {
  dates: string[];
  series: ComparisonSeries;
  /** Series that could not be loaded for this period (e.g. IPCA not yet published for current month) */
  unavailableSeries?: string[];
}
