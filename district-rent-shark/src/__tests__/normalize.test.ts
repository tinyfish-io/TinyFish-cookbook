import { describe, it, expect } from "vitest";
import {
  parseVietnamesePrice,
  parseArea,
  normalizeDistrict,
  detectPosterType,
  parseVietnameseDate,
  stripDiacritics,
} from "@/lib/normalize";

describe("parseVietnamesePrice", () => {
  it("parses dot-separated thousands (5.500.000 đ/tháng)", () => {
    expect(parseVietnamesePrice("5.500.000 đ/tháng")).toEqual({
      vnd: 5500000,
      negotiable: false,
    });
  });

  it('parses "triệu" shorthand with comma decimal (5,5 triệu)', () => {
    expect(parseVietnamesePrice("5,5 triệu")).toEqual({
      vnd: 5500000,
      negotiable: false,
    });
  });

  it('parses "triệu/tháng" shorthand (8,5 triệu/tháng)', () => {
    expect(parseVietnamesePrice("8,5 triệu/tháng")).toEqual({
      vnd: 8500000,
      negotiable: false,
    });
  });

  it('recognizes "Thỏa thuận" as negotiable', () => {
    expect(parseVietnamesePrice("Thỏa thuận")).toEqual({
      vnd: null,
      negotiable: true,
    });
  });

  it('recognizes "Liên hệ" as negotiable', () => {
    expect(parseVietnamesePrice("Liên hệ")).toEqual({
      vnd: null,
      negotiable: true,
    });
  });

  it("converts USD to VND at 25,000 rate", () => {
    expect(parseVietnamesePrice("500 USD/tháng")).toEqual({
      vnd: 12500000,
      negotiable: false,
    });
  });

  it("returns null vnd for empty string", () => {
    expect(parseVietnamesePrice("")).toEqual({
      vnd: null,
      negotiable: false,
    });
  });

  it("returns null vnd for null input", () => {
    expect(parseVietnamesePrice(null)).toEqual({
      vnd: null,
      negotiable: false,
    });
  });

  it("returns null vnd for undefined input", () => {
    expect(parseVietnamesePrice(undefined)).toEqual({
      vnd: null,
      negotiable: false,
    });
  });

  it('parses "tỷ" shorthand (1,2 tỷ)', () => {
    expect(parseVietnamesePrice("1,2 tỷ")).toEqual({
      vnd: 1200000000,
      negotiable: false,
    });
  });
});

describe("parseArea", () => {
  it('parses "25 m²"', () => {
    expect(parseArea("25 m²")).toBe(25);
  });

  it('parses "25m2" (no space, ascii m2)', () => {
    expect(parseArea("25m2")).toBe(25);
  });

  it('parses "25.5m²" (dot decimal)', () => {
    expect(parseArea("25.5m²")).toBe(25.5);
  });

  it("returns null for null input", () => {
    expect(parseArea(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseArea("")).toBeNull();
  });

  it('parses "25,5 m2" (comma decimal)', () => {
    expect(parseArea("25,5 m2")).toBe(25.5);
  });
});

describe("normalizeDistrict", () => {
  it('normalizes "Quận 1" to "District 1"', () => {
    expect(normalizeDistrict("Quận 1")).toBe("District 1");
  });

  it('normalizes "Quận 2" to "Thu Duc" (2021 merger)', () => {
    expect(normalizeDistrict("Quận 2")).toBe("Thu Duc");
  });

  it('normalizes "Quận 9" to "Thu Duc" (2021 merger)', () => {
    expect(normalizeDistrict("Quận 9")).toBe("Thu Duc");
  });

  it('normalizes "Bình Thạnh" to "Binh Thanh"', () => {
    expect(normalizeDistrict("Bình Thạnh")).toBe("Binh Thanh");
  });

  it('normalizes "Ba Đình" to "Ba Dinh"', () => {
    expect(normalizeDistrict("Ba Đình")).toBe("Ba Dinh");
  });

  it('normalizes "Quận Thủ Đức" to "Thu Duc"', () => {
    expect(normalizeDistrict("Quận Thủ Đức")).toBe("Thu Duc");
  });

  it('normalizes "Huyện Bình Chánh" by stripping prefix + diacritics', () => {
    expect(normalizeDistrict("Huyện Bình Chánh")).toBe("Binh Chanh");
  });
});

describe("detectPosterType", () => {
  it('detects "BĐS Hoàng Gia" as broker', () => {
    expect(detectPosterType("BĐS Hoàng Gia")).toBe("broker");
  });

  it('detects "bất động sản ABC" as broker', () => {
    expect(detectPosterType("bất động sản ABC")).toBe("broker");
  });

  it('returns "unknown" for ordinary name "Nguyễn Văn A"', () => {
    expect(detectPosterType("Nguyễn Văn A")).toBe("unknown");
  });

  it('detects "chính chủ" keyword as owner', () => {
    expect(detectPosterType("Nguyễn Văn A - chính chủ")).toBe("owner");
  });

  it('returns "unknown" for empty string', () => {
    expect(detectPosterType("")).toBe("unknown");
  });
});

describe("parseVietnameseDate", () => {
  it("parses DD/MM/YYYY format", () => {
    expect(parseVietnameseDate("23/12/2025")).toBe("2025-12-23");
  });

  it("returns null for null input", () => {
    expect(parseVietnameseDate(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseVietnameseDate("")).toBeNull();
  });

  it('parses "Hôm nay" as today', () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(parseVietnameseDate("Hôm nay")).toBe(expected);
  });
});

describe("stripDiacritics", () => {
  it('strips diacritics from "Bình Thạnh"', () => {
    expect(stripDiacritics("Bình Thạnh")).toBe("Binh Thanh");
  });

  it("handles đ → d conversion", () => {
    expect(stripDiacritics("Đà Nẵng")).toBe("Da Nang");
  });

  it("leaves ASCII strings unchanged", () => {
    expect(stripDiacritics("District 1")).toBe("District 1");
  });
});
