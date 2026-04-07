const USD_TO_VND = 25_000;

/**
 * Strip Vietnamese diacritics/tone marks from a string.
 * @example stripDiacritics("Bình Thạnh") // "Binh Thanh"
 * @example stripDiacritics("Phú Nhuận") // "Phu Nhuan"
 */
export function stripDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Handle đ/Đ separately (not decomposed by NFD)
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Parse a Vietnamese price string into VND amount.
 *
 * Handles dot-separated thousands, comma-as-decimal "triệu" shorthand,
 * USD conversion, and negotiable indicators.
 *
 * @example parseVietnamesePrice("5.500.000 đ/tháng") // { vnd: 5500000, negotiable: false }
 * @example parseVietnamesePrice("8,5 triệu/tháng")   // { vnd: 8500000, negotiable: false }
 * @example parseVietnamesePrice("Thỏa thuận")         // { vnd: null, negotiable: true }
 * @example parseVietnamesePrice("500 USD/tháng")       // { vnd: 12500000, negotiable: false }
 */
export function parseVietnamesePrice(
  raw: string | null | undefined
): { vnd: number | null; negotiable: boolean } {
  if (raw === null || raw === undefined || raw === "") {
    return { vnd: null, negotiable: false };
  }

  const s = raw.trim();

  const negotiablePatterns = /^(thỏa\s*thuận|liên\s*hệ|thương\s*lượng|thoả\s*thuận)$/i;
  if (negotiablePatterns.test(s)) {
    return { vnd: null, negotiable: true };
  }

  const usdMatch = s.match(/([\d.,]+)\s*USD/i);
  if (usdMatch) {
    const amount = parseVietnameseNumber(usdMatch[1]);
    if (amount !== null) {
      return { vnd: Math.round(amount * USD_TO_VND), negotiable: false };
    }
  }

  const trieuMatch = s.match(/([\d.,]+)\s*triệu/i);
  if (trieuMatch) {
    const amount = parseVietnameseNumber(trieuMatch[1]);
    if (amount !== null) {
      return { vnd: Math.round(amount * 1_000_000), negotiable: false };
    }
  }

  const tyMatch = s.match(/([\d.,]+)\s*tỷ/i);
  if (tyMatch) {
    const amount = parseVietnameseNumber(tyMatch[1]);
    if (amount !== null) {
      return { vnd: Math.round(amount * 1_000_000_000), negotiable: false };
    }
  }

  const rawNum = s.replace(/[^\d.,]/g, "");
  if (rawNum) {
    const amount = parseVietnameseNumber(rawNum);
    if (amount !== null && amount > 0) {
      return { vnd: Math.round(amount), negotiable: false };
    }
  }

  return { vnd: null, negotiable: false };
}

/**
 * Parse a Vietnamese-formatted number string.
 * Dots are thousands separators, commas are decimal separators.
 *
 * @example parseVietnameseNumber("5.500.000") // 5500000
 * @example parseVietnameseNumber("8,5")       // 8.5
 */
function parseVietnameseNumber(raw: string): number | null {
  if (!raw) return null;

  let s = raw.trim();

  // Dots as thousands separators: "5.500.000" → 5500000
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
    const n = Number(s);
    return isNaN(n) ? null : n;
  }

  // Dots=thousands + comma=decimal: "1.500,5" → 1500.5
  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? null : n;
  }

  // Vietnamese comma = decimal: "8,5" → 8.5
  if (s.includes(",")) {
    s = s.replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? null : n;
  }

  const n = Number(s);
  return isNaN(n) ? null : n;
}

/**
 * Parse an area string into square meters.
 *
 * Handles m², m2, and comma-as-decimal separator.
 *
 * @example parseArea("25 m²")    // 25
 * @example parseArea("25,5 m2")  // 25.5
 * @example parseArea(null)       // null
 */
export function parseArea(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;

  const s = raw.trim();

  const match = s.match(/([\d]+[,.]?\d*)\s*m[²2]/i);
  if (!match) return null;

  // Vietnamese comma = decimal
  const numStr = match[1].replace(",", ".");
  const n = Number(numStr);
  return isNaN(n) ? null : n;
}

