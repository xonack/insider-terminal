import { rateLimiter } from './rate-limiter';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

export class PolymarketApiError extends Error {
  constructor(
    public status: number,
    public url: string,
    message: string,
  ) {
    super(message);
    this.name = 'PolymarketApiError';
  }
}

export async function polyFetch<T>(url: string, options?: RequestInit): Promise<T> {
  await rateLimiter.waitForSlot();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    rateLimiter.recordCall();

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      lastError = new PolymarketApiError(429, url, 'Rate limited');
      continue;
    }

    if (response.status === 404) {
      return null as T;
    }

    if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      lastError = new PolymarketApiError(
        response.status,
        url,
        `Server error: ${response.statusText}`,
      );
      continue;
    }

    throw new PolymarketApiError(
      response.status,
      url,
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  throw lastError ?? new Error(`Failed after ${MAX_RETRIES} retries`);
}
