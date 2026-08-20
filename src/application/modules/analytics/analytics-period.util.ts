export type AnalyticsPeriodPreset = 'today' | '7d' | 'month' | 'year' | 'custom';

export type AnalyticsTrunc = 'hour' | 'day' | 'month';

export interface ResolvedAnalyticsPeriod {
  preset: AnalyticsPeriodPreset;
  from: Date;
  to: Date;
  trunc: AnalyticsTrunc;
}

function endOfToday(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

function normalizePreset(raw?: string): AnalyticsPeriodPreset {
  const p = (raw ?? 'month').toLowerCase();
  if (p === 'today') return 'today';
  if (p === '7d' || p === 'week' || p === '7day') return '7d';
  if (p === 'month') return 'month';
  if (p === 'year') return 'year';
  if (p === 'custom') return 'custom';
  return 'month';
}

export function resolveAnalyticsPeriod(input: {
  period?: string;
  from?: string;
  to?: string;
}): ResolvedAnalyticsPeriod {
  const preset = normalizePreset(input.period);
  const to = endOfToday();

  if (preset === 'custom') {
    const from = input.from ? new Date(input.from) : new Date(to.getTime() - 7 * 86400000);
    from.setHours(0, 0, 0, 0);
    const customTo = input.to ? new Date(input.to) : to;
    customTo.setHours(23, 59, 59, 999);
    const days = Math.ceil((customTo.getTime() - from.getTime()) / 86400000);
    return { preset, from, to: customTo, trunc: days > 62 ? 'month' : 'day' };
  }

  if (preset === 'today') {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    return { preset, from, to, trunc: 'hour' };
  }

  if (preset === '7d') {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { preset, from, to, trunc: 'day' };
  }

  if (preset === 'month') {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    return { preset, from, to, trunc: 'day' };
  }

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  from.setHours(0, 0, 0, 0);
  return { preset, from, to, trunc: 'month' };
}

/** Legacy months-based range (last N calendar months). */
export function resolveMonthsRange(months: number): { from: Date; to: Date; trunc: AnalyticsTrunc } {
  const to = endOfToday();
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1));
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  return { from, to, trunc: 'month' };
}

export function periodLabelFromTrunc(trunc: AnalyticsTrunc): string {
  if (trunc === 'hour') return 'HH24:00';
  if (trunc === 'day') return 'YYYY-MM-DD';
  return 'YYYY-MM';
}
