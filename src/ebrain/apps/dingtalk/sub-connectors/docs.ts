import type { OperationContext } from '../../../../core/operations.ts';
import type { EnterpriseConnector, EnterpriseIngestObject, EnterpriseIngestResult } from '../../base/index.ts';
import { upsertEnterpriseObject } from '../../../sources/ingest-common.ts';
import { markIngestError, checkCircuit, resetCircuit } from '../../../sources/circuit-breaker.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkDocItem } from '../types.ts';
import { fetchDingtalkRecords, isoCursor, requireDingtalkString, runDingtalkConnectorLoad } from './common.ts';

const ENDPOINT = '/v1.0/document/docs';
const SOURCE_ID = 'dingtalk-docs';

export interface DingtalkDocsConnectorOptions {
  fixtureDocs?: DingtalkDocItem[];
}

export class DingtalkDocsConnector implements EnterpriseConnector {
  readonly name = SOURCE_ID;
  readonly app: DingtalkEnterpriseApp;
  private readonly fixtureDocs?: DingtalkDocItem[];

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkDocsConnectorOptions = {}) {
    this.app = app;
    this.fixtureDocs = opts.fixtureDocs;
  }

  async runIncremental(ctx: OperationContext): Promise<EnterpriseIngestResult> {
    return this.ingestDocs(ctx, () => this.loadDocs({ mode: 'incremental' }));
  }

  async runBackfill(ctx: OperationContext, opts: { since?: string }): Promise<EnterpriseIngestResult> {
    return this.ingestDocs(ctx, () => this.loadDocs({ mode: 'backfill', since: opts.since }));
  }

  async handleWebhookEvent(): Promise<EnterpriseIngestResult> {
    return { objectsIngested: 0, objectsSkipped: 1, errors: 0 };
  }

  async transform(raw: unknown): Promise<EnterpriseIngestObject> {
    const doc = raw as DingtalkDocItem;
    const docId = requireDingtalkString(doc.docId, 'docId');
    const title = requireDingtalkString(doc.title, 'title');
    const modifiedTime = requireDingtalkString(doc.modifiedTime, 'modifiedTime');
    return {
      sourceId: SOURCE_ID,
      sourceType: 'dingtalk',
      externalId: docId,
      objectType: 'doc',
      title,
      bodyMarkdown: doc.markdown ?? `# ${title}\n\nDingTalk document content was not returned by the list API.`,
      modifiedAt: modifiedTime,
      url: doc.url,
      participants: doc.ownerUserId ? [doc.ownerUserId] : [],
      classification: 'L1',
      raw: doc.raw ?? doc,
      metadata: { vendor: 'dingtalk', space_id: doc.spaceId ?? null },
    };
  }

  private async ingestDocs(ctx: OperationContext, load: () => Promise<DingtalkDocItem[]>): Promise<EnterpriseIngestResult> {
    return runDingtalkConnectorLoad({
      ctx,
      app: this.app,
      sourceId: SOURCE_ID,
      displayName: 'DingTalk Docs',
      load,
      transform: (raw) => this.transform(raw),
      cursorForRecords: isoCursor,
      upsertEnterpriseObject,
      markIngestError,
      checkCircuit,
      resetCircuit,
    });
  }

  private async loadDocs(args: { mode: 'incremental' | 'backfill'; since?: string }): Promise<DingtalkDocItem[]> {
    if (this.fixtureDocs) return this.fixtureDocs;
    return fetchDingtalkRecords<DingtalkDocItem>(
      this.app,
      ENDPOINT,
      { mode: args.mode, since: args.since },
      (payload) => extractArray<DingtalkDocItem>(payload, ['docs', 'items']),
    );
  }
}

function extractArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') {
    throw new Error(`DingTalk payload must be an object or array with one of: ${keys.join(', ')}`);
  }
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
    const result = record.result;
    if (result && typeof result === 'object' && Array.isArray((result as Record<string, unknown>)[key])) {
      return (result as Record<string, unknown>)[key] as T[];
    }
  }
  throw new Error(`DingTalk payload missing expected array field: ${keys.join(', ')}`);
}