/** 2021 merger: Quận 2, Quận 9, Quận Thủ Đức → Thu Duc */
const THU_DUC_ALIASES = new Set([
  "quan 2",
  "quận 2",
  "quan 9",
  "quận 9",
  "quan thu duc",
  "quận thủ đức",
  "thu duc",
  "thủ đức",
  "tp thu duc",
  "tp thủ đức",
  "thanh pho thu duc",
  "thành phố thủ đức",
]);

/**
 * Normalize a Vietnamese district name to a consistent English form.
 *
 * Handles numbered districts, 2021 Thu Duc merger, named districts
 * for HCMC / Hanoi / Da Nang, and diacritics stripping.
 *
 * @example normalizeDistrict("Quận 1")       // "District 1"
 * @example normalizeDistrict("Quận 2")       // "Thu Duc"
 * @example normalizeDistrict("Bình Thạnh")   // "Binh Thanh"
 * @example normalizeDistrict("Ba Đình")      // "Ba Dinh"
 */
export function normalizeDistrict(raw: string): string {
  const s = raw.trim();
  if (!s) return s;

  const lower = s.toLowerCase();

  if (THU_DUC_ALIASES.has(lower)) {
    return "Thu Duc";
  }

  const numMatch = lower.match(/^qu[aậ]n\s*(\d+)$/);
  if (numMatch) {
    return `District ${numMatch[1]}`;
  }

  const huyenMatch = s.match(/^Huyện\s+(.+)$/i);
  if (huyenMatch) {
    return stripDiacritics(huyenMatch[1]).trim();
  }

  const quanNameMatch = s.match(/^Qu[aậ]n\s+(.+)$/i);
  if (quanNameMatch) {
    const name = quanNameMatch[1].trim();
    return stripDiacritics(name);
  }

  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s)) {
    return stripDiacritics(s);
  }

  return s;
}

const BROKER_KEYWORDS = [
  "bđs",
  "bất động sản",
  "bat dong san",
  "nhà đất",
  "nha dat",
  "land",
  "agency",
  "môi giới",
  "moi gioi",
  "sàn",
  "san giao dich",
  "công ty",
  "cong ty",
];

const OWNER_KEYWORDS = [
  "chính chủ",
  "chinh chu",
  "chủ nhà",
  "chu nha",
];

/**
 * Detect whether a listing poster is an owner, broker, or unknown.
 *
 * Uses keyword matching against the poster name (case-insensitive).
 *
 * @example detectPosterType("Công ty BĐS Hoàng Gia")  // "broker"
 * @example detectPosterType("Nguyễn Văn A - chính chủ") // "owner"
 * @example detectPosterType("Trần Thị B")               // "unknown"
 */
export function detectPosterType(
  name: string
): "owner" | "broker" | "unknown" {
  if (!name) return "unknown";

  const lower = name.toLowerCase();
  const lowerNoDiacritics = stripDiacritics(lower);

  for (const kw of OWNER_KEYWORDS) {
    if (lower.includes(kw) || lowerNoDiacritics.includes(kw)) {
      return "owner";
    }
  }

  for (const kw of BROKER_KEYWORDS) {
    if (lower.includes(kw) || lowerNoDiacritics.includes(kw)) {
      return "broker";
    }
  }

  return "unknown";
}

/**
 * Compute boolean trust signals for a listing by comparing it against
 * other listings in the same batch.
 *
 * @example
 * computeTrustSignals(
 *   { price_vnd: 3000000, area_m2: 25, poster_type: "broker", thumbnail_url: "https://...", post_date: "2025-12-20" },
 *   [{ price_vnd: 8000000, area_m2: 25, district: "District 1" }]
 * )
 * // { is_likely_broker: true, price_suspicious: true, has_photos: true, is_fresh: true }
 *
 * @example
 * computeTrustSignals(
 *   { price_vnd: null, area_m2: null, poster_type: "unknown" },
 *   []
 * )
 * // { is_likely_broker: false, price_suspicious: false, has_photos: false, is_fresh: false }
 */
