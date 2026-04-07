import type { DealType, Venue, Deal, DealItem } from './types';

const DAYS_ORDERED = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const ABBREV_MAP: Record<string, string> = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
};

function resolveDay(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if ((DAYS_ORDERED as readonly string[]).includes(trimmed)) return trimmed;
  return ABBREV_MAP[trimmed] ?? null;
}

function expandRange(startDay: string, endDay: string): string[] {
  const startIdx = DAYS_ORDERED.indexOf(startDay as (typeof DAYS_ORDERED)[number]);
  const endIdx = DAYS_ORDERED.indexOf(endDay as (typeof DAYS_ORDERED)[number]);
  if (startIdx === -1 || endIdx === -1) return [];
  const result: string[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    result.push(DAYS_ORDERED[i]);
  }
  return result;
}

export function parseDayRange(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const input = raw.trim().toLowerCase();
  if (!input) return [];

  if (input === 'weekdays') return [...DAYS_ORDERED.slice(0, 5)];
  if (input === 'weekend' || input === 'weekends') return ['saturday', 'sunday'];
  if (input === 'every day' || input === 'daily') return [...DAYS_ORDERED];

  if (input.includes(',')) {
    return input.split(',').flatMap((part) => parseDayRange(part));
  }

  if (input.includes('&')) {
    return input.split('&').flatMap((part) => parseDayRange(part));
  }
  if (input.includes(' and ')) {
    return input.split(' and ').flatMap((part) => parseDayRange(part));
  }

  if (input.includes('-')) {
    const [startRaw, endRaw] = input.split('-');
    const startDay = resolveDay(startRaw);
    const endDay = resolveDay(endRaw);
    if (startDay && endDay) return expandRange(startDay, endDay);
  }

  const day = resolveDay(input);
  if (day) return [day];

  return [];
}

function convertSingleTimeTo24h(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();

  if (trimmed === 'late' || trimmed === 'close') return null;

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ?? '00';
  const period = match[3];

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return `${hours}:${minutes}`;
}

export function parseTimeRange(
  raw: string | null | undefined
): { start: string | null; end: string | null } {
  if (raw == null) return { start: null, end: null };
  const input = raw.trim().toLowerCase();
  if (!input) return { start: null, end: null };

  if (input === 'all day') return { start: null, end: null };

  const dashIdx = input.indexOf('-');
  if (dashIdx === -1) {
    const t = convertSingleTimeTo24h(input);
    return { start: t, end: null };
  }

  const startRaw = input.substring(0, dashIdx).trim();
  const endRaw = input.substring(dashIdx + 1).trim();

  const endPeriod = endRaw.match(/(am|pm)/);
  const startPeriod = startRaw.match(/(am|pm)/);

  let startStr = startRaw;
  if (!startPeriod && endPeriod) {
    startStr = startRaw + endPeriod[1];
  }

  const start = convertSingleTimeTo24h(startStr);
  const end = convertSingleTimeTo24h(endRaw);

  return { start, end };
}

export function convertVndPrice(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;

  const input = raw.trim();
  if (!input) return null;

  if (input.toLowerCase() === 'free') return 0;

  const usdMatch = input.match(/^\$(\d+(?:\.\d+)?)/);
  if (usdMatch) return parseFloat(usdMatch[1]) * 25000;
  const usdSuffixMatch = input.match(/^(\d+(?:\.\d+)?)\s*USD/i);
  if (usdSuffixMatch) return parseFloat(usdSuffixMatch[1]) * 25000;

  let priceStr = input;
  const rangeMatch = input.match(/^([\d.,]+[kK]?)\s*-\s*[\d.,]+[kK]?/);
  if (rangeMatch) {
    priceStr = rangeMatch[1];
  }

  priceStr = priceStr
    .replace(/[đ₫]/g, '')
    .replace(/VND/gi, '')
    .replace(/dong/gi, '')
    .trim();

  const kMatch = priceStr.match(/^([\d.,]+)\s*[kK]$/);
  if (kMatch) {
    return parseFloat(kMatch[1].replace(/,/g, '')) * 1000;
  }

  if (/^\d{1,3}\.\d{3}$/.test(priceStr)) {
    return parseInt(priceStr.replace(/\./g, ''), 10);
  }

  priceStr = priceStr.replace(/,/g, '');
  const num = parseFloat(priceStr);
  return isNaN(num) ? null : num;
}

export function normalizeDealType(raw: string | null | undefined): DealType {
  if (raw == null) return 'daily_special';
  const input = raw.trim().toLowerCase();
  if (!input) return 'daily_special';

  if (
    input.includes('happy hour') ||
    input.includes('2-for-1') ||
    input.includes('buy 1 get 1') ||
    input.includes('bogo') ||
    input.includes('half price') ||
    input.includes('discount')
  ) {
    return 'happy_hour';
  }

  if (input.includes('ladies') || input.includes('girls night') || input.includes('women')) {
    return 'ladies_night';
  }

  if (input.includes('brunch')) return 'brunch';

  if (
    input.includes('live music') ||
    input.includes('live band') ||
    input.includes('dj') ||
    input.includes('acoustic') ||
    input.includes('karaoke')
  ) {
    return 'live_music';
  }

  return 'daily_special';
}

export function normalizeVenue(raw: unknown): Venue | null {
  if (raw == null || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  if (!obj.name || typeof obj.name !== 'string' || !obj.name.trim()) return null;

  let rawDeals: unknown[] = [];
  if (Array.isArray(obj.deals)) {
    rawDeals = obj.deals;
  } else if (obj.deals && typeof obj.deals === 'object') {
    rawDeals = [obj.deals];
  }

  const deals: Deal[] = rawDeals
    .filter(
      (d): d is Record<string, unknown> =>
        d != null && typeof d === 'object' && !!(d as Record<string, unknown>).deal_name
    )
    .map((d) => {
      const rawItems = Array.isArray(d.items) ? d.items : d.items ? [d.items] : [];
      const items: DealItem[] = (rawItems as Record<string, unknown>[]).map((item) => ({
        item: (item.item as string) || '',
        promo_price: convertVndPrice(item.promo_price as string | number | null | undefined),
        regular_price: convertVndPrice(item.regular_price as string | number | null | undefined),
      }));

      const timeStart = d.time_start ? convertSingleTimeTo24h(String(d.time_start)) : null;
      const timeEnd = d.time_end ? convertSingleTimeTo24h(String(d.time_end)) : null;

      return {
        deal_name: d.deal_name as string,
        type: normalizeDealType(d.type as string | null | undefined),
        day_of_week: parseDayRange(d.day_of_week as string | null | undefined),
        time_start: timeStart,
        time_end: timeEnd,
        description: (d.description as string) || '',
        items,
        conditions: (d.conditions as string) || null,
        source_url: (d.source_url as string) || '',
      };
    });

  return {
    name: obj.name as string,
    district: (obj.district as Venue['district']) || 'd1',
    address: (obj.address as string) || '',
    website: (obj.website as string) || '',
    deals,
    notes: (obj.notes as string) || null,
  };
}
