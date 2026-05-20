import type { OperationContext } from '../../../core/operations.ts';
import type { EnterpriseApp } from './enterprise-app.ts';
import type { EnterpriseIngestObject } from './types.ts';
import type { Event } from './webhook-handler.ts';

export type EnterpriseIngestResult = {
  objectsIngested: number;
  objectsSkipped: number;
  errors: number;
  cursorAdvanced?: string;
};

export interface EnterpriseConnector {
  name: string;
  app: EnterpriseApp;
  runIncremental(ctx: OperationContext): Promise<EnterpriseIngestResult>;
  runBackfill(ctx: OperationContext, opts: { since?: string }): Promise<EnterpriseIngestResult>;
  handleWebhookEvent?(event: Event): Promise<EnterpriseIngestResult>;
  transform(raw: unknown): Promise<EnterpriseIngestObject>;
}
