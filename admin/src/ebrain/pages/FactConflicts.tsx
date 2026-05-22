import React, { useEffect, useMemo, useState } from 'react';
import {
  detectFactConflicts,
  getFactConflicts,
  resolveFactConflict,
  type EbrainFactConflict,
  type EbrainFactConflictValue,
} from '../../api';
import { AppLayout } from '../components/AppLayout';
import { StatusBadge, toneFromState } from '../components/StatusBadge';
import { useEbrainI18n } from '../hooks/useEbrainI18n';

function valueKey(value: unknown): string {
  return JSON.stringify(value);
}

function valueText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function normalizeValues(conflict: EbrainFactConflict): EbrainFactConflictValue[] {
  const seen = new Set<string>();
  const values: EbrainFactConflictValue[] = [];
  for (const item of conflict.competing_values ?? []) {
    const key = valueKey(item.value);
    if (!seen.has(key)) {
      seen.add(key);
      values.push(item);
    }
  }
  return values;
}

function conflictStatusLabel(status: string, t: (key: string) => string): string {
  const key = `FactConflicts.status.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function EbrainFactConflictsPage() {
  const { locale, setLocale, t } = useEbrainI18n();
  const [rows, setRows] = useState<EbrainFactConflict[]>([]);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<EbrainFactConflict | null>(null);
  const [detecting, setDetecting] = useState(false);

  const load = () => {
    setLoading(true);
    getFactConflicts({ status, limit: 200 })
      .then(data => { setRows(data); setError(''); })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (b.status === 'open' && a.status !== 'open') return 1;
    return b.severity - a.severity || String(b.detected_at).localeCompare(String(a.detected_at));
  }), [rows]);

  const runDetect = async () => {
    setDetecting(true);
    setError('');
    try {
      await detectFactConflicts();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(false);
    }
  };

  return (
    <AppLayout
      title={t('conflicts.title')}
      eyebrow={t('conflicts.eyebrow')}
      locale={locale}
      setLocale={setLocale}
      t={t}
      actions={(
        <>
          <select value={status} onChange={event => setStatus(event.target.value)} style={{ width: 130 }}>
            <option value="open">{t('FactConflicts.status.open')}</option>
            <option value="resolved">{t('FactConflicts.status.resolved')}</option>
            <option value="ignored">{t('FactConflicts.status.ignored')}</option>
            <option value="deferred">{t('FactConflicts.status.deferred')}</option>
            <option value="all">{t('FactConflicts.status.all')}</option>
          </select>
          <button className="btn btn-secondary" onClick={load}>{t('common.refresh')}</button>
          <button className="btn btn-primary" onClick={runDetect} disabled={detecting}>{detecting ? t('common.loading') : t('conflicts.detect')}</button>
        </>
      )}
    >
      {error && <div style={{ color: 'var(--error)', marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div className="feed-empty">{t('common.loading')}</div>
      ) : sorted.length === 0 ? (
        <div className="feed-empty">{t('conflicts.noRows')}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('conflicts.entity')}</th>
              <th>{t('conflicts.factKey')}</th>
              <th>{t('conflicts.values')}</th>
              <th>{t('conflicts.severity')}</th>
              <th>{t('conflicts.status')}</th>
              <th>{t('conflicts.detectedAt')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.id} onClick={() => setSelected(row)} style={{ cursor: 'pointer' }}>
                <td className="mono">{row.entity_slug}</td>
                <td className="mono">{row.fact_key}</td>
                <td>{normalizeValues(row).map(v => valueText(v.value)).join(' / ')}</td>
                <td className="mono">{row.severity}</td>
                <td><StatusBadge tone={toneFromState(row.status)}>{conflictStatusLabel(row.status, t)}</StatusBadge></td>
                <td>{new Date(row.detected_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && <ResolveDrawer conflict={selected} onClose={() => setSelected(null)} onDone={load} t={t} />}
    </AppLayout>
  );
}

function ResolveDrawer({ conflict, onClose, onDone, t }: {
  conflict: EbrainFactConflict;
  onClose: () => void;
  onDone: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const values = normalizeValues(conflict);
  const [winning, setWinning] = useState(valueKey(values[0]?.value ?? ''));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (action: 'resolve' | 'skip' | 'defer') => {
    setBusy(true);
    setError('');
    try {
      const selected = values.find(value => valueKey(value.value) === winning);
      await resolveFactConflict(conflict.id, {
        action,
        winning_value: selected?.value,
        note,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={event => event.stopPropagation()} style={{ width: 620 }}>
        <button className="drawer-close" onClick={onClose}>x</button>
        <h2 style={{ marginBottom: 8 }}>{t('conflicts.resolveTitle')}</h2>
        <div className="mono" style={{ color: 'var(--accent)', marginBottom: 18 }}>{conflict.entity_slug} / {conflict.fact_key}</div>
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {values.map((item, index) => (
            <label key={`${valueKey(item.value)}-${index}`} style={{ border: '1px solid #333', borderRadius: 8, padding: 12, margin: 0 }}>
              <input
                type="radio"
                checked={winning === valueKey(item.value)}
                onChange={() => setWinning(valueKey(item.value))}
                style={{ width: 'auto', marginRight: 8 }}
              />
              <strong>{index === 0 ? t('conflicts.winningCandidate') : t('conflicts.losingCandidate')}</strong>
              <pre className="code-block" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{valueText(item.value)}</pre>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {t('FactConflicts.sourceType')}: {item.source_type ?? item.sourceType ?? t('common.unknown')} / {t('FactConflicts.pageSlug')}: {item.page_slug ?? item.pageSlug ?? '--'} / {t('FactConflicts.confidence')}: {item.confidence ?? '--'}
              </div>
            </label>
          ))}
        </div>
        <label>{t('conflicts.note')}<textarea value={note} onChange={event => setNote(event.target.value)} rows={4} /></label>
        {error && <div style={{ color: 'var(--error)', marginTop: 10 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => submit('defer')}>{t('conflicts.defer')}</button>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => submit('skip')}>{t('conflicts.skip')}</button>
          <button className="btn btn-primary" type="button" disabled={busy || values.length === 0} onClick={() => submit('resolve')}>{busy ? t('common.loading') : t('conflicts.resolve')}</button>
        </div>
      </aside>
    </div>
  );
}
