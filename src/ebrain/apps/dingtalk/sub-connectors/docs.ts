import type { IngestionSourceContext } from '../../../../core/ingestion/types.ts';
import { BaseEnterpriseIngestionSource, type EnterpriseIngestObject } from '../../base/index.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkDocItem } from '../types.ts';
import {
  cursorSince,
  cursorStateFor,
  extractArray,
  fetchDingtalkRecords,
  requireDingtalkString,
  sourceFetchMode,
  type DingtalkSourceOptions,
} from './common.ts';

const ENDPOINT = '/v1.0/document/docs';
const SOURCE_KIND = 'dingtalk-docs';

export interface DingtalkDocsSourceOptions extends DingtalkSourceOptions {
  fixtureDocs?: DingtalkDocItem[];
}

export class DingtalkDocsSource extends BaseEnterpriseIngestionSource {
  private readonly dingtalkApp: DingtalkEnterpriseApp;
  private readonly fixtureDocs?: DingtalkDocItem[];
  private readonly initialSince?: string;

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkDocsSourceOptions = {}) {
    super({
      id: `${SOURCE_KIND}:${app.appId}`,
      kind: SOURCE_KIND,
      app,
      pollIntervalMs: opts.pollIntervalMs,
      mode: opts.mode,
    });
    this.dingtalkApp = app;
    this.fixtureDocs = opts.fixtureDocs;
    this.initialSince = opts.since;
  }

  protected async pollOnce(
    _ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ objects: EnterpriseIngestObject[]; cursorState: Record<string, unknown> }> {
    const docs = await this.loadDocs(cursorState);
    return {
      objects: docs.map((doc) => this.docToObject(doc)),
      cursorState: cursorStateFor(docs),
    };
  }

  private async loadDocs(cursorState: Record<string, unknown>): Promise<DingtalkDocItem[]> {
    if (this.fixtureDocs) return this.fixtureDocs;
    return fetchDingtalkRecords<DingtalkDocItem>(
      this.dingtalkApp,
      ENDPOINT,
      {
        mode: sourceFetchMode(this.mode),
        since: cursorSince(cursorState, this.initialSince),
      },
      (payload) => extractArray<DingtalkDocItem>(payload, ['docs', 'items']),
    );
  }

  private docToObject(doc: DingtalkDocItem): EnterpriseIngestObject {
    const docId = requireDingtalkString(doc.docId, 'docId');
    const title = requireDingtalkString(doc.title, 'title');
    const modifiedTime = requireDingtalkString(doc.modifiedTime, 'modifiedTime');

    return this.makeEnterpriseObject({
      externalId: docId,
      objectType: 'doc',
      title,
      bodyMarkdown: doc.markdown ?? `# ${title}\n\nDingTalk document content was not returned by the list API.`,
      modifiedAt: modifiedTime,
      url: doc.url,
      participants: doc.ownerUserId ? [doc.ownerUserId] : [],
      ownerOrgUnit: doc.spaceId,
      classification: 'L1',
      raw: doc.raw ?? doc,
      rawRef: `dingtalk://docs/${docId}`,
      metadata: {
        dingtalk_object: 'doc',
        owner_user_id: doc.ownerUserId ?? null,
        space_id: doc.spaceId ?? null,
      },
    });
  }
}
