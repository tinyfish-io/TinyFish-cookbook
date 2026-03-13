/**
 * API Middleware Utilities
 * Layer 3 (Execution): Rate limiting, compression, monitoring
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter
 * In production, use Redis-based rate limiting for distributed systems
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 5) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed
   * @param identifier IP address or user ID
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let requests = this.requests.get(identifier) || [];

    // Filter out requests outside the current window
    requests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if under limit
    if (requests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    requests.push(now);
    this.requests.set(identifier, requests);

    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter((timestamp) => timestamp > windowStart);

    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const entries = Array.from(this.requests.entries());
    for (const [identifier, requests] of entries) {
      const recentRequests = requests.filter(
        (timestamp: number) => timestamp > windowStart
      );

      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

// Global rate limiter instance (5 requests per minute)
const scanRateLimiter = new RateLimiter(60000, 5);

/**
 * Apply rate limiting to a request
 * @param request Next.js request object
 * @returns NextResponse with 429 if rate limited, null if allowed
 */
export function applyRateLimit(request: NextRequest): NextResponse | null {
  // Get client IP (fallback to 'unknown' for development)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (!scanRateLimiter.isAllowed(ip)) {
    const remaining = scanRateLimiter.getRemaining(ip);

    console.log(`[RateLimit] Blocked request from ${ip} (0 requests remaining)`);

    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please wait before making another request.',
        retryAfter: 60,
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
        },
      }
    );
  }

  return null; // Request allowed
}

/**
 * Add compression headers to response
 * Note: Vercel automatically compresses responses, but we add hints
 */
export function addCompressionHints(response: NextResponse): NextResponse {
  response.headers.set('Vary', 'Accept-Encoding');
  response.headers.set('Content-Type', 'application/json; charset=utf-8');

  return response;
}

/**
 * Performance monitoring wrapper
 */
export class PerformanceMonitor {
  private startTime: number;
  private readonly operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
  }

  /**
   * Log performance metrics
   */
  end(success: boolean = true, metadata?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime;

    console.log(
      `[Performance] ${this.operation} ${success ? 'SUCCESS' : 'FAILED'} in ${duration}ms`,
      metadata ? JSON.stringify(metadata) : ''
    );
  }
}

/**
 * Create a monitored API response
 */
export function createMonitoredResponse(
  monitor: PerformanceMonitor,
  data: unknown,
  options?: { status?: number; cached?: boolean }
): NextResponse {
  const response = NextResponse.json(data, { status: options?.status });

  // Add performance headers
  response.headers.set('X-Response-Time', `${Date.now() - monitor['startTime']}ms`);

  if (options?.cached) {
    response.headers.set('X-Cache', 'HIT');
  } else {
    response.headers.set('X-Cache', 'MISS');
  }

  // Add compression hints
  return addCompressionHints(response);
}
