import type { BrainEngine } from '../../../core/engine.ts';
import type { RateLimitKey, TieredRateLimiter } from '../base/index.ts';

export interface DingtalkEndpointLimit {
  limit: number;
  windowMs: number;
}

export interface DingtalkRateLimiterConfig {
  engine?: BrainEngine;
  ownerJobId?: number;
  now?: () => Date;
}


function hashRateKey(key: string): bigint {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < key.length; i++) {
    h ^= BigInt(key.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h & 0x7fffffffffffffffn;
}

interface MemoryLease {
  key: string;
  expiresAt: number;
}

export class DingtalkRateLimiter implements TieredRateLimiter {
  private readonly engine?: BrainEngine;
  private ownerJobId?: number;
  private readonly now: () => Date;
  private readonly memoryLeases: MemoryLease[] = [];
  private readonly dbLeaseIdsByKey = new Map<string, number[]>();

  constructor(config: DingtalkRateLimiterConfig = {}) {
    this.engine = config.engine;
    this.ownerJobId = config.ownerJobId;
    this.now = config.now ?? (() => new Date());
  }

  async acquire(keys: RateLimitKey[]): Promise<void> {
    for (const key of keys) {
      const internalKey = this.internalKey(key);
      const limit = limitForRateKey(key).limit;
      const windowMs = limitForRateKey(key).windowMs;
      if (this.engine) {
        await this.acquireDbLease(internalKey, limit, windowMs);
      } else {
        this.acquireMemoryLease(internalKey, limit, windowMs);
      }
    }
  }

  release(keys: Array<Omit<RateLimitKey, 'limit'>>): void {
    if (!this.engine) {
      for (const key of keys) {
        const internalKey = `${key.tier}:${key.key}`;
        for (let i = this.memoryLeases.length - 1; i >= 0; i--) {
          if (this.memoryLeases[i].key === internalKey) this.memoryLeases.splice(i, 1);
        }
      }
      return;
    }

    for (const key of keys) {
      const internalKey = `${key.tier}:${key.key}`;
      const leaseIds = this.dbLeaseIdsByKey.get(internalKey) ?? [];
      this.dbLeaseIdsByKey.delete(internalKey);
      for (const leaseId of leaseIds) {
        void this.engine.executeRaw(`DELETE FROM subagent_rate_leases WHERE id = $1`, [leaseId]);
      }
    }
  }

  private async acquireDbLease(internalKey: string, limit: number, windowMs: number): Promise<void> {
    const engine = this.engine!;
    const ownerJobId = await this.ensureOwnerJobId(engine);
    const expiresAt = new Date(this.now().getTime() + windowMs).toISOString();
    const leaseId = await engine.transaction(async (tx) => {
      await tx.executeRaw(`SELECT pg_advisory_xact_lock($1::bigint)`, [hashRateKey(internalKey).toString()]);
      await tx.executeRaw(`DELETE FROM subagent_rate_leases WHERE key = $1 AND expires_at <= now()`, [internalKey]);
      const rows = await tx.executeRaw<{ count: string | number }>(
        `SELECT count(*)::text AS count FROM subagent_rate_leases WHERE key = $1`,
        [internalKey],
      );
      const activeCount = Number(rows[0]?.count ?? 0);
      if (activeCount >= limit) {
        throw new Error(`DingTalk rate limit exceeded for ${internalKey}: ${activeCount}/${limit}`);
      }
      const inserted = await tx.executeRaw<{ id: number }>(
        `INSERT INTO subagent_rate_leases (key, owner_job_id, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [internalKey, ownerJobId, expiresAt],
      );
      return inserted[0]!.id;
    });
    const current = this.dbLeaseIdsByKey.get(internalKey) ?? [];
    current.push(leaseId);
    this.dbLeaseIdsByKey.set(internalKey, current);
  }

  private acquireMemoryLease(internalKey: string, limit: number, windowMs: number): void {
    const nowMs = this.now().getTime();
    for (let i = this.memoryLeases.length - 1; i >= 0; i--) {
      if (this.memoryLeases[i].expiresAt <= nowMs) this.memoryLeases.splice(i, 1);
    }
    const activeCount = this.memoryLeases.filter((lease) => lease.key === internalKey).length;
    if (activeCount >= limit) {
      throw new Error(`DingTalk rate limit exceeded for ${internalKey}: ${activeCount}/${limit}`);
    }
    this.memoryLeases.push({ key: internalKey, expiresAt: nowMs + windowMs });
  }

  private internalKey(key: RateLimitKey): string {
    return `${key.tier}:${key.key}`;
  }

  private async ensureOwnerJobId(engine: BrainEngine): Promise<number> {
    if (this.ownerJobId !== undefined) return this.ownerJobId;
    const rows = await engine.executeRaw<{ id: number }>(
      `INSERT INTO minion_jobs (name, queue, status, data)
       VALUES ('dingtalk-rate-limit', 'ebrain-enterprise', 'active', '{}'::jsonb)
       RETURNING id`,
    );
    this.ownerJobId = rows[0]!.id;
    return this.ownerJobId;
  }
}

export function dingtalkEndpointLimit(endpoint: string): DingtalkEndpointLimit {
  if (endpoint === '/v1.0/oauth2/accessToken') return { limit: 100, windowMs: 60_000 };
  if (endpoint === '/v1.0/im/groups/messages') return { limit: 20, windowMs: 1000 };
  if (endpoint.startsWith('/v1.0/document/')) return { limit: 50, windowMs: 1000 };
  if (endpoint.startsWith('/v1.0/drive/')) return { limit: 50, windowMs: 1000 };
  if (endpoint.startsWith('/v1.0/calendar/')) return { limit: 20, windowMs: 1000 };
  if (endpoint.startsWith('/v1.0/meeting/')) return { limit: 20, windowMs: 1000 };
  if (endpoint === '/v1.0/robot/groupMessages/send') return { limit: 20, windowMs: 1000 };
  if (endpoint === '/v1.0/notification/asyncSendV2') return { limit: 20, windowMs: 1000 };
  return { limit: 20, windowMs: 1000 };
}

export function dingtalkRateKey(tier: RateLimitKey['tier'], scope: string, endpoint: string): RateLimitKey {
  return { tier, key: `dingtalk:${scope}:${endpoint}`, limit: dingtalkEndpointLimit(endpoint).limit };
}

function limitForRateKey(key: RateLimitKey): DingtalkEndpointLimit {
  const endpoint = key.key.slice(key.key.lastIndexOf(':') + 1);
  const defaults = dingtalkEndpointLimit(endpoint);
  return { ...defaults, limit: key.limit || defaults.limit };
}
