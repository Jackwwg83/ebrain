import type { OperationContext } from '../../../../core/operations.ts';
import type { EnterpriseConnector, EnterpriseIngestObject, EnterpriseIngestResult } from '../../base/index.ts';
import { upsertEnterpriseObject } from '../../../sources/ingest-common.ts';
import { markIngestError, checkCircuit, resetCircuit } from '../../../sources/circuit-breaker.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkDriveFile } from '../types.ts';
import { fetchDingtalkRecords, isoCursor, requireDingtalkString, runDingtalkConnectorLoad } from './common.ts';

const ENDPOINT = '/v1.0/drive/files';
const SOURCE_ID = 'dingtalk-drive';

export interface DingtalkDriveConnectorOptions {
  fixtureFiles?: DingtalkDriveFile[];
}

export class DingtalkDriveConnector implements EnterpriseConnector {
  readonly name = SOURCE_ID;
  readonly app: DingtalkEnterpriseApp;
  private readonly fixtureFiles?: DingtalkDriveFile[];

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkDriveConnectorOptions = {}) {
    this.app = app;
    this.fixtureFiles = opts.fixtureFiles;
  }

  async runIncremental(ctx: OperationContext): Promise<EnterpriseIngestResult> {
    return this.ingestFiles(ctx, () => this.loadFiles({ mode: 'incremental' }));
  }

  async runBackfill(ctx: OperationContext, opts: { since?: string }): Promise<EnterpriseIngestResult> {
    return this.ingestFiles(ctx, () => this.loadFiles({ mode: 'backfill', since: opts.since }));
  }

  async handleWebhookEvent(): Promise<EnterpriseIngestResult> {
    return { objectsIngested: 0, objectsSkipped: 1, errors: 0 };
  }

  async transform(raw: unknown): Promise<EnterpriseIngestObject> {
    const file = raw as DingtalkDriveFile;
    const fileId = requireDingtalkString(file.fileId, 'fileId');
    const name = requireDingtalkString(file.name, 'name');
    const modifiedTime = requireDingtalkString(file.modifiedTime, 'modifiedTime');
    return {
      sourceId: SOURCE_ID,
      sourceType: 'dingtalk',
      externalId: fileId,
      objectType: 'drive-file',
      title: name,
      bodyMarkdown: [
        `# ${name}`,
        '',
        `- file_id: ${fileId}`,
        `- mime_type: ${file.mimeType ?? 'unknown'}`,
        `- size_bytes: ${file.size ?? 'unknown'}`,
        `- raw_ref: ${file.rawRef ?? 'not_downloaded'}`,
      ].join('\n'),
      modifiedAt: modifiedTime,
      url: file.url,
      participants: file.ownerUserId ? [file.ownerUserId] : [],
      classification: 'L1',
      raw: file.raw ?? file,
      metadata: {
        vendor: 'dingtalk',
        mime_type: file.mimeType ?? null,
        size: file.size ?? null,
        raw_ref: file.rawRef ?? null,
        downloaded: false,
      },
    };
  }

  private async ingestFiles(ctx: OperationContext, load: () => Promise<DingtalkDriveFile[]>): Promise<EnterpriseIngestResult> {
    return runDingtalkConnectorLoad({
      ctx,
      app: this.app,
      sourceId: SOURCE_ID,
      displayName: 'DingTalk Drive',
      load,
      transform: (raw) => this.transform(raw),
      cursorForRecords: isoCursor,
      upsertEnterpriseObject,
      markIngestError,
      checkCircuit,
      resetCircuit,
    });
  }

  private async loadFiles(args: { mode: 'incremental' | 'backfill'; since?: string }): Promise<DingtalkDriveFile[]> {
    if (this.fixtureFiles) return this.fixtureFiles;
    return fetchDingtalkRecords<DingtalkDriveFile>(
      this.app,
      ENDPOINT,
      { mode: args.mode, since: args.since },
      (payload) => extractArray<DingtalkDriveFile>(payload, ['files', 'items']),
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
