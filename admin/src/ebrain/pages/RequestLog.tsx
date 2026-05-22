import React, { useEffect, useState } from 'react';
import { getRequestLog, type EbrainRequestLogResponse } from '../../api';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge, toneFromState } from '../components/StatusBadge';
import { useEbrainI18n } from '../hooks/useEbrainI18n';

export function EbrainRequestLogPage() {
  const { locale, setLocale, t } = useEbrainI18n();
  const [data, setData] = useState<EbrainRequestLogResponse>({ rows: [], total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ executive_id: '', op_name: '', status: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (page = data.page || 1) => {
    setLoading(true);
    getRequestLog({ page, ...filters })
      .then(result => { setData(result); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  return (
    <AppLayout
      title={t('requestLog.title')}
      eyebrow={t('requestLog.eyebrow')}
      locale={locale}
      setLocale={setLocale}
      t={t}
      actions={<button className="btn btn-secondary" onClick={() => load(1)}>{t('common.refresh')}</button>}
    >
      <div className="health-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
        <input placeholder="executive_id" value={filters.executive_id} onChange={event => setFilters(prev => ({ ...prev, executive_id: event.target.value }))} />
        <input placeholder="op_name" value={filters.op_name} onChange={event => setFilters(prev => ({ ...prev, op_name: event.target.value }))} />
        <select value={filters.status} onChange={event => setFilters(prev => ({ ...prev, status: event.target.value }))}>
          <option value="">{t('requestLog.anyStatus')}</option>
          <option value="success">success</option>
          <option value="error">error</option>
        </select>
        <input type="datetime-local" value={filters.from} onChange={event => setFilters(prev => ({ ...prev, from: event.target.value }))} />
        <input type="datetime-local" value={filters.to} onChange={event => setFilters(prev => ({ ...prev, to: event.target.value }))} />
        <button className="btn btn-primary" onClick={() => load(1)}>{t('requestLog.apply')}</button>
      </div>

      {error && <div style={{ color: 'var(--error)', marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div className="feed-empty">{t('common.loading')}</div>
      ) : data.rows.length === 0 ? (
        <div className="feed-empty">{t('requestLog.noRows')}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('requestLog.ts')}</th>
              <th>executive_id</th>
              <th>client_id</th>
              <th>{t('requestLog.op')}</th>
              <th>{t('requestLog.scope')}</th>
              <th>{t('requestLog.params')}</th>
              <th>{t('requestLog.latency')}</th>
              <th>{t('requestLog.status')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map(row => (
              <tr key={row.id}>
                <td>{new Date(row.ts).toLocaleString()}</td>
                <td className="mono">{row.executive_id ?? '--'}</td>
                <td className="mono">{row.client_id ?? '--'}</td>
                <td className="mono">{row.op_name}</td>
                <td className="mono">{row.scope ?? '--'}</td>
                <td><pre className="code-block" style={{ whiteSpace: 'pre-wrap', maxWidth: 260 }}>{JSON.stringify(row.params, null, 2)}</pre></td>
                <td className="mono">{row.latency_ms ?? '--'} ms</td>
                <td><StatusBadge tone={toneFromState(row.status)}>{row.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, color: 'var(--text-secondary)' }}>
        <span>{t('requestLog.total', { total: data.total })}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>{t('common.back')}</button>
          <span className="mono" style={{ alignSelf: 'center' }}>{data.page} / {data.pages}</span>
          <button className="btn btn-secondary" disabled={data.page >= data.pages} onClick={() => load(data.page + 1)}>{t('common.next')}</button>
        </div>
      </div>
    </AppLayout>
  );
}
