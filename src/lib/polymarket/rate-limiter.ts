import { RATE_LIMIT } from '@/lib/utils/constants';

class RateLimiter {
  private callTimestamps: number[] = [];

  private pruneExpired(): void {
    const cutoff = Date.now() - RATE_LIMIT.windowMs;
    this.callTimestamps = this.callTimestamps.filter((ts) => ts > cutoff);
  }

  canMakeCall(): boolean {
    this.pruneExpired();
    return this.callTimestamps.length < RATE_LIMIT.maxCalls;
  }

  recordCall(): void {
    this.callTimestamps.push(Date.now());
  }

  async waitForSlot(): Promise<void> {
    while (!this.canMakeCall()) {
      const oldest = this.callTimestamps[0];
      if (oldest === undefined) break;
      const waitMs = oldest + RATE_LIMIT.windowMs - Date.now() + 50;
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      this.pruneExpired();
    }
  }

  getUsage(): { used: number; remaining: number; windowResetAt: number } {
    this.pruneExpired();
    const used = this.callTimestamps.length;
    const oldest = this.callTimestamps[0];
    const windowResetAt = oldest !== undefined ? oldest + RATE_LIMIT.windowMs : Date.now();
    return {
      used,
      remaining: RATE_LIMIT.maxCalls - used,
      windowResetAt,
    };
  }
}

export const rateLimiter = new RateLimiter();
