const APEX_API_URL = 'https://api.apexagents.ai/twitter/tweet';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface ApexTweetResponse {
  id: string;
  text: string;
}

export async function postTweet(text: string): Promise<ApexTweetResponse> {
  const token = process.env.APEX_API_TOKEN;
  if (!token) {
    throw new Error('APEX_API_TOKEN environment variable is not set');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(APEX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        return (await response.json()) as ApexTweetResponse;
      }

      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const body = await response.text().catch(() => '');
        throw new Error(`Apex API ${response.status}: ${body}`);
      }

      lastError = new Error(`Apex API ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
  }

  throw lastError ?? new Error('Apex API: unknown failure');
}
