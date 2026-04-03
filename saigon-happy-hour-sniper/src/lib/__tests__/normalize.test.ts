import { describe, it, expect } from 'vitest';
import {
  parseDayRange,
  parseTimeRange,
  convertVndPrice,
  normalizeDealType,
  normalizeVenue,
} from '../normalize';

describe('parseDayRange', () => {
  it('parses a single day', () => {
    expect(parseDayRange('Monday')).toEqual(['monday']);
  });

  it('parses Mon-Thu as 4 days', () => {
    expect(parseDayRange('Mon-Thu')).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
    ]);
  });

  it('parses Mon-Fri as 5 days', () => {
    expect(parseDayRange('Mon-Fri')).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]);
  });

  it('parses "Weekdays" as Mon-Fri', () => {
    expect(parseDayRange('Weekdays')).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]);
  });

  it('parses "Weekend" as Sat-Sun', () => {
    expect(parseDayRange('Weekend')).toEqual(['saturday', 'sunday']);
  });

  it('parses "Every day" as all 7 days', () => {
    expect(parseDayRange('Every day')).toHaveLength(7);
  });

  it('parses "Daily" as all 7 days', () => {
    expect(parseDayRange('Daily')).toHaveLength(7);
  });

  it('parses "Fri & Sat" as 2 days', () => {
    expect(parseDayRange('Fri & Sat')).toEqual(['friday', 'saturday']);
  });

  it('parses comma-separated "Tue, Thu, Sat" as 3 days', () => {
    expect(parseDayRange('Tue, Thu, Sat')).toEqual([
      'tuesday',
      'thursday',
      'saturday',
    ]);
  });

  it('handles case-insensitive input', () => {
    expect(parseDayRange('MONDAY')).toEqual(['monday']);
  });
});

describe('parseTimeRange', () => {
  it('parses "3pm-6pm" to 24h format', () => {
    expect(parseTimeRange('3pm-6pm')).toEqual({
      start: '15:00',
      end: '18:00',
    });
  });

  it('parses "3-6pm" with implied PM for start', () => {
    expect(parseTimeRange('3-6pm')).toEqual({
      start: '15:00',
      end: '18:00',
    });
  });

  it('passes through 24h format "15:00-18:00"', () => {
    expect(parseTimeRange('15:00-18:00')).toEqual({
      start: '15:00',
      end: '18:00',
    });
  });

  it('returns nulls for "All day"', () => {
    expect(parseTimeRange('All day')).toEqual({ start: null, end: null });
  });

  it('handles "3pm-late" with null end', () => {
    expect(parseTimeRange('3pm-late')).toEqual({
      start: '15:00',
      end: null,
    });
  });

  it('returns nulls for null input', () => {
    expect(parseTimeRange(null)).toEqual({ start: null, end: null });
  });

  it('parses "11am-2pm" correctly', () => {
    expect(parseTimeRange('11am-2pm')).toEqual({
      start: '11:00',
      end: '14:00',
    });
  });

  it('parses "12pm-3pm" (noon edge case)', () => {
    expect(parseTimeRange('12pm-3pm')).toEqual({
      start: '12:00',
      end: '15:00',
    });
  });
});

describe('convertVndPrice', () => {
  it('parses "50,000đ" to number', () => {
    expect(convertVndPrice('50,000đ')).toBe(50000);
  });

  it('parses "50.000 VND" (dot separator)', () => {
    expect(convertVndPrice('50.000 VND')).toBe(50000);
  });

  it('parses "50k" shorthand', () => {
    expect(convertVndPrice('50k')).toBe(50000);
  });

  it('returns 0 for "Free"', () => {
    expect(convertVndPrice('Free')).toBe(0);
  });

  it('passes through numeric input', () => {
    expect(convertVndPrice(29000)).toBe(29000);
  });

  it('converts "$5" to VND at ~25,000 rate', () => {
    expect(convertVndPrice('$5')).toBe(125000);
  });

  it('returns null for null input', () => {
    expect(convertVndPrice(null)).toBeNull();
  });

  it('takes first value from range "30,000-50,000đ"', () => {
    expect(convertVndPrice('30,000-50,000đ')).toBe(30000);
  });

  it('parses "100k" shorthand', () => {
    expect(convertVndPrice('100k')).toBe(100000);
  });

  it('returns null for empty string', () => {
    expect(convertVndPrice('')).toBeNull();
  });
});

