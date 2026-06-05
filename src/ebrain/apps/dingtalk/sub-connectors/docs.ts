import type {
  IngestionEvent,
  IngestionSourceContext,
} from '../../../../core/ingestion/types.ts';
import { BaseEnterpriseIngestionSource } from '../../base/index.ts';
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
  ): Promise<{ events: IngestionEvent[]; cursorState: Record<string, unknown> }> {
    const docs = await this.loadDocs(cursorState);
    return {
      events: docs.map((doc) => this.docToEvent(doc)),
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

  private docToEvent(doc: DingtalkDocItem): IngestionEvent {
    const docId = requireDingtalkString(doc.docId, 'docId');
    const title = requireDingtalkString(doc.title, 'title');
    requireDingtalkString(doc.modifiedTime, 'modifiedTime');

    return this.makeEvent({
      source_uri: `dingtalk://docs/${docId}`,
      content_type: 'text/markdown',
      content: doc.markdown ?? `# ${title}\n\nDingTalk document content was not returned by the list API.`,
      trusted: false,
    });
  }
}
