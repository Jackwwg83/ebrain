import React, { useState } from 'react';
import { exportClientConfig } from '../../api';

type ExportFormat = 'claude-desktop' | 'cursor' | 'json';

export function ClientConfigExportModal({
  clientId,
  onClose,
  t,
}: {
  clientId: string;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (next: ExportFormat) => {
    setFormat(next);
    setLoading(true);
    setError('');
    try {
      const payload = await exportClientConfig(clientId, next);
      setText(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
    } catch (err) {
      setText('');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (text) await navigator.clipboard.writeText(text);
  };

  const download = () => {
    if (!text) return;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${clientId}-${format}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={event => event.stopPropagation()} style={{ maxWidth: 760, width: 760 }}>
        <div className="modal-title">{t('agents.exportTitle')}</div>
        <div className="mono" style={{ color: 'var(--accent)', marginBottom: 14 }}>{clientId}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button className={format === 'claude-desktop' ? 'btn btn-primary' : 'btn btn-secondary'} type="button" onClick={() => load('claude-desktop')}>Claude Desktop</button>
          <button className={format === 'cursor' ? 'btn btn-primary' : 'btn btn-secondary'} type="button" onClick={() => load('cursor')}>Cursor</button>
          <button className={format === 'json' ? 'btn btn-primary' : 'btn btn-secondary'} type="button" onClick={() => load('json')}>{t('agents.genericJson')}</button>
        </div>
        {!text && !loading && !error && <div className="feed-empty">{t('agents.exportPrompt')}</div>}
        {loading && <div className="feed-empty">{t('common.loading')}</div>}
        {error && <div style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</div>}
        {text && <pre className="code-block" style={{ whiteSpace: 'pre-wrap', maxHeight: 420, overflow: 'auto' }}>{text}</pre>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>{t('common.close')}</button>
          <button className="btn btn-secondary" type="button" onClick={copy} disabled={!text}>{t('common.copy')}</button>
          <button className="btn btn-primary" type="button" onClick={download} disabled={!text}>{t('common.download')}</button>
        </div>
      </div>
    </div>
  );
}