describe('normalizeDealType', () => {
  it('maps "happy hour" to happy_hour', () => {
    expect(normalizeDealType('happy hour')).toBe('happy_hour');
  });

  it('maps "2-for-1" to happy_hour', () => {
    expect(normalizeDealType('2-for-1')).toBe('happy_hour');
  });

  it('maps "buy 1 get 1" to happy_hour', () => {
    expect(normalizeDealType('buy 1 get 1')).toBe('happy_hour');
  });

  it('maps "ladies night" to ladies_night', () => {
    expect(normalizeDealType('ladies night')).toBe('ladies_night');
  });

  it('maps "ladies nite" to ladies_night', () => {
    expect(normalizeDealType('ladies nite')).toBe('ladies_night');
  });

  it('maps "free drink for ladies" to ladies_night', () => {
    expect(normalizeDealType('free drink for ladies')).toBe('ladies_night');
  });

  it('maps "brunch" to brunch', () => {
    expect(normalizeDealType('brunch')).toBe('brunch');
  });

  it('maps "live music" to live_music', () => {
    expect(normalizeDealType('live music')).toBe('live_music');
  });

  it('maps "DJ Night" to live_music', () => {
    expect(normalizeDealType('DJ Night')).toBe('live_music');
  });

  it('maps "daily special" to daily_special', () => {
    expect(normalizeDealType('daily special')).toBe('daily_special');
  });

  it('defaults unknown strings to daily_special', () => {
    expect(normalizeDealType('unknown')).toBe('daily_special');
  });

  it('handles case-insensitive "HAPPY HOUR"', () => {
    expect(normalizeDealType('HAPPY HOUR')).toBe('happy_hour');
  });
});

describe('normalizeVenue', () => {
  const validRawVenue = {
    name: 'Saigon Brew',
    district: 'd1',
    address: '123 Le Loi, D1',
    website: 'https://saigonbrew.com',
    deals: [
      {
        deal_name: 'Happy Hour',
        type: 'happy hour',
        day_of_week: 'Mon-Fri',
        time_start: '3pm',
        time_end: '6pm',
        description: 'Half price beers',
        items: [{ item: 'Draft Beer', promo_price: '25,000đ', regular_price: '50,000đ' }],
        conditions: 'Dine-in only',
        source_url: 'https://saigonbrew.com/deals',
      },
    ],
    notes: null,
  };

  it('normalizes a full valid venue', () => {
    const result = normalizeVenue(validRawVenue);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Saigon Brew');
    expect(result!.district).toBe('d1');
    expect(result!.deals).toHaveLength(1);
    expect(result!.deals[0].type).toBe('happy_hour');
    expect(result!.deals[0].day_of_week).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]);
    expect(result!.deals[0].items[0].promo_price).toBe(25000);
  });

  it('returns empty deals array when deals are missing', () => {
    const raw = { ...validRawVenue, deals: undefined };
    const result = normalizeVenue(raw);
    expect(result).not.toBeNull();
    expect(result!.deals).toEqual([]);
  });

  it('wraps a single deal object into an array', () => {
    const raw = { ...validRawVenue, deals: validRawVenue.deals[0] };
    const result = normalizeVenue(raw);
    expect(result).not.toBeNull();
    expect(result!.deals).toHaveLength(1);
  });

  it('returns null when venue name is missing', () => {
    const raw = { ...validRawVenue, name: undefined };
    expect(normalizeVenue(raw)).toBeNull();
  });

  it('returns null when venue name is empty string', () => {
    const raw = { ...validRawVenue, name: '' };
    expect(normalizeVenue(raw)).toBeNull();
  });
});
