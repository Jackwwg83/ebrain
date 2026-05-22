import React, { useEffect, useMemo, useState } from 'react';
import { getIngestionSources, triggerSync, type EbrainIngestionSource } from '../../api';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge, toneFromState } from '../components/StatusBadge';
import { useEbrainI18n } from '../hooks/useEbrainI18n';

function formatDate(value: string | null, fallback: string): string {
  return value ? new Date(value).toLocaleString() : fallback;
}

export function EbrainIngestionPage() {
  const { locale, setLocale, t } = useEbrainI18n();
  const [sources, setSources] = useState<EbrainIngestionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<EbrainIngestionSource | null>(null);

  const load = () => {
    setLoading(true);
    getIngestionSources({ limit: 500 })
      .then(data => { setSources(data); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return sources;
    return sources.filter(source =>
      source.source_id.toLowerCase().includes(term) || source.source_type.toLowerCase().includes(term),
    );
  }, [filter, sources]);

  return (
    <AppLayout
      title={t('ingestion.title')}
      eyebrow={t('ingestion.eyebrow')}
      locale={locale}
      setLocale={setLocale}
      t={t}
      actions={(
        <>
          <input
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder={t('ingestion.filterPlaceholder')}
            style={{ width: 180 }}
          />
          <button className="btn btn-secondary" onClick={load}>{t('common.refresh')}</button>
        </>
      )}
    >
      {error && <div style={{ color: 'var(--error)', marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div className="feed-empty">{t('common.loading')}</div>
      ) : visible.length === 0 ? (
        <div className="feed-empty">{t('ingestion.noRows')}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('ingestion.sourceType')}</th>
              <th>{t('ingestion.sourceId')}</th>
              <th>{t('ingestion.lastSync')}</th>
              <th>{t('ingestion.circuit')}</th>
              <th>{t('ingestion.pageCount')}</th>
              <th>{t('ingestion.lastError')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(source => (
              <tr key={source.source_id} onClick={() => setSelected(source)} style={{ cursor: 'pointer' }}>
                <td className="mono">{source.source_type}</td>
                <td className="mono">{source.source_id}</td>
                <td>{formatDate(source.last_sync_at, t('common.never'))}</td>
                <td><StatusBadge tone={toneFromState(source.circuit_state)}>{source.circuit_state}</StatusBadge></td>
                <td className="mono">{source.page_count}</td>
                <td style={{ color: source.last_error ? 'var(--error)' : 'var(--text-muted)' }}>{source.last_error ?? '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && <SourceDrawer source={selected} onClose={() => setSelected(null)} onRetried={load} t={t} />}
    </AppLayout>
  );
}

function SourceDrawer({ source, onClose, onRetried, t }: {
  source: EbrainIngestionSource;
  onClose: () => void;
  onRetried: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    setError('');
    try {
      await triggerSync(source.source_id);
      setMessage(t('ingestion.retryStarted'));
      onRetried();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={event => event.stopPropagation()} style={{ width: 520 }}>
        <button className="drawer-close" onClick={onClose}>x</button>
        <h2 style={{ marginBottom: 8 }}>{t('ingestion.details')}</h2>
        <div className="mono" style={{ color: 'var(--accent)', marginBottom: 18 }}>{source.source_id}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 12px', marginBottom: 18 }}>
          <span style={{ color: 'var(--text-muted)' }}>{t('ingestion.sourceType')}</span><span className="mono">{source.source_type}</span>
          <span style={{ color: 'var(--text-muted)' }}>{t('ingestion.lastSync')}</span><span>{formatDate(source.last_sync_at, t('common.never'))}</span>
          <span style={{ color: 'var(--text-muted)' }}>{t('ingestion.circuit')}</span><StatusBadge tone={toneFromState(source.circuit_state)}>{source.circuit_state}</StatusBadge>
          <span style={{ color: 'var(--text-muted)' }}>{t('ingestion.pageCount')}</span><span className="mono">{source.page_count}</span>
          <span style={{ color: 'var(--text-muted)' }}>{t('ingestion.lastError')}</span><span style={{ color: source.last_error ? 'var(--error)' : 'var(--text-muted)' }}>{source.last_error ?? '--'}</span>
        </div>
        <button className="btn btn-primary" onClick={retry} disabled={busy}>{busy ? t('common.loading') : t('ingestion.manualRetry')}</button>
        {message && <div style={{ color: 'var(--success)', marginTop: 12 }}>{message}</div>}
        {error && <div style={{ color: 'var(--error)', marginTop: 12 }}>{error}</div>}
        <h3 className="section-title">{t('ingestion.payload')}</h3>
        <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(source, null, 2)}</pre>
      </aside>
    </div>
  );
}
