/**
 * GET /api/health
 * Layer 2 (Orchestration): Health check and circuit breaker metrics
 */

import { NextResponse } from 'next/server';
import { tinyfishCircuitBreaker } from '@/lib/circuitBreaker';
import { getRedisClient } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const circuitBreakerMetrics = tinyfishCircuitBreaker.getMetrics();

  // Check Redis connection
  let redisHealthy = false;
  let redisError = null;
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      redisHealthy = true;
    }
  } catch (error) {
    redisError = error instanceof Error ? error.message : 'Unknown error';
  }

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Hardware Sentry API',
    version: '0.1.0',
    checks: {
      tinyfish: {
        configured: !!process.env.TINYFISH_API_KEY,
        status:
          circuitBreakerMetrics.state === 'CLOSED'
            ? 'healthy'
            : circuitBreakerMetrics.state === 'HALF_OPEN'
              ? 'recovering'
              : 'unavailable',
        circuitBreaker: circuitBreakerMetrics,
      },
      redis: {
        configured:
          !!process.env.UPSTASH_REDIS_REST_URL &&
          !!process.env.UPSTASH_REDIS_REST_TOKEN,
        status: redisHealthy ? 'healthy' : 'degraded',
        error: redisError,
      },
    },
  };

  // Overall health status
  const isHealthy =
    health.checks.tinyfish.configured &&
    redisHealthy &&
    circuitBreakerMetrics.state !== 'OPEN';

  if (!isHealthy) {
    health.status = 'degraded';
  }

  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
