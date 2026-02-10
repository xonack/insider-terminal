import crypto from 'crypto';
import { KALSHI_API_BASE } from '@/lib/utils/constants';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

export class KalshiApiError extends Error {
  constructor(
    public status: number,
    public url: string,
    message: string,
  ) {
    super(message);
    this.name = 'KalshiApiError';
  }
}

/**
 * Generate Kalshi API authentication headers using RSA-PSS + SHA-256.
 * Requires KALSHI_API_KEY_ID and KALSHI_API_PRIVATE_KEY env vars.
 */
function getAuthHeaders(method: string, path: string): Record<string, string> {
  const keyId = process.env.KALSHI_API_KEY_ID;
  const privateKeyPem = process.env.KALSHI_API_PRIVATE_KEY;

  if (!keyId || !privateKeyPem) {
    throw new Error('KALSHI_API_KEY_ID and KALSHI_API_PRIVATE_KEY are required for authenticated Kalshi requests');
  }

  const timestampMs = Date.now().toString();
  // Sign: timestamp + method + path (no query params)
  const pathWithoutQuery = path.split('?')[0];
  const message = timestampMs + method.toUpperCase() + pathWithoutQuery;

  const signature = crypto.sign(
    'sha256',
    Buffer.from(message),
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    },
  );

  return {
    'KALSHI-ACCESS-KEY': keyId,
    'KALSHI-ACCESS-TIMESTAMP': timestampMs,
    'KALSHI-ACCESS-SIGNATURE': signature.toString('base64'),
  };
}

/** Fetch from Kalshi API (public endpoints, no auth). */
export async function kalshiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
      lastError = new KalshiApiError(429, url, 'Rate limited');
      continue;
    }

    if (response.status === 404) {
      return null as T;
    }

    if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      lastError = new KalshiApiError(
        response.status,
        url,
        `Server error: ${response.statusText}`,
      );
      continue;
    }

    throw new KalshiApiError(
      response.status,
      url,
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  throw lastError ?? new Error(`Failed after ${MAX_RETRIES} retries`);
}

/** Fetch from Kalshi API with authentication (portfolio endpoints). */
export async function kalshiAuthFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
  const fullUrl = `${KALSHI_API_BASE}${path}`;
  const authHeaders = getAuthHeaders(method, `/trade-api/v2${path}`);

  return kalshiFetch<T>(fullUrl, {
    ...options,
    headers: {
      ...authHeaders,
      ...options?.headers,
    },
  });
}