export function computeTrustSignals(
  listing: {
    price_vnd: number | null;
    area_m2: number | null;
    poster_type: string;
    thumbnail_url?: string | null;
    post_date?: string | null;
  },
  batchListings: Array<{
    price_vnd: number | null;
    area_m2: number | null;
    district?: string;
  }>
): {
  is_likely_broker: boolean;
  price_suspicious: boolean;
  has_photos: boolean;
  is_fresh: boolean;
} {
  const is_likely_broker = listing.poster_type === "broker";

  const has_photos = Boolean(listing.thumbnail_url);

  let is_fresh = false;
  if (listing.post_date) {
    const postDate = new Date(listing.post_date);
    if (!isNaN(postDate.getTime())) {
      const now = new Date();
      const diffMs = now.getTime() - postDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      is_fresh = diffDays >= 0 && diffDays <= 7;
    }
  }

  let price_suspicious = false;
  if (listing.price_vnd !== null && listing.area_m2 !== null) {
    const areaLow = listing.area_m2 * 0.7;
    const areaHigh = listing.area_m2 * 1.3;

    const comparable = batchListings.filter(
      (l) =>
        l.price_vnd !== null &&
        l.area_m2 !== null &&
        l.area_m2 >= areaLow &&
        l.area_m2 <= areaHigh
    );

    if (comparable.length >= 2) {
      const avgPrice =
        comparable.reduce((sum, l) => sum + (l.price_vnd as number), 0) /
        comparable.length;
      price_suspicious = listing.price_vnd < avgPrice * 0.7;
    }
  }

  return { is_likely_broker, price_suspicious, has_photos, is_fresh };
}

/**
 * Parse a Vietnamese date string into ISO date format (YYYY-MM-DD).
 *
 * Handles DD/MM/YYYY, relative dates ("Hôm nay", "Hôm qua"),
 * and "X ngày/tuần trước" patterns.
 *
 * @example parseVietnameseDate("23/12/2025")     // "2025-12-23"
 * @example parseVietnameseDate("Hôm nay")        // today's ISO date
 * @example parseVietnameseDate("3 ngày trước")   // 3 days ago ISO date
 * @example parseVietnameseDate("1 tuần trước")   // 7 days ago ISO date
 */
export function parseVietnameseDate(
  raw: string | null | undefined
): string | null {
  if (raw === null || raw === undefined || raw === "") return null;

  const s = raw.trim();
  const lower = s.toLowerCase();

  if (/^h[oô]m\s*nay$/i.test(lower) || stripDiacritics(lower) === "hom nay") {
    return toISODate(new Date());
  }

  if (/^h[oô]m\s*qua$/i.test(lower) || stripDiacritics(lower) === "hom qua") {
    return toISODate(daysAgo(1));
  }

  const daysMatch = lower.match(/(\d+)\s*ngày\s*trước/i) ||
    stripDiacritics(lower).match(/(\d+)\s*ngay\s*truoc/i);
  if (daysMatch) {
    return toISODate(daysAgo(Number(daysMatch[1])));
  }

  const weeksMatch = lower.match(/(\d+)\s*tuần\s*trước/i) ||
    stripDiacritics(lower).match(/(\d+)\s*tuan\s*truoc/i);
  if (weeksMatch) {
    return toISODate(daysAgo(Number(weeksMatch[1]) * 7));
  }

  const monthsMatch = lower.match(/(\d+)\s*tháng\s*trước/i) ||
    stripDiacritics(lower).match(/(\d+)\s*thang\s*truoc/i);
  if (monthsMatch) {
    return toISODate(daysAgo(Number(monthsMatch[1]) * 30));
  }

  // DD/MM/YYYY (Vietnamese uses day-first, not month-first)
  const ddmmyyyy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
      const d = new Date(year, month - 1, day);
      if (
        d.getFullYear() === year &&
        d.getMonth() === month - 1 &&
        d.getDate() === day
      ) {
        return toISODate(d);
      }
    }
  }

  return null;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
