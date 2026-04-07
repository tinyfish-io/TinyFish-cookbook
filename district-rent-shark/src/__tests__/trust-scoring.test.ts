import { describe, it, expect } from "vitest";
import { computeTrustSignals } from "@/lib/normalize";

describe("computeTrustSignals", () => {
  it("flags price as suspicious when < 70% of batch average (same area range)", () => {
    const result = computeTrustSignals(
      {
        price_vnd: 3_000_000,
        area_m2: 25,
        poster_type: "unknown",
        post_date: new Date().toISOString().slice(0, 10),
      },
      [
        { price_vnd: 10_000_000, area_m2: 25 },
        { price_vnd: 10_000_000, area_m2: 25 },
        { price_vnd: 10_000_000, area_m2: 25 },
      ],
    );
    expect(result.price_suspicious).toBe(true);
  });

  it("does NOT flag price when within normal range", () => {
    const result = computeTrustSignals(
      {
        price_vnd: 9_000_000,
        area_m2: 25,
        poster_type: "unknown",
      },
      [
        { price_vnd: 10_000_000, area_m2: 25 },
        { price_vnd: 10_000_000, area_m2: 25 },
        { price_vnd: 10_000_000, area_m2: 25 },
      ],
    );
    expect(result.price_suspicious).toBe(false);
  });

  it("does NOT flag price when price_vnd is null", () => {
    const result = computeTrustSignals(
      {
        price_vnd: null,
        area_m2: 25,
        poster_type: "unknown",
      },
      [
        { price_vnd: 10_000_000, area_m2: 25 },
        { price_vnd: 10_000_000, area_m2: 25 },
      ],
    );
    expect(result.price_suspicious).toBe(false);
  });

  it("identifies broker poster type", () => {
    const result = computeTrustSignals(
      {
        price_vnd: 8_000_000,
        area_m2: 30,
        poster_type: "broker",
      },
      [],
    );
    expect(result.is_likely_broker).toBe(true);
  });

  it("marks listing as fresh when post_date is today", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = computeTrustSignals(
      {
        price_vnd: 8_000_000,
        area_m2: 30,
        poster_type: "unknown",
        post_date: today,
      },
      [],
    );
    expect(result.is_fresh).toBe(true);
  });

  it("marks listing as NOT fresh when post_date is 30 days ago", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);
    const result = computeTrustSignals(
      {
        price_vnd: 8_000_000,
        area_m2: 30,
        poster_type: "unknown",
        post_date: oldDate.toISOString().slice(0, 10),
      },
      [],
    );
    expect(result.is_fresh).toBe(false);
  });

  it("detects has_photos from thumbnail_url", () => {
    const result = computeTrustSignals(
      {
        price_vnd: 8_000_000,
        area_m2: 30,
        poster_type: "unknown",
        thumbnail_url: "https://example.com/photo.jpg",
      },
      [],
    );
    expect(result.has_photos).toBe(true);
  });

  it("reports no photos when thumbnail_url is null", () => {
    const result = computeTrustSignals(
      {
        price_vnd: 8_000_000,
        area_m2: 30,
        poster_type: "unknown",
        thumbnail_url: null,
      },
      [],
    );
    expect(result.has_photos).toBe(false);
  });
});
