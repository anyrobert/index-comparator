import type { ComparisonData, Period } from '../types';

const API_BASE = '/api';

function getErrorMessage(res: Response, fallback: string): string {
  if (res.status === 404) {
    return 'API indisponível. Inicie o servidor com: npm run dev:server (ou npm run dev na raiz do projeto).';
  }
  if (res.status >= 500) return fallback;
  return fallback;
}

export async function fetchComparison(
  period: Period,
  cdbs: string = '100'
): Promise<ComparisonData> {
  const params = new URLSearchParams({ period, cdbs });
  const res = await fetch(`${API_BASE}/compare?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = typeof body?.error === 'string' ? body.error : getErrorMessage(res, `Request failed: ${res.status}`);
    throw new Error(msg);
  }
  return res.json();
}
