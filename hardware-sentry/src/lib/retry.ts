/**
 * Retry utility with exponential backoff
 * Layer 3 (Execution): Deterministic retry logic
 */

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'AbortError'],
};

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result of successful function call
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable =
        error instanceof Error &&
        config.retryableErrors.some(
          (errType) =>
            error.name === errType || error.message.includes(errType)
        );

      // Don't retry on last attempt or non-retryable errors
      if (attempt === config.maxAttempts || !isRetryable) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      console.log(
        `[Retry] Attempt ${attempt}/${config.maxAttempts} failed. Retrying in ${delay}ms...`
      );

      // Wait before next attempt
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable based on status code
 */
export function isRetryableHttpError(statusCode: number): boolean {
  // Retry on server errors (500-599) and rate limits (429)
  return (statusCode >= 500 && statusCode < 600) || statusCode === 429;
}
