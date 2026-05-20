export type RateLimitTier = 'app' | 'tenant' | 'user';

export interface RateLimitKey {
  tier: RateLimitTier;
  key: string;
  limit: number;
}

export interface TieredRateLimiter {
  /**
   * Acquire every tier before issuing vendor calls.
   *
   * Implementations must store each key internally as `${tier}:${key}` so
   * app, tenant, and user scopes can never collide on the same raw key.
   */
  acquire(keys: RateLimitKey[]): Promise<void>;

  /**
   * Release previously acquired tier keys. Implementations must apply the
   * same `${tier}:${key}` internal storage rule used by `acquire`.
   */
  release(keys: Array<Omit<RateLimitKey, 'limit'>>): void;
}
