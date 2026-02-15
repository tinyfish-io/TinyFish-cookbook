/**
 * Circuit Breaker Pattern
 * Layer 3 (Execution): Prevents cascading failures in distributed systems
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  successThreshold?: number;
}

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  state: CircuitState;
  lastFailure: number | null;
  totalCalls: number;
  totalFailures: number;
}

/**
 * Circuit Breaker implementation
 * Prevents repeated calls to failing services
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private totalCalls: number = 0;
  private totalFailures: number = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.successThreshold = options.successThreshold || 2;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      const now = Date.now();
      const timeSinceLastFailure = this.lastFailureTime
        ? now - this.lastFailureTime
        : Infinity;

      // Try to transition to HALF_OPEN after timeout
      if (timeSinceLastFailure > this.resetTimeout) {
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN (testing recovery)');
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        const error = new Error('Circuit breaker is OPEN - service temporarily unavailable');
        error.name = 'CircuitBreakerError';
        throw error;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        console.log('[CircuitBreaker] Service recovered - transitioning to CLOSED');
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      console.log(
        `[CircuitBreaker] Failure threshold reached (${this.failureCount}/${this.failureThreshold}) - opening circuit`
      );
      this.state = 'OPEN';
    }
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      failures: this.failureCount,
      successes: this.successCount,
      state: this.state,
      lastFailure: this.lastFailureTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    console.log('[CircuitBreaker] Manual reset triggered');
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

// Global circuit breaker for TinyFish API
export const tinyfishCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3, // Open after 3 consecutive failures
  resetTimeout: 30000, // Try recovery after 30 seconds
  successThreshold: 2, // Close after 2 consecutive successes
});
