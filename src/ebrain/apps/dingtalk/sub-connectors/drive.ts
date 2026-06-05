import type { IngestionSourceContext } from '../../../../core/ingestion/types.ts';
import { BaseEnterpriseIngestionSource, type EnterpriseIngestObject } from '../../base/index.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkDriveFile } from '../types.ts';
import {
  cursorSince,
  cursorStateFor,
  extractArray,
  fetchDingtalkRecords,
  requireDingtalkString,
  sourceFetchMode,
  type DingtalkSourceOptions,
} from './common.ts';

const ENDPOINT = '/v1.0/drive/files';
const SOURCE_KIND = 'dingtalk-drive';

export interface DingtalkDriveSourceOptions extends DingtalkSourceOptions {
  fixtureFiles?: DingtalkDriveFile[];
}

export class DingtalkDriveSource extends BaseEnterpriseIngestionSource {
  private readonly dingtalkApp: DingtalkEnterpriseApp;
  private readonly fixtureFiles?: DingtalkDriveFile[];
  private readonly initialSince?: string;

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkDriveSourceOptions = {}) {
    super({
      id: `${SOURCE_KIND}:${app.appId}`,
      kind: SOURCE_KIND,
      app,
      pollIntervalMs: opts.pollIntervalMs,
      mode: opts.mode,
    });
    this.dingtalkApp = app;
    this.fixtureFiles = opts.fixtureFiles;
    this.initialSince = opts.since;
  }

  protected async pollOnce(
    _ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ objects: EnterpriseIngestObject[]; cursorState: Record<string, unknown> }> {
    const files = await this.loadFiles(cursorState);
    return {
      objects: files.map((file) => this.fileToObject(file)),
      cursorState: cursorStateFor(files),
    };
  }

  private async loadFiles(cursorState: Record<string, unknown>): Promise<DingtalkDriveFile[]> {
    if (this.fixtureFiles) return this.fixtureFiles;
    return fetchDingtalkRecords<DingtalkDriveFile>(
      this.dingtalkApp,
      ENDPOINT,
      {
        mode: sourceFetchMode(this.mode),
        since: cursorSince(cursorState, this.initialSince),
      },
      (payload) => extractArray<DingtalkDriveFile>(payload, ['files', 'items']),
    );
  }

  private fileToObject(file: DingtalkDriveFile): EnterpriseIngestObject {
    const fileId = requireDingtalkString(file.fileId, 'fileId');
    const name = requireDingtalkString(file.name, 'name');
    const modifiedTime = requireDingtalkString(file.modifiedTime, 'modifiedTime');

    return this.makeEnterpriseObject({
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
      rawRef: file.rawRef ?? `dingtalk://drive/${fileId}`,
      metadata: {
        dingtalk_object: 'drive-file',
        owner_user_id: file.ownerUserId ?? null,
        mime_type: file.mimeType ?? null,
        size_bytes: file.size ?? null,
      },
    });
  }
}
