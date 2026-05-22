import type { OperationContext } from '../../core/operations.ts';
import { resetExpired, type ResetExpiredCircuitResult } from '../sources/circuit-breaker.ts';

export const CIRCUIT_BREAKER_RESET_JOB = 'ebrain-circuit-breaker-reset';

export interface CircuitBreakerResetResult extends ResetExpiredCircuitResult {
  jobName: typeof CIRCUIT_BREAKER_RESET_JOB;
}

export async function runCircuitBreakerReset(ctx: OperationContext): Promise<CircuitBreakerResetResult> {
  const result = await resetExpired(ctx);
  ctx.logger.info(`[circuit-breaker-reset] reset expired circuits=${result.resetCount}`);
  return {
    jobName: CIRCUIT_BREAKER_RESET_JOB,
    ...result,
  };
}
